import os
import json
import pytest
import asyncio
import tempfile
from unittest.mock import patch, MagicMock

# Needs to be set before importing any app modules that use config
os.environ["STORAGE_PROVIDER"] = "google_drive"
os.environ["GOOGLE_DRIVE_ROOT_FOLDER_ID"] = "root_folder_id"
os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"] = json.dumps({"client_email": "test@test.com", "private_key": "fake_key"})

from app.core.config import settings
from unittest.mock import patch

@pytest.fixture(autouse=True)
def mock_settings():
    with patch("app.services.storage.google_drive.settings") as mock_set:
        mock_set.STORAGE_PROVIDER = "google_drive"
        mock_set.GOOGLE_DRIVE_ROOT_FOLDER_ID = "root_folder_id"
        mock_set.GOOGLE_SERVICE_ACCOUNT_JSON = json.dumps({"client_email": "test@test.com", "private_key": "fake_key"})
        yield mock_set

from app.services.storage import get_storage_provider
from app.services.storage.google_drive import GoogleDriveStorageProvider
from app.services.storage.local import LocalStorageProvider

@pytest.fixture
def mock_drive_service():
    with patch("app.services.storage.google_drive.build") as mock_build:
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        yield mock_service

@pytest.fixture
def mock_credentials():
    with patch("app.services.storage.google_drive.service_account.Credentials.from_service_account_info") as mock_creds:
        yield mock_creds

def test_provider_factory():
    assert isinstance(get_storage_provider("local"), LocalStorageProvider)
    assert isinstance(get_storage_provider("google_drive"), GoogleDriveStorageProvider)

def test_google_drive_configured(mock_drive_service, mock_credentials):
    provider = GoogleDriveStorageProvider()
    assert provider.service is not None
    assert provider.root_folder_id == "root_folder_id"

def test_google_drive_missing_config():
    old_env = settings.GOOGLE_SERVICE_ACCOUNT_JSON
    settings.GOOGLE_SERVICE_ACCOUNT_JSON = None
    provider = GoogleDriveStorageProvider()
    assert provider.service is None
    settings.GOOGLE_SERVICE_ACCOUNT_JSON = old_env

def test_google_drive_exists(mock_drive_service, mock_credentials):
    async def _test():
        provider = GoogleDriveStorageProvider()
        
        # Exists true
        mock_files = mock_drive_service.files.return_value
        mock_get = mock_files.get.return_value
        mock_get.execute.return_value = {"id": "some_id"}
        assert await provider.exists("some_id") is True
        
        # Exists false (simulate 404)
        from googleapiclient.errors import HttpError
        mock_resp = MagicMock()
        mock_resp.status = 404
        mock_get.execute.side_effect = HttpError(resp=mock_resp, content=b"Not found")
        assert await provider.exists("some_id") is False
    asyncio.run(_test())

def test_google_drive_folder_creation(mock_drive_service, mock_credentials):
    async def _test():
        provider = GoogleDriveStorageProvider()
        
        # Find folder returns nothing
        mock_files = mock_drive_service.files.return_value
        mock_list = mock_files.list.return_value
        mock_list.execute.return_value = {"files": []}
        
        # Create folder returns new ID
        mock_create = mock_files.create.return_value
        mock_create.execute.return_value = {"id": "new_folder_id"}
        
        folder_id = provider._get_or_create_folder("TestFolder", "parent_id")
        assert folder_id == "new_folder_id"
        mock_files.create.assert_called_once()
        args, kwargs = mock_files.create.call_args
        assert kwargs['body']['name'] == "TestFolder"
        assert kwargs['body']['parents'] == ["parent_id"]
    asyncio.run(_test())

def test_google_drive_upload_context(mock_drive_service, mock_credentials):
    async def _test():
        provider = GoogleDriveStorageProvider()
        
        # Find folder returns ID to skip creation
        mock_files = mock_drive_service.files.return_value
        mock_list = mock_files.list.return_value
        mock_list.execute.return_value = {"files": [{"id": "existing_folder"}]}
        
        mock_create = mock_files.create.return_value
        mock_create.execute.return_value = {"id": "new_file_id"}
        
        fd, file_path = tempfile.mkstemp()
        with os.fdopen(fd, 'w') as f:
            f.write("hello")
        
        try:
            with open(file_path, "rb") as f:
                file_id = await provider.save_file(f, "test.txt", context={"client_name": "Test Client"})
            assert file_id == "new_file_id"
        finally:
            os.remove(file_path)
    asyncio.run(_test())

def test_google_drive_download_stream(mock_drive_service, mock_credentials):
    async def _test():
        provider = GoogleDriveStorageProvider()
        
        mock_files = mock_drive_service.files.return_value
        
        # We must patch MediaIoBaseDownload to simulate downloading
        with patch("app.services.storage.google_drive.MediaIoBaseDownload") as mock_download_cls:
            mock_download = mock_download_cls.return_value
            # side_effect to write to fd and return (status, True)
            def side_effect(fd, request, **kwargs):
                def write_chunk():
                    fd.write(b"file content")
                    return None, True
                mock_download.next_chunk.side_effect = write_chunk
                return mock_download
                
            mock_download_cls.side_effect = side_effect
            
            generator = provider.get_file_stream("file_id")
            content = b""
            async for chunk in generator:
                content += chunk
                
            assert content == b"file content"
    asyncio.run(_test())
def test_google_drive_no_public_sharing(mock_drive_service, mock_credentials):
    async def _test():
        provider = GoogleDriveStorageProvider()
        mock_files = mock_drive_service.files.return_value
        mock_list = mock_files.list.return_value
        mock_list.execute.return_value = {"files": [{"id": "existing_folder"}]}
        mock_create = mock_files.create.return_value
        mock_create.execute.return_value = {"id": "new_file_id"}
        
        fd, file_path = tempfile.mkstemp()
        with os.fdopen(fd, 'w') as f:
            f.write("hello")
        try:
            with open(file_path, "rb") as f:
                await provider.save_file(f, "test.txt", context={"client_name": "Test Client"})
        finally:
            os.remove(file_path)
            
        mock_permissions = mock_drive_service.permissions.return_value
        mock_permissions.create.assert_not_called()
    asyncio.run(_test())
