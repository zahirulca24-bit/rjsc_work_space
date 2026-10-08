from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = None
SessionLocal = None

if settings.DATABASE_URL:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args={'check_same_thread': False} if 'sqlite' in settings.DATABASE_URL else {})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database is not configured. DATABASE_URL is missing.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
