import asyncio
import io
import json
import logging
import typing
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError

from .base import StorageProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class GoogleDriveStorageProvider(StorageProvider):
    def __init__(self):
        self.root_folder_id = settings.GOOGLE_DRIVE_ROOT_FOLDER_ID
        self.service = self._get_service()

    def _get_service(self):
        if not settings.GOOGLE_SERVICE_ACCOUNT_JSON:
            return None
        try:
            creds_info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
            creds = service_account.Credentials.from_service_account_info(
                creds_info, scopes=["https://www.googleapis.com/auth/drive"]
            )
            return build("drive", "v3", credentials=creds, cache_discovery=False)
        except Exception as e:
            logger.error(f"Failed to initialize Google Drive service: {e}")
            return None

    def _ensure_configured(self):
        if not self.service or not self.root_folder_id:
            raise RuntimeError("Google Drive is not properly configured.")

    async def _run_async(self, func, *args, **kwargs):
        return await asyncio.to_thread(func, *args, **kwargs)

    def _find_folder_by_name(self, name: str, parent_id: str) -> typing.Optional[str]:
        query = f"name='{name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        try:
            results = self.service.files().list(
                q=query, spaces='drive', fields='files(id, name)'
            ).execute()
            items = results.get('files', [])
            if not items:
                return None
            return items[0]['id']
        except HttpError as e:
            raise self._map_http_error(e)

    def _create_folder(self, name: str, parent_id: str) -> str:
        file_metadata = {
            'name': name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        try:
            file = self.service.files().create(
                body=file_metadata, fields='id'
            ).execute()
            return file.get('id')
        except HttpError as e:
            raise self._map_http_error(e)

    def _get_or_create_folder(self, name: str, parent_id: str) -> str:
        # Sanitize folder name
        safe_name = name.replace("'", "").replace('"', "").replace("/", "-").replace("\\", "-")
        folder_id = self._find_folder_by_name(safe_name, parent_id)
        if folder_id:
            return folder_id
        return self._create_folder(safe_name, parent_id)

    def _get_target_folder_id(self, original_filename: str) -> str:
        # We need context like client_code/work_code. Since StorageProvider API takes only
        # file_obj and original_filename, we should ideally pass context. But for Phase 9, 
        # let's assume we can parse or get context.
        # Wait, the prompt says: "Client-only: Clients/{client_code...}, Work-only: Clients/.../{work_code}/"
        # The save_file signature doesn't take client/work. 
        # Let's adjust save_file signature in StorageProvider to accept context.
        pass

    def _map_http_error(self, error: HttpError) -> Exception:
        status_code = error.resp.status
        if status_code in (401, 403):
            return PermissionError("Drive authentication/permission problem")
        elif status_code == 404:
            return FileNotFoundError("Drive file missing")
        elif status_code == 429:
            return ConnectionError("Temporary Google rate limit")
        return Exception(f"Google service error: {status_code}")

    async def save_file(self, file_obj: typing.IO, original_filename: str, context: dict = None) -> str:
        self._ensure_configured()
        
        def _upload():
            # Determine folder path based on context
            ctx = context or {}
            client_name = ctx.get("client_name")
            work_name = ctx.get("work_name")
            
            

            current_parent = self.root_folder_id
            
            if client_name or work_name:
                # Need 'Clients' folder
                current_parent = self._get_or_create_folder("Clients", current_parent)
                
                if client_name:
                    current_parent = self._get_or_create_folder(client_name, current_parent)
                    if work_name:
                        current_parent = self._get_or_create_folder(work_name, current_parent)
                    else:
                        current_parent = self._get_or_create_folder("General", current_parent)
                else:
                    # Work only but no client? Shouldn't happen in our schema, but let's handle
                    current_parent = self._get_or_create_folder(work_name, current_parent)
            else:
                current_parent = self._get_or_create_folder("Unlinked", current_parent)
                import datetime
                now = datetime.datetime.now()
                current_parent = self._get_or_create_folder(str(now.year), current_parent)
                current_parent = self._get_or_create_folder(f"{now.month:02d}", current_parent)

            # Upload file
            import mimetypes
            mime_type, _ = mimetypes.guess_type(original_filename)
            mime_type = mime_type or 'application/octet-stream'

            file_metadata = {
                'name': original_filename,
                'parents': [current_parent]
            }
            media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
            
            try:
                file = self.service.files().create(
                    body=file_metadata, media_body=media, fields='id'
                ).execute()
                return file.get('id')
            except HttpError as e:
                raise self._map_http_error(e)

        return await self._run_async(_upload)

    async def delete_file(self, storage_reference: str) -> bool:
        self._ensure_configured()
        def _delete():
            try:
                self.service.files().delete(fileId=storage_reference).execute()
                return True
            except HttpError as e:
                if e.resp.status == 404:
                    return False
                raise self._map_http_error(e)
        return await self._run_async(_delete)

    async def get_file(self, storage_reference: str) -> typing.Optional[bytes]:
        self._ensure_configured()
        def _get():
            try:
                request = self.service.files().get_media(fileId=storage_reference)
                fh = io.BytesIO()
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while done is False:
                    status, done = downloader.next_chunk()
                return fh.getvalue()
            except HttpError as e:
                if e.resp.status == 404:
                    return None
                raise self._map_http_error(e)
        return await self._run_async(_get)

    async def exists(self, storage_reference: str) -> bool:
        self._ensure_configured()
        def _exists():
            try:
                self.service.files().get(fileId=storage_reference, fields='id').execute()
                return True
            except HttpError as e:
                if e.resp.status == 404:
                    return False
                raise self._map_http_error(e)
        return await self._run_async(_exists)

    def get_file_path(self, storage_reference: str) -> typing.Optional[Path]:
        return None

    async def get_file_stream(self, storage_reference: str) -> typing.AsyncGenerator[bytes, None]:
        self._ensure_configured()
        
        # Download in background to a spooled/temp file to return a generator
        import tempfile
        import os
        fd, temp_path = tempfile.mkstemp()
        
        def _download_to_temp():
            try:
                request = self.service.files().get_media(fileId=storage_reference)
                with os.fdopen(fd, 'wb') as f:
                    downloader = MediaIoBaseDownload(f, request)
                    done = False
                    while done is False:
                        status, done = downloader.next_chunk()
                return True
            except HttpError as e:
                os.close(fd)
                os.remove(temp_path)
                if e.resp.status == 404:
                    raise FileNotFoundError("Drive file missing")
                raise self._map_http_error(e)
                
        await self._run_async(_download_to_temp)
        
        # Now yield from temp file and clean up
        def _stream_and_clean():
            try:
                with open(temp_path, 'rb') as f:
                    while chunk := f.read(1024 * 1024):
                        yield chunk
            finally:
                os.remove(temp_path)
                
        for chunk in _stream_and_clean():
            yield chunk
