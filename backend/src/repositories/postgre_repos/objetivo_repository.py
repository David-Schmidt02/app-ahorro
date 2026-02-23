"""Repository para la entidad Objetivo."""
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.database import ObjetivoORM
from src.domain.objetivo import Objetivo
from src.domain.enums import EstadoObjetivo
from src.log.logging_config import get_logger

logger = get_logger("objetivo_repository")


class ObjetivoRepository:
    """Repository que maneja la persistencia de objetivos."""

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: ObjetivoORM) -> Objetivo:
        """Convierte un modelo ORM a entidad de dominio."""
        return Objetivo(
            id=orm.id,
            nombre=orm.nombre,
            descripcion=orm.descripcion,
            monto_objetivo=orm.monto_objetivo,
            monto_actual=orm.monto_actual,
            moneda=orm.moneda,
            fecha_limite=orm.fecha_limite,
            fecha_creacion=orm.fecha_creacion,
            estado=orm.estado,
            es_prioritario=orm.es_prioritario,
            completado=orm.completado
        )

    def _to_orm(self, objetivo: Objetivo) -> ObjetivoORM:
        """Convierte una entidad de dominio a modelo ORM."""
        orm = ObjetivoORM(
            nombre=objetivo.nombre,
            descripcion=objetivo.descripcion,
            monto_objetivo=objetivo.monto_objetivo,
            monto_actual=objetivo.monto_actual,
            moneda=objetivo.moneda,
            fecha_limite=objetivo.fecha_limite,
            fecha_creacion=objetivo.fecha_creacion,
            estado=objetivo.estado,
            es_prioritario=objetivo.es_prioritario,
            completado=objetivo.completado
        )
        if objetivo.id:
            orm.id = objetivo.id
        return orm

    def crear(self, objetivo: Objetivo) -> Objetivo:
        """
        Crea un nuevo objetivo en la base de datos.

        Args:
            objetivo: Entidad de dominio Objetivo

        Returns:
            Optional[Objetivo]: Entidad creada con ID asignado, o None si error
        """
        try:
            orm = self._to_orm(objetivo)
            self.db.add(orm)
            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al crear objetivo: {e}")
            return None

    def obtener_por_id(self, objetivo_id: int) -> Objetivo:
        """
        Obtiene un objetivo por su ID.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Optional[Objetivo]: Entidad de dominio o None
        """
        try:
            orm = self.db.query(ObjetivoORM).filter(ObjetivoORM.id == objetivo_id).first()
            return self._to_domain(orm) if orm else None
        except SQLAlchemyError as e:
            logger.error(f"Error al obtener objetivo {objetivo_id}: {e}")
            return None

    def listar_todos(self) -> List[Objetivo]:
        """
        Obtiene todos los objetivos.

        Returns:
            List[Objetivo]: Lista de entidades de dominio
        """
        try:
            orms = self.db.query(ObjetivoORM).order_by(ObjetivoORM.fecha_creacion.desc()).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar objetivos: {e}")
            return []

    def listar_por_estado(self, estado: EstadoObjetivo) -> List[Objetivo]:
        """
        Obtiene objetivos filtrados por estado.

        Args:
            estado: Estado del objetivo

        Returns:
            List[Objetivo]: Lista de entidades de dominio
        """
        try:
            orms = self.db.query(ObjetivoORM).filter(ObjetivoORM.estado == estado).order_by(ObjetivoORM.fecha_creacion.desc()).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar objetivos por estado {estado}: {e}")
            return []

    def listar_activos(self) -> List[Objetivo]:
        """
        Obtiene todos los objetivos activos.

        Returns:
            List[Objetivo]: Lista de objetivos activos
        """
        return self.listar_por_estado(EstadoObjetivo.ACTIVO)

    def listar_prioritarios(self) -> List[Objetivo]:
        """
        Obtiene todos los objetivos marcados como prioritarios.

        Returns:
            List[Objetivo]: Lista de objetivos prioritarios
        """
        try:
            orms = self.db.query(ObjetivoORM).filter(ObjetivoORM.es_prioritario == True).order_by(ObjetivoORM.fecha_limite.asc()).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar objetivos prioritarios: {e}")
            return []

    def actualizar(self, objetivo: Objetivo) -> Objetivo:
        """
        Actualiza un objetivo existente.

        Args:
            objetivo: Entidad de dominio con datos actualizados

        Returns:
            Optional[Objetivo]: Entidad actualizada o None si no existe o hay error
        """
        try:
            orm = self.db.query(ObjetivoORM).filter(ObjetivoORM.id == objetivo.id).first()
            if not orm:
                return None

            orm.nombre = objetivo.nombre
            orm.descripcion = objetivo.descripcion
            orm.monto_objetivo = objetivo.monto_objetivo
            orm.monto_actual = objetivo.monto_actual
            orm.moneda = objetivo.moneda
            orm.fecha_limite = objetivo.fecha_limite
            orm.estado = objetivo.estado
            orm.es_prioritario = objetivo.es_prioritario
            orm.completado = objetivo.completado

            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al actualizar objetivo {objetivo.id}: {e}")
            return None

    def eliminar(self, objetivo_id: int) -> None:
        """
        Elimina un objetivo.

        Args:
            objetivo_id: ID del objetivo a eliminar

        Returns:
            bool: True si se eliminó, False si no existe o error
        """
        try:
            orm = self.db.query(ObjetivoORM).filter(ObjetivoORM.id == objetivo_id).first()
            if not orm:
                return False

            self.db.delete(orm)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al eliminar objetivo {objetivo_id}: {e}")
            return False
