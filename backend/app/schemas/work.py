from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

class WorkBase(BaseModel):
    work_code: Optional[str] = None
    client_id: UUID
    service_id: str
    entity_type: str
    period_or_year: Optional[str] = None
    assigned_to: Optional[str] = None
    status: str
    professional_fee: Decimal = Decimal('0')
    government_fee: Optional[Decimal] = None
    other_cost: Decimal = Decimal('0')
    total_bill: Optional[Decimal] = None
    due_date: Optional[date] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

class WorkCreate(WorkBase):
    @model_validator(mode='after')
    def check_negative_fees(self):
        if self.professional_fee < 0:
            raise ValueError("Professional fee cannot be negative")
        if self.government_fee is not None and self.government_fee < 0:
            raise ValueError("Government fee cannot be negative")
        if self.other_cost < 0:
            raise ValueError("Other cost cannot be negative")
        return self

class WorkRead(WorkBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
