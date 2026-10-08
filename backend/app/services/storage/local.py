import os
import uuid
import typing
from pathlib import Path
from .base import StorageProvider

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = "storage"):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_safe_path(self, storage_reference: str) -> Path:
        # Prevent path traversal
        path = (self.base_dir / storage_reference).resolve()
        if not str(path).startswith(str(self.base_dir)):
            raise ValueError("Invalid storage reference")
        return path

    async def save_file(self, file_obj: typing.IO, original_filename: str, context: typing.Optional[dict] = None) -> str:
        # Use a random UUID to avoid collisions and path traversal
        extension = Path(original_filename).suffix
        storage_reference = f"{uuid.uuid4()}{extension}"
        path = self._get_safe_path(storage_reference)
        
        with open(path, 'wb') as dest_file:
            # Stream in chunks
            for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
                dest_file.write(chunk)
                
        return storage_reference

    async def delete_file(self, storage_reference: str) -> bool:
        path = self._get_safe_path(storage_reference)
        if path.exists():
            path.unlink()
            return True
        return False

    async def get_file(self, storage_reference: str) -> typing.Optional[bytes]:
        path = self._get_safe_path(storage_reference)
        if path.exists():
            return path.read_bytes()
        return None

    async def exists(self, storage_reference: str) -> bool:
        path = self._get_safe_path(storage_reference)
        return path.exists()

    def get_file_path(self, storage_reference: str) -> typing.Optional[Path]:
        path = self._get_safe_path(storage_reference)
        if path.exists():
            return path
        return None

    async def get_file_stream(self, storage_reference: str) -> typing.AsyncGenerator[bytes, None]:
        path = self._get_safe_path(storage_reference)
        if not path.exists():
            raise FileNotFoundError("File not found")
        
        # Async generator using simple blocking read (good enough for local dev)
        # In a real heavy async env, anyio.Path or aiofiles would be used.
        def _read_in_chunks():
            with open(path, 'rb') as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk
                    
        for chunk in _read_in_chunks():
            yield chunk
