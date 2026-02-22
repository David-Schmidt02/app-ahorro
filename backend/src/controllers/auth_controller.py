"""Controller para autenticación."""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.usuario_repository import UsuarioRepository
from src.services.usuario_service import UsuarioService
from src.schemas.usuario_schema import UsuarioLogin, Token, UsuarioCreate, UsuarioResponse
from src.middleware.auth_middleware import crear_access_token
from src.config.settings import get_settings


router = APIRouter(prefix="/auth", tags=["Autenticación"])


def get_usuario_service(db: Session = Depends(get_db)) -> UsuarioService:
    """Dependency que proporciona el servicio de usuario."""
    repository = UsuarioRepository(db)
    return UsuarioService(repository)


@router.post("/login", response_model=Token)
def login(
    credentials: UsuarioLogin,
    service: UsuarioService = Depends(get_usuario_service)
):
    """
    Endpoint de login.

    Args:
        credentials: Credenciales de usuario (email y password)
        service: Servicio de usuario

    Returns:
        Token: Token JWT de acceso
    """
    # Autenticar usando el service
    usuario = service.autenticar(credentials.email, credentials.password)

    # Crear token JWT
    settings = get_settings()
    access_token_expires = timedelta(minutes=settings.jwt.access_token_expire_minutes)
    access_token = crear_access_token(
        data={"sub": usuario.email},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(
    usuario_data: UsuarioCreate,
    service: UsuarioService = Depends(get_usuario_service)
):
    """
    Endpoint de registro de nuevo usuario.

    Args:
        usuario_data: Datos del nuevo usuario
        service: Servicio de usuario

    Returns:
        UsuarioResponse: Usuario creado
    """
    usuario = service.crear_usuario(
        nombre=usuario_data.nombre,
        email=usuario_data.email,
        password=usuario_data.password
    )

    return usuario
