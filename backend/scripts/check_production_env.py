import sys
from pydantic import ValidationError
from app.core.config import Settings

def main() -> int:
    try:
        settings = Settings(APP_ENV="production")
    except (ValidationError, ValueError) as exc:
        print("PRODUCTION CONFIG: FAILED")
        print(str(exc))
        return 1

    print("PRODUCTION CONFIG: OK")
    print(f"database_configured={bool(settings.DATABASE_URL)}")
    print(f"storage_provider={settings.STORAGE_PROVIDER}")
    print(f"cors_origin_count={len(settings.CORS_ORIGINS)}")
    print(
        "google_drive_configured="
        f"{bool(settings.GOOGLE_DRIVE_ROOT_FOLDER_ID and settings.GOOGLE_SERVICE_ACCOUNT_JSON)}"
    )
    return 0

if __name__ == "__main__":
    sys.exit(main())
