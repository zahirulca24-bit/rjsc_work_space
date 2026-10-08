import abc
import typing
from pathlib import Path

class StorageProvider(abc.ABC):
    @abc.abstractmethod
    async def save_file(self, file_obj: typing.IO, original_filename: str, context: typing.Optional[dict] = None) -> str:
        """Saves a file and returns the storage reference."""
        pass

    @abc.abstractmethod
    async def delete_file(self, storage_reference: str) -> bool:
        """Deletes a file given its storage reference."""
        pass

    @abc.abstractmethod
    async def get_file(self, storage_reference: str) -> typing.Optional[bytes]:
        """Returns the file content as bytes (useful for small files or tests)."""
        pass

    @abc.abstractmethod
    async def exists(self, storage_reference: str) -> bool:
        """Returns True if the file exists."""
        pass

    @abc.abstractmethod
    def get_file_path(self, storage_reference: str) -> typing.Optional[Path]:
        """
        Returns the absolute local Path if the provider is local.
        Should return None for remote providers.
        """
        pass

    @abc.abstractmethod
    async def get_file_stream(self, storage_reference: str) -> typing.AsyncGenerator[bytes, None]:
        """
        Returns an async generator yielding chunks of the file.
        Useful for streaming large files securely over FastAPI.
        """
        pass
