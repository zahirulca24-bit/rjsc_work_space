from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.db import session as db_session

router = APIRouter()

@router.get("")
def health_check():
    return {
        "status": "ok",
        "service": "rjsc-backend",
    }

@router.get("/ready")
def readiness_check():
    if db_session.engine is None:
        raise HTTPException(
            status_code=503,
            detail="Database is not configured",
        )

    try:
        with db_session.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database is unavailable",
        )

    return {
        "status": "ready",
        "database": "ok",
    }
