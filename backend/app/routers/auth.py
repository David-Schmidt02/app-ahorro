from fastapi import APIRouter, status

from app.dependencies import DbDep, UsuarioDep
from app.schemas.auth import EstadoRegistroOut, LoginIn, RegistroIn, SesionOut, UsuarioOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Cuenta"])


@router.get("/estado", response_model=EstadoRegistroOut)
def estado(db: DbDep) -> EstadoRegistroOut:
    return EstadoRegistroOut(registro_abierto=AuthService(db).registro_abierto())


@router.post("/registro", response_model=SesionOut, status_code=status.HTTP_201_CREATED)
def registrar(datos: RegistroIn, db: DbDep) -> SesionOut:
    return AuthService(db).registrar(datos)


@router.post("/login", response_model=SesionOut)
def ingresar(datos: LoginIn, db: DbDep) -> SesionOut:
    return AuthService(db).ingresar(datos)


@router.get("/yo", response_model=UsuarioOut)
def yo(usuario: UsuarioDep) -> UsuarioOut:
    return UsuarioOut.model_validate(usuario)
