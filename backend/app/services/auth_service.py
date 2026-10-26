from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import Conflicto, NoAutorizado, ReglaDeNegocio
from app.core.security import crear_token, hashear_password, verificar_password
from app.models import Usuario
from app.schemas.auth import LoginIn, RegistroIn, SesionOut, UsuarioOut


class AuthService:
    """El registro queda abierto hasta que la casa tiene `max_usuarios` cuentas."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def registro_abierto(self) -> bool:
        return self.db.scalar(select(func.count(Usuario.id))) < get_settings().max_usuarios

    def registrar(self, datos: RegistroIn) -> SesionOut:
        if not self.registro_abierto():
            raise ReglaDeNegocio("El registro está cerrado: la casa ya tiene todas sus cuentas")
        email = datos.email.lower()
        if self.db.scalar(select(Usuario).where(Usuario.email == email)):
            raise Conflicto("Ya existe una cuenta con ese email")
        usuario = Usuario(nombre=datos.nombre.strip(), email=email, password_hash=hashear_password(datos.password))
        self.db.add(usuario)
        self.db.commit()
        return self._sesion(usuario)

    def ingresar(self, datos: LoginIn) -> SesionOut:
        usuario = self.db.scalar(select(Usuario).where(Usuario.email == datos.email.lower()))
        if usuario is None or not verificar_password(datos.password, usuario.password_hash):
            raise NoAutorizado("Email o contraseña incorrectos")
        return self._sesion(usuario)

    @staticmethod
    def _sesion(usuario: Usuario) -> SesionOut:
        return SesionOut(token=crear_token(usuario.id), usuario=UsuarioOut.model_validate(usuario))
