"""Service para la lógica de negocio de Usuario."""
from typing import List
from passlib.context import CryptContext

from src.domain.usuario import Usuario
from src.repositories.usuario_repository import UsuarioRepository


import bcrypt
try:
    # Workaround para compatibilidad entre passlib y bcrypt >= 4.0
    bcrypt.__about__ = type("about", (), {"__version__": bcrypt.__version__})
except (AttributeError, ImportError):
    pass

# Configuración para hasheo de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UsuarioService:
    """Service que orquesta la lógica de negocio de usuarios."""

    def __init__(self, repository: UsuarioRepository):
        self.repository = repository

    def _hash_password(self, password: str) -> str:
        """Hashea una contraseña."""
        return pwd_context.hash(password)

    def _verificar_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifica si una contraseña coincide con su hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def crear_usuario(self, nombre: str, email: str, password: str) -> Usuario:
        """
        Crea un nuevo usuario.

        Args:
            nombre: Nombre del usuario
            email: Email del usuario
            password: Contraseña sin hashear

        Returns:
            Usuario: Usuario creado

        Raises:
            ValueError: Si el email ya existe
        """
        # Validar que el email no exista
        usuario_existente = self.repository.obtener_por_email(email)
        if usuario_existente:
            raise ValueError(f"Ya existe un usuario con el email {email}")

        # Crear entidad de dominio con password hasheada
        password_hash = self._hash_password(password)
        usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=password_hash
        )

        # Persistir
        nuevo_usuario = self.repository.crear(usuario)
        if not nuevo_usuario:
            raise ValueError(f"No se pudo crear el usuario con email {email}")
        return nuevo_usuario

    def autenticar(self, email: str, password: str) -> Usuario:
        """
        Autentica un usuario con email y contraseña.

        Args:
            email: Email del usuario
            password: Contraseña sin hashear

        Returns:
            Usuario: Usuario autenticado

        Raises:
            ValueError: Si las credenciales son inválidas
        """
        usuario = self.repository.obtener_por_email(email)

        if not usuario:
            raise ValueError("Credenciales inválidas")

        if not self._verificar_password(password, usuario.password_hash):
            raise ValueError("Credenciales inválidas")

        return usuario

    def obtener_usuario(self, usuario_id: int) -> Usuario:
        """
        Obtiene un usuario por su ID.

        Args:
            usuario_id: ID del usuario

        Returns:
            Usuario: Usuario encontrado

        Raises:
            KeyError: Si no se encuentra el usuario
        """
        usuario = self.repository.obtener_por_id(usuario_id)
        if not usuario:
            raise KeyError(f"No se encontró usuario con id {usuario_id}")
        return usuario

    def obtener_por_email(self, email: str) -> Usuario:
        """
        Obtiene un usuario por su email.

        Args:
            email: Email del usuario

        Returns:
            Usuario: Usuario encontrado

        Raises:
            KeyError: Si no se encuentra el usuario
        """
        usuario = self.repository.obtener_por_email(email)
        if not usuario:
            raise KeyError(f"No se encontró usuario con email {email}")
        return usuario

    def listar_usuarios(self) -> List[Usuario]:
        """
        Lista todos los usuarios.

        Returns:
            List[Usuario]: Lista de usuarios
        """
        return self.repository.listar_todos()

    def actualizar_usuario(
        self,
        usuario_id: int,
        nombre: str = None,
        email: str = None,
        password: str = None
    ) -> Usuario:
        """
        Actualiza un usuario existente.

        Args:
            usuario_id: ID del usuario
            nombre: Nuevo nombre (opcional)
            email: Nuevo email (opcional)
            password: Nueva contraseña (opcional)

        Returns:
            Usuario: Usuario actualizado
        """
        # Obtener entidad de dominio
        usuario = self.repository.obtener_por_id(usuario_id)

        # Modificar usando setters (la entidad es responsable de validar)
        if nombre:
            usuario.nombre = nombre

        if email and email != usuario.email:
            # Validar que el nuevo email no esté en uso
            usuario_con_email = self.repository.obtener_por_email(email)
            if usuario_con_email and usuario_con_email.id != usuario_id:
                raise ValueError(f"El email {email} ya está en uso")
            usuario.email = email

        if password:
            usuario.password_hash = self._hash_password(password)

        # Persistir cambios
        actualizado = self.repository.actualizar(usuario)
        if not actualizado:
            raise ValueError(f"Error al actualizar el usuario {usuario_id}")
        return actualizado

    def eliminar_usuario(self, usuario_id: int) -> None:
        """
        Elimina un usuario.

        Args:
            usuario_id: ID del usuario a eliminar
        Raises:
            KeyError: Si no se pudo eliminar o no existe
        """
        if not self.repository.eliminar(usuario_id):
            raise KeyError(f"No se pudo eliminar el usuario con id {usuario_id}")
