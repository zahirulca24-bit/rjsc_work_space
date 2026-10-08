from fastapi import APIRouter
from app.api.routes import status, health, clients, works

api_router = APIRouter()
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(clients.HISTORY_ROUTER, prefix="/clients", tags=["clients-history"])
api_router.include_router(works.router, prefix="/works", tags=["works"])
