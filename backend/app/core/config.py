from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: Optional[str] = None
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    STORAGE_PROVIDER: str = "local"
    GOOGLE_DRIVE_ROOT_FOLDER_ID: Optional[str] = None
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None
    AUTH_SECRET: str = Field(default="change-this-secret-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

if settings.APP_ENV == "production" and settings.AUTH_SECRET in ["change-this-secret-in-production", "secret", "changeme", "your-super-secret-string-here"]:
    raise ValueError("Insecure AUTH_SECRET in production environment!")
