from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = None
SessionLocal = None

if settings.DATABASE_URL:
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")

    kwargs = {"pool_pre_ping": True}

    if is_sqlite:
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs.update({
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
        })

    engine = create_engine(settings.DATABASE_URL, **kwargs)

    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        bind=engine,
    )

def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database is not configured. DATABASE_URL is missing.")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.info.pop("audit_user_id", None)
        db.info.pop("audit_user_role", None)
        db.close()
