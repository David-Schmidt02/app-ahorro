"""Hash de contraseñas y tokens JWT."""
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import get_settings
from app.core.exceptions import NoAutorizado

_ALGORITMO = "HS256"


def hashear_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verificar_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode()[:72], password_hash.encode())


def crear_token(usuario_id: int) -> str:
    settings = get_settings()
    expira = datetime.now(UTC) + timedelta(days=settings.token_dias)
    return jwt.encode({"sub": str(usuario_id), "exp": expira}, settings.secret_key, algorithm=_ALGORITMO)


def leer_token(token: str) -> int:
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=[_ALGORITMO])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise NoAutorizado("Sesión vencida o inválida, volvé a ingresar") from exc
