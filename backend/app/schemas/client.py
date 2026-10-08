from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from app.models.client import EntityType

class ClientBase(BaseModel):
    client_code: Optional[str] = None
    legal_name: str
    entity_type: EntityType
    registration_no: Optional[str] = None
    incorporation_date: Optional[date] = None
    status: str = "ACTIVE"
    former_name: Optional[str] = None
    tin: Optional[str] = None
    bin: Optional[str] = None
    registered_office_text: Optional[str] = None
    contact_person: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    assigned_staff: Optional[str] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientRead(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
