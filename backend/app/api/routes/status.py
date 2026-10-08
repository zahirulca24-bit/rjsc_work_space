from fastapi import APIRouter

router = APIRouter()

@router.get("")
def status_check():
    return {"status": "ok", "database": "not_checked"}
