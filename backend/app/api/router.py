from fastapi import APIRouter, Depends
from .deps import get_current_user
from .routes import status, health, clients, works, documents, storage, invoices, transactions, analytics, auth, users, tasks, audit, ai_documents, pilot_feedback, rjsc_snapshots, client_intake, working_papers, forms_lab, submissions, annual_returns, share_transfers, mortgage_charges

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(pilot_feedback.router, prefix="/pilot-feedback", tags=["pilot-feedback"])

# Protected routes
protected = [Depends(get_current_user)]
api_router.include_router(status.router, prefix="/status", tags=["status"], dependencies=protected)
api_router.include_router(clients.router, prefix="/clients", tags=["clients"], dependencies=protected)
api_router.include_router(clients.HISTORY_ROUTER, prefix="/clients", tags=["clients-history"], dependencies=protected)
api_router.include_router(annual_returns.router, dependencies=protected)
api_router.include_router(share_transfers.router, dependencies=protected)
api_router.include_router(mortgage_charges.router, dependencies=protected)
api_router.include_router(works.router, prefix="/works", tags=["works"], dependencies=protected)
api_router.include_router(working_papers.router, prefix="/working-papers", tags=["working-papers"], dependencies=protected)
api_router.include_router(forms_lab.router, dependencies=protected)
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"], dependencies=protected)
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"], dependencies=protected)
api_router.include_router(audit.router, prefix="/audit-logs", tags=["audit"], dependencies=protected)
api_router.include_router(documents.router, prefix="/documents", tags=["documents"], dependencies=protected)
api_router.include_router(ai_documents.router, prefix="/documents", tags=["document-ai"], dependencies=protected)
api_router.include_router(storage.router, prefix="/storage", tags=["storage"], dependencies=protected)
api_router.include_router(rjsc_snapshots.router, prefix="/rjsc-snapshots", tags=["rjsc-snapshots"], dependencies=protected)
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"], dependencies=protected)
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"], dependencies=protected)
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"], dependencies=protected)

api_router.include_router(client_intake.router, prefix="/client-intake", tags=["client-intake"], dependencies=protected)
