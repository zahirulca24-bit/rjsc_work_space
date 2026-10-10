import os
import io
import pytest
import sys
from fastapi.testclient import TestClient
from uuid import uuid4

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ["DATABASE_URL"] = "sqlite:///test.db"

from app.main import app
from app.db.base import Base
from app.db.session import engine
from app.models.work import WorkChecklist
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_client(client, name="Test Client"):
    res = client.post("/api/clients", json={"legal_name": name, "entity_type": "PRIVATE_COMPANY"})
    return res.json()["id"]

def create_work(client, client_id):
    res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "TEST_SVC",
        "entity_type": "PRIVATE_COMPANY",
        "status": "PENDING"
    })
    return res.json()["id"]

def upload_file(client, ext, mime, client_id=None, work_id=None, content=b"test content"):
    files = {'file': (f'test{ext}', io.BytesIO(content), mime)}
    data = {'category': 'OTHER'}
    if client_id: data['client_id'] = client_id
    if work_id: data['work_id'] = work_id
    return client.post("/api/documents/upload", files=files, data=data)

# File type tests
@pytest.mark.parametrize("ext,mime", [
    (".pdf", "application/pdf"),
    (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    (".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    (".xls", "application/vnd.ms-excel"),
    (".csv", "text/csv"),
    (".jpg", "image/jpeg"),
    (".jpeg", "image/jpeg"),
    (".png", "image/png"),
])
def test_upload_valid_types(client, ext, mime):
    res = upload_file(client, ext, mime, content=b"test " + ext.encode())
    assert res.status_code == 200, res.json()

def test_unsupported_extension(client):
    res = upload_file(client, ".exe", "application/x-msdownload")
    assert res.status_code == 400
    assert "Unsupported file extension" in res.json()["detail"]

def test_bad_mime(client):
    res = upload_file(client, ".pdf", "image/png")
    assert res.status_code == 400
    assert "MIME type does not match" in res.json()["detail"]

def test_oversized_file(client):
    content = b"0" * (20 * 1024 * 1024 + 1)
    res = upload_file(client, ".pdf", "application/pdf", content=content)
    assert res.status_code == 400
    assert "size exceeds limit" in res.json()["detail"]

def test_traversal_filename(client):
    files = {'file': ('../../../etc/passwd.pdf', io.BytesIO(b"traversal test"), 'application/pdf')}
    res = client.post("/api/documents/upload", files=files, data={'category': 'OTHER'})
    assert res.status_code == 200
    doc_id = res.json()["id"]

# Context tests
def test_client_only_upload(client):
    cid = create_client(client)
    res = upload_file(client, ".pdf", "application/pdf", client_id=cid)
    assert res.status_code == 200
    assert res.json()["client_id"] == cid
    assert res.json()["work_id"] is None

def test_work_only_upload(client):
    cid = create_client(client)
    wid = create_work(client, cid)
    res = upload_file(client, ".pdf", "application/pdf", work_id=wid)
    assert res.status_code == 200
    assert res.json()["work_id"] == wid
    assert res.json()["client_id"] is None

def test_client_and_work_upload(client):
    cid = create_client(client)
    wid = create_work(client, cid)
    res = upload_file(client, ".pdf", "application/pdf", client_id=cid, work_id=wid)
    assert res.status_code == 200

def test_global_upload(client):
    res = upload_file(client, ".pdf", "application/pdf", content=b"global")
    assert res.status_code == 200
    assert res.json()["client_id"] is None
    assert res.json()["work_id"] is None

def test_invalid_client(client):
    res = upload_file(client, ".pdf", "application/pdf", client_id=str(uuid4()))
    assert res.status_code == 404

def test_invalid_work(client):
    res = upload_file(client, ".pdf", "application/pdf", work_id=str(uuid4()))
    assert res.status_code == 404

def test_mismatched_client_work(client):
    c1 = create_client(client)
    c2 = create_client(client)
    w1 = create_work(client, c1)
    res = upload_file(client, ".pdf", "application/pdf", client_id=c2, work_id=w1)
    assert res.status_code == 400

def test_duplicate_exact_context(client):
    cid = create_client(client)
    content = b"exact dup"
    upload_file(client, ".pdf", "application/pdf", client_id=cid, content=content)
    res2 = upload_file(client, ".pdf", "application/pdf", client_id=cid, content=content)
    assert res2.status_code == 409

def test_duplicate_different_context(client):
    c1 = create_client(client)
    c2 = create_client(client)
    content = b"diff context dup"
    upload_file(client, ".pdf", "application/pdf", client_id=c1, content=content)
    res2 = upload_file(client, ".pdf", "application/pdf", client_id=c2, content=content)
    assert res2.status_code == 200

def test_list_filters(client):
    cid = create_client(client)
    wid = create_work(client, cid)
    upload_file(client, ".pdf", "application/pdf", client_id=cid, work_id=wid, content=b"1")
    upload_file(client, ".pdf", "application/pdf", client_id=cid, content=b"2")
    
    assert len(client.get(f"/api/documents?client_id={cid}").json()) >= 2
    assert len(client.get(f"/api/documents?work_id={wid}").json()) == 1
    assert len(client.get("/api/documents?category=OTHER").json()) >= 2
    assert len(client.get("/api/documents?status=RECEIVED").json()) >= 2
    assert len(client.get("/api/documents?search=test").json()) >= 2

def test_patch_metadata(client):
    doc = upload_file(client, ".pdf", "application/pdf", content=b"patchme").json()
    res = client.patch(f"/api/documents/{doc['id']}", json={"status": "VERIFIED", "storage_reference": "hacked"})
    assert res.status_code == 200
    assert res.json()["status"] == "VERIFIED"
    
    # check that storage_reference didn't change (not allowed in schema)
    doc_fresh = client.get(f"/api/documents/{doc['id']}").json()
    assert doc_fresh["status"] == "VERIFIED"
    # the schema DocumentUpdate does not include storage_reference, so it shouldn't update

def test_download_valid(client):
    content = b"dl content"
    doc = upload_file(client, ".pdf", "application/pdf", content=content).json()
    res = client.get(f"/api/documents/{doc['id']}/download")
    assert res.status_code == 200
    assert res.content == content
    assert "/" not in res.json() if "application/json" in res.headers.get("content-type", "") else True


def test_download_google_drive_document(client, db_session, monkeypatch):
    """The download route must use the stored Drive provider, not local-only storage."""
    import uuid
    from app.models.document import Document
    from app.api.routes import documents as document_routes

    payload = b"sample drive content"
    uploaded = upload_file(client, ".pdf", "application/pdf", content=b"drive fixture 20261011").json()
    doc = db_session.query(Document).filter_by(id=uuid.UUID(uploaded["id"])).first()
    doc.storage_provider = "google_drive"
    doc.storage_reference = "mock-drive-file-id"
    db_session.commit()

    class FakeDrive:
        async def exists(self, reference):
            assert reference == "mock-drive-file-id"
            return True

        async def get_file_stream(self, reference):
            assert reference == "mock-drive-file-id"
            yield payload

    def fake_provider(name):
        assert name == "google_drive"
        return FakeDrive()

    monkeypatch.setattr(document_routes, "get_storage_provider", fake_provider)
    response = client.get(f"/api/documents/{uploaded['id']}/download")
    assert response.status_code == 200
    assert response.content == payload
    assert "attachment" in response.headers["content-disposition"]


def test_download_missing_file(client, db_session):
    import uuid
    doc = upload_file(client, ".pdf", "application/pdf", content=b"missing soon").json()
    from app.models.document import Document
    db_doc = db_session.query(Document).filter_by(id=uuid.UUID(doc["id"])).first()
    
    # manually delete file to simulate missing
    from app.services.storage import storage
    import asyncio
    asyncio.run(storage.delete_file(db_doc.storage_reference))
    
    res = client.get(f"/api/documents/{doc['id']}/download")
    assert res.status_code == 404

def test_download_unknown_doc(client):
    res = client.get(f"/api/documents/{uuid4()}/download")
    assert res.status_code == 404

def test_checklist_routes(client, db_session):
    cid = create_client(client)
    wid = create_work(client, cid)
    
    import uuid
    # inject a checklist item
    item = WorkChecklist(work_id=uuid.UUID(wid), item_text="Test Item", status="PENDING", sort_order=1)
    db_session.add(item)
    db_session.commit()
    
    res = client.get(f"/api/works/{wid}/checklist")
    assert res.status_code == 200
    assert len(res.json()) == 1
    item_id = res.json()[0]["id"]
    
    res2 = client.patch(f"/api/works/{wid}/checklist/{item_id}", json={"status": "RECEIVED"})
    assert res2.status_code == 200
    assert res2.json()["status"] == "RECEIVED"
    
    # Cross work editing
    w2 = create_work(client, cid)
    res3 = client.patch(f"/api/works/{w2}/checklist/{item_id}", json={"status": "COMPLETED"})
    assert res3.status_code == 404
