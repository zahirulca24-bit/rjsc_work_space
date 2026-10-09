from app.db.base import Base
from app.models.client import Client
from app.models.corporate_history import (
    ClientNameHistory, RegisteredOfficeHistory, CapitalHistory, Director,
    Shareholder, AgmHistory, AnnualReturnHistory, RjscFilingHistory,
    MortgageChargeHistory, ComplianceIssue
)
from app.models.work import Work, WorkRuleSnapshot, WorkChecklist
from app.models.document import Document
from app.models.workflow import Task, WorkReview
from app.models.finance import Invoice, Transaction
from app.models.audit import AuditLog
from app.models.user import User, RoleEnum

from app.models.ai import DocumentAIAnalysis
