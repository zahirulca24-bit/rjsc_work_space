from .base import StorageProvider
from .local import LocalStorageProvider
from .google_drive import GoogleDriveStorageProvider
from app.core.config import settings

_providers = {}

def get_storage_provider(provider_name: str) -> StorageProvider:
    if provider_name not in _providers:
        if provider_name == "local":
            _providers[provider_name] = LocalStorageProvider()
        elif provider_name == "google_drive":
            _providers[provider_name] = GoogleDriveStorageProvider()
        else:
            raise ValueError(f"Unknown storage provider: {provider_name}")
    return _providers[provider_name]

# Default provider instance for backwards compatibility where possible,
# though explicitly using get_storage_provider(settings.STORAGE_PROVIDER) is better.
storage = get_storage_provider("local")
