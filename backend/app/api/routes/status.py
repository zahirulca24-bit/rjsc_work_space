from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("")
def get_status():
    return {
        "status": "ok",
        "database": "not_checked",
        "storage_provider": settings.STORAGE_PROVIDER,
        "google_drive_configured": bool(settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GOOGLE_DRIVE_ROOT_FOLDER_ID)
    }
