import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings
import bcrypt

# We are strictly using bcrypt directly as passlib is unmaintained for some hashes
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default fallback if not provided via settings
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, getattr(settings, "AUTH_SECRET", "super-secret"), algorithm="HS256")
    return encoded_jwt
