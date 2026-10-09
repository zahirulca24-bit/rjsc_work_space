# RJSC Backend Production Checklist

## Environment

Required in production:

- APP_ENV=production
- DATABASE_URL must point to the production PostgreSQL / Neon database.
- AUTH_SECRET must contain at least 32 characters.
- CORS_ORIGINS must contain approved HTTPS frontend origins only.
- Do not use wildcard, localhost, or 127.0.0.1 in production CORS.
- NEXT_PUBLIC_API_BASE_URL must point to the deployed HTTPS backend.

## Database

Before production traffic:

    alembic upgrade head

Database connections use:

- pool_pre_ping
- connection recycling
- bounded pool size and overflow

## Storage

Local storage is suitable for development only.

Google Drive production configuration requires:

- STORAGE_PROVIDER=google_drive
- GOOGLE_DRIVE_ROOT_FOLDER_ID
- GOOGLE_SERVICE_ACCOUNT_JSON

Never commit credentials.

## Health

Liveness:

    GET /health

Readiness:

    GET /health/ready

Readiness verifies database connectivity.

## Configuration check

From backend:

    python scripts/check_production_env.py

The checker reports configuration state and never prints secrets.

## Verification

Backend:

    alembic upgrade head
    python -m pytest

Frontend:

    npm test
    npm run typecheck
    npm run build

Do not deploy when migration, tests, typecheck, or build fails.
