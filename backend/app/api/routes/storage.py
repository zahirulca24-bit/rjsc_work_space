from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/status")
def storage_status():
    configured = bool(settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GOOGLE_DRIVE_ROOT_FOLDER_ID)
    if settings.STORAGE_PROVIDER == "local":
        return {"provider": "local", "configured": True}
    return {
        "provider": "google_drive",
        "configured": configured,
        "accessible": None
    }
