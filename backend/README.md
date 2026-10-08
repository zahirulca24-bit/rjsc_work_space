# RJSC Backend

FastAPI backend for the RJSC project.

## Local Run

1. Open PowerShell and navigate to the backend directory:
   `powershell
   cd D:\rjsc_work_space_git\backend
   `
2. Create a virtual environment:
   `powershell
   python -m venv .venv
   `
3. Activate the virtual environment:
   `powershell
   .\.venv\Scripts\Activate.ps1
   `
4. Install dependencies:
   `powershell
   python -m pip install -r requirements.txt
   `
5. Run the server:
   `powershell
   python -m uvicorn app.main:app --reload --port 8000
   `

## Document Storage

- **Local Storage**: Uploaded files are saved to ackend/storage/ using UUID names to prevent collisions.
- **Upload Limits**: Files are restricted to 20MB.
- **Allowed Extensions**: PDF, DOCX, XLSX, XLS, CSV, JPG, JPEG, PNG.
- **Document API**: Supports GET, POST (upload with multipart/form-data), PATCH (metadata), and download endpoint.
- **Future Note**: Google Drive integration will arrive in Phase 9, replacing local development storage.
