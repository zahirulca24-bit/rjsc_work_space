from fastapi import APIRouter
from app.api.routes import status, health, clients, works, documents, storage, invoices, transactions, analytics

api_router = APIRouter()
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(clients.HISTORY_ROUTER, prefix="/clients", tags=["clients-history"])
api_router.include_router(works.router, prefix="/works", tags=["works"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
