import pytest
from app.db.base import Base
import app.models  # triggers models import
from app.schemas.client import ClientCreate
from app.schemas.work import WorkCreate
from pydantic import ValidationError
from decimal import Decimal
import uuid

def test_tables_exist_in_metadata():
    tables = Base.metadata.tables.keys()
    expected_tables = {
        "clients", "client_name_history", "registered_office_history", "capital_history",
        "directors", "shareholders", "agm_history", "annual_return_history",
        "rjsc_filing_history", "mortgage_charge_history", "compliance_issues",
        "works", "work_rule_snapshots", "work_checklists", "documents",
        "tasks", "work_reviews", "invoices", "transactions", "audit_logs"
    }
    assert expected_tables.issubset(set(tables))

def test_clients_table_uniqueness():
    table = Base.metadata.tables["clients"]
    # Check if client_code is unique
    client_code_col = table.columns["client_code"]
    assert client_code_col.unique

def test_works_government_fee_nullable():
    table = Base.metadata.tables["works"]
    assert table.columns["government_fee"].nullable

def test_annual_return_history_due_date_nullable():
    table = Base.metadata.tables["annual_return_history"]
    assert table.columns["due_date"].nullable

def test_numeric_types_for_money():
    table = Base.metadata.tables["works"]
    col_type = type(table.columns["professional_fee"].type).__name__
    assert col_type == "Numeric"

def test_relationships_and_foreign_keys():
    table = Base.metadata.tables["works"]
    fk = list(table.foreign_keys)[0]
    assert fk.column.table.name == "clients"

def test_jsonb_snapshot_columns():
    table = Base.metadata.tables["work_rule_snapshots"]
    col = table.columns["document_rule_snapshot"]
    # Should use JSONVariant
    assert type(col.type).__name__ == "JSON"

def test_client_create_validation_accepts_valid():
    client = ClientCreate(
        client_code="C001",
        legal_name="Test Company",
        entity_type="PRIVATE_COMPANY"
    )
    assert client.entity_type == "PRIVATE_COMPANY"

def test_client_create_validation_rejects_invalid():
    with pytest.raises(ValidationError):
        ClientCreate(
            client_code="C001",
            legal_name="Test Company",
            entity_type="INVALID_TYPE"
        )

def test_negative_monetary_values_rejected():
    with pytest.raises(ValidationError):
        WorkCreate(
            work_code="W001",
            client_id=uuid.uuid4(),
            service_id="S001",
            entity_type="PRIVATE_COMPANY",
            status="PENDING",
            professional_fee=Decimal('-10.00')
        )

def test_work_create_allows_none_government_fee():
    work = WorkCreate(
        work_code="W001",
        client_id=uuid.uuid4(),
        service_id="S001",
        entity_type="PRIVATE_COMPANY",
        status="PENDING",
        government_fee=None
    )
    assert work.government_fee is None
