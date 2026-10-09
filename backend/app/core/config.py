from typing import List, Optional
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_AUTH_SECRETS = {
    "",
    "secret",
    "changeme",
    "change-this-secret-in-production",
    "your-super-secret-string-here",
}

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: Optional[str] = None
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    STORAGE_PROVIDER: str = "local"
    GOOGLE_DRIVE_ROOT_FOLDER_ID: Optional[str] = None
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None
    AUTH_SECRET: str = Field(default="change-this-secret-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE_SECONDS: int = 300
    REQUEST_ID_HEADER: str = "X-Request-ID"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("APP_ENV")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in {"development", "test", "staging", "production"}:
            raise ValueError("Invalid APP_ENV")
        return value

    @field_validator("STORAGE_PROVIDER")
    @classmethod
    def validate_storage_provider(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in {"local", "google_drive"}:
            raise ValueError("Invalid STORAGE_PROVIDER")
        return value

    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES")
    @classmethod
    def validate_expiry(cls, value: int) -> int:
        if value < 5 or value > 1440:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be 5..1440")
        return value

    @model_validator(mode="after")
    def validate_production(self):
        if self.APP_ENV != "production":
            return self

        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL is required in production")

        if self.AUTH_SECRET in INSECURE_AUTH_SECRETS or len(self.AUTH_SECRET) < 32:
            raise ValueError("AUTH_SECRET must be at least 32 characters")

        if not self.CORS_ORIGINS:
            raise ValueError("CORS_ORIGINS is required")

        for origin in self.CORS_ORIGINS:
            value = origin.lower().strip()
            if value == "*":
                raise ValueError("Wildcard CORS is forbidden")
            if "localhost" in value or "127.0.0.1" in value:
                raise ValueError("Localhost CORS is forbidden in production")

        if self.STORAGE_PROVIDER == "google_drive":
            if not self.GOOGLE_DRIVE_ROOT_FOLDER_ID:
                raise ValueError("GOOGLE_DRIVE_ROOT_FOLDER_ID is required")
            if not self.GOOGLE_SERVICE_ACCOUNT_JSON:
                raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON is required")

        return self

settings = Settings()
