import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models.user import User, RoleEnum
from app.core.security import get_password_hash

def bootstrap():
    load_dotenv()
    
    email = os.getenv("INITIAL_ADMIN_EMAIL")
    password = os.getenv("INITIAL_ADMIN_PASSWORD")
    name = os.getenv("INITIAL_ADMIN_NAME", "Admin")

    if not email or not password:
        print("Error: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in .env")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Admin user with email {email} already exists.")
            return

        admin = User(
            name=name,
            email=email,
            password_hash=get_password_hash(password),
            role=RoleEnum.ADMIN
        )
        db.add(admin)
        db.commit()
        print(f"Successfully created initial admin user: {email}")
    except Exception as e:
        print(f"Failed to create admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    bootstrap()
