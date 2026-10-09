import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ["DATABASE_URL"] = "sqlite:///test.db"

from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum

# Create a fake user for tests
class FakeUser:
    def __init__(self):
        import uuid
        self.id = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
        self.role = RoleEnum.ADMIN
        self.is_active = True
        self.email = "admin@example.com"
        self.name = "Test Admin"

def override_get_current_user():
    return FakeUser()

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
