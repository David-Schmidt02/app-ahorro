"""Utilidades de autenticación y middleware JWT."""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.config.settings import get_settings
from src.database import get_db
from src.repositories.usuario_repository import UsuarioRepository
from src.domain.usuario import Usuario

# Security scheme
security = HTTPBearer()


def crear_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT.

    Args:
        data: Datos a codificar en el token
        expires_delta: Tiempo de expiración (usa default de config si no se especifica)

    Returns:
        str: Token JWT codificado
    """
    to_encode = data.copy()
    settings = get_settings()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt.access_token_expire_minutes)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt.secret_key, algorithm=settings.jwt.algorithm)
    return encoded_jwt


def decodificar_token(token: str) -> dict:
    """
    Decodifica un token JWT.

    Args:
        token: Token JWT a decodificar

    Returns:
        dict: Payload del token

    Raises:
        ValueError: Si el token es inválido
    """
    try:
        settings = get_settings()
        payload = jwt.decode(token, settings.jwt.secret_key, algorithms=[settings.jwt.algorithm])
        return payload
    except JWTError as e:
        raise ValueError("Token inválido") from e


def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Dependency que obtiene el usuario actual desde el token JWT.

    Args:
        credentials: Credenciales HTTP Bearer
        db: Sesión de base de datos

    Returns:
        Usuario: Usuario autenticado

    Raises:
        HTTPException: Si el token es inválido o el usuario no existe
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = decodificar_token(token)
        email: str = payload.get("sub")

        if email is None:
            raise credentials_exception

    except ValueError:
        raise credentials_exception

    # Obtener usuario desde la DB
    repository = UsuarioRepository(db)
    usuario = repository.obtener_por_email(email)

    if usuario is None:
        raise credentials_exception

    return usuario


# Dependency opcional para endpoints que pueden funcionar con o sin autenticación
async def obtener_usuario_opcional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[Usuario]:
    """
    Dependency que obtiene el usuario actual si hay token, o None si no hay.

    Args:
        credentials: Credenciales HTTP Bearer opcionales
        db: Sesión de base de datos

    Returns:
        Usuario: Usuario autenticado o None
    """
    if not credentials:
        return None

    try:
        return obtener_usuario_actual(credentials, db)
    except HTTPException:
        return None
