from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.api.routes import status, health, clients, works, documents, storage, invoices, transactions, analytics, auth, users, tasks

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Protected routes
protected = [Depends(get_current_user)]
api_router.include_router(status.router, prefix="/status", tags=["status"], dependencies=protected)
api_router.include_router(clients.router, prefix="/clients", tags=["clients"], dependencies=protected)
api_router.include_router(clients.HISTORY_ROUTER, prefix="/clients", tags=["clients-history"], dependencies=protected)
api_router.include_router(works.router, prefix="/works", tags=["works"], dependencies=protected)
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"], dependencies=protected)
api_router.include_router(documents.router, prefix="/documents", tags=["documents"], dependencies=protected)
api_router.include_router(storage.router, prefix="/storage", tags=["storage"], dependencies=protected)
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"], dependencies=protected)
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"], dependencies=protected)
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"], dependencies=protected)
