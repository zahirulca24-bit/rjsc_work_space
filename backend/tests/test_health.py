import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Safe missing DB test by ensuring env var is empty
os.environ["DATABASE_URL"] = ""

from app.main import app

client = TestClient(app)

def test_imports_successfully():
    import app.main
    assert app.main.app is not None

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "rjsc-backend"}

def test_status_check():
    response = client.get("/api/status")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "not_checked"}

def test_startup_without_db():
    assert app.title == "RJSC Backend"
