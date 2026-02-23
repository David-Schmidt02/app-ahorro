"""Repository para la entidad Usuario."""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from src.database import UsuarioORM
from src.domain.usuario import Usuario
from src.log.logging_config import get_logger

logger = get_logger("usuario_repository")


class UsuarioRepository:
    """Repository que maneja la persistencia de usuarios."""

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: UsuarioORM) -> Usuario:
        """Convierte un modelo ORM a entidad de dominio."""
        return Usuario(
            id=orm.id,
            nombre=orm.nombre,
            email=orm.email,
            password_hash=orm.password_hash,
            fecha_creacion=orm.fecha_creacion
        )

    def _to_orm(self, usuario: Usuario) -> UsuarioORM:
        """Convierte una entidad de dominio a modelo ORM."""
        orm = UsuarioORM(
            nombre=usuario.nombre,
            email=usuario.email,
            password_hash=usuario.password_hash,
            fecha_creacion=usuario.fecha_creacion
        )
        if usuario.id:
            orm.id = usuario.id
        return orm

    def crear(self, usuario: Usuario) -> Usuario:
        """
        Crea un nuevo usuario en la base de datos.

        Args:
            usuario: Entidad de dominio Usuario

        Returns:
            Usuario: Entidad creada con ID asignado
        """
        try:
            orm = self._to_orm(usuario)
            self.db.add(orm)
            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Email {usuario.email} ya existe: {e}")
            return None
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al crear usuario: {e}")
            return None

    def obtener_por_id(self, usuario_id: int) -> Usuario:
        """
        Obtiene un usuario por su ID.

        Args:
            usuario_id: ID del usuario

        Returns:
            Optional[Usuario]: Entidad de dominio o None si hay error o no existe
        """
        try:
            orm = self.db.query(UsuarioORM).filter(UsuarioORM.id == usuario_id).first()
            return self._to_domain(orm) if orm else None
        except SQLAlchemyError as e:
            logger.error(f"Error al obtener usuario por id {usuario_id}: {e}")
            return None

    def obtener_por_email(self, email: str) -> Optional[Usuario]:
        """
        Obtiene un usuario por su email.

        Args:
            email: Email del usuario

        Returns:
            Optional[Usuario]: Entidad de dominio o None si no existe/error
        """
        try:
            orm = self.db.query(UsuarioORM).filter(UsuarioORM.email == email).first()
            return self._to_domain(orm) if orm else None
        except SQLAlchemyError as e:
            logger.error(f"Error al obtener usuario por email {email}: {e}")
            return None

    def listar_todos(self) -> List[Usuario]:
        """
        Obtiene todos los usuarios.

        Returns:
            List[Usuario]: Lista de entidades de dominio o lista vacía si error
        """
        try:
            orms = self.db.query(UsuarioORM).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar usuarios: {e}")
            return []

    def actualizar(self, usuario: Usuario) -> Usuario:
        """
        Actualiza un usuario existente.

        Args:
            usuario: Entidad de dominio con datos actualizados

        Returns:
            Optional[Usuario]: Entidad actualizada o None si no existe o hay error
        """
        try:
            orm = self.db.query(UsuarioORM).filter(UsuarioORM.id == usuario.id).first()
            if not orm:
                return None

            orm.nombre = usuario.nombre
            orm.email = usuario.email
            orm.password_hash = usuario.password_hash

            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Email {usuario.email} ya está en uso al actualizar: {e}")
            return None
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al actualizar usuario: {e}")
            return None

    def eliminar(self, usuario_id: int) -> None:
        """
        Elimina un usuario.

        Args:
            usuario_id: ID del usuario a eliminar

        Returns:
            bool: True si se eliminó, False si no existe o hubo error
        """
        try:
            orm = self.db.query(UsuarioORM).filter(UsuarioORM.id == usuario_id).first()
            if not orm:
                return False

            self.db.delete(orm)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al eliminar usuario {usuario_id}: {e}")
            return False
