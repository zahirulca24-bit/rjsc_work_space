from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db import session as db_session

router = APIRouter()

def database_status() -> str:
    if db_session.engine is None:
        return "not_configured"

    try:
        with db_session.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "unavailable"

@router.get("")
def get_status():
    google_configured = bool(
        settings.GOOGLE_SERVICE_ACCOUNT_JSON
        and settings.GOOGLE_DRIVE_ROOT_FOLDER_ID
    )

    return {
        "status": "ok",
        "environment": settings.APP_ENV,
        "database": database_status(),
        "storage_provider": settings.STORAGE_PROVIDER,
        "google_drive_configured": google_configured,
        "production_checks_enabled": settings.APP_ENV == "production",
    }
