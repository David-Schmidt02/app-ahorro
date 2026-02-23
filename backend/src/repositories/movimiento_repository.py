"""Repository para la entidad Movimiento."""
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.database import MovimientoORM
from src.domain.movimiento import Movimiento
from src.log.logging_config import get_logger

logger = get_logger("movimiento_repository")


class MovimientoRepository:
    """Repository que maneja la persistencia de movimientos."""

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: MovimientoORM) -> Movimiento:
        """Convierte un modelo ORM a entidad de dominio."""
        return Movimiento(
            id=orm.id,
            monto=orm.monto,
            moneda=orm.moneda,
            tipo=orm.tipo,
            usuario_id=orm.usuario_id,
            objetivo_id=orm.objetivo_id,
            motivo=orm.motivo,
            nota=orm.nota,
            fecha=orm.fecha
        )

    def _to_orm(self, movimiento: Movimiento) -> MovimientoORM:
        """Convierte una entidad de dominio a modelo ORM."""
        orm = MovimientoORM(
            monto=movimiento.monto,
            moneda=movimiento.moneda,
            tipo=movimiento.tipo,
            usuario_id=movimiento.usuario_id,
            objetivo_id=movimiento.objetivo_id,
            motivo=movimiento.motivo,
            nota=movimiento.nota,
            fecha=movimiento.fecha
        )
        if movimiento.id:
            orm.id = movimiento.id
        return orm

    def crear(self, movimiento: Movimiento) -> Movimiento:
        """
        Crea un nuevo movimiento en la base de datos.

        Args:
            movimiento: Entidad de dominio Movimiento

        Returns:
            Optional[Movimiento]: Entidad creada con ID asignado o None si error
        """
        try:
            orm = self._to_orm(movimiento)
            self.db.add(orm)
            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al crear movimiento: {e}")
            return None

    def obtener_por_id(self, movimiento_id: int) -> Movimiento:
        """
        Obtiene un movimiento por su ID.

        Args:
            movimiento_id: ID del movimiento

        Returns:
            Optional[Movimiento]: Entidad de dominio o None
        """
        try:
            orm = self.db.query(MovimientoORM).filter(MovimientoORM.id == movimiento_id).first()
            return self._to_domain(orm) if orm else None
        except SQLAlchemyError as e:
            logger.error(f"Error al obtener movimiento {movimiento_id}: {e}")
            return None

    def listar_por_objetivo(self, objetivo_id: int) -> List[Movimiento]:
        """
        Obtiene todos los movimientos de un objetivo específico.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            List[Movimiento]: Lista de movimientos ordenados por fecha
        """
        try:
            orms = self.db.query(MovimientoORM).filter(
                MovimientoORM.objetivo_id == objetivo_id
            ).order_by(MovimientoORM.fecha.desc()).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar movimientos por objetivo {objetivo_id}: {e}")
            return []

    def listar_todos(self) -> List[Movimiento]:
        """
        Obtiene todos los movimientos.

        Returns:
            List[Movimiento]: Lista de movimientos ordenados por fecha
        """
        try:
            orms = self.db.query(MovimientoORM).order_by(MovimientoORM.fecha.desc()).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar movimientos: {e}")
            return []

    def listar_recientes(self, limite: int = 10) -> List[Movimiento]:
        """
        Obtiene los movimientos más recientes.

        Args:
            limite: Cantidad máxima de movimientos a retornar

        Returns:
            List[Movimiento]: Lista de movimientos recientes
        """
        try:
            orms = self.db.query(MovimientoORM).order_by(
                MovimientoORM.fecha.desc()
            ).limit(limite).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar movimientos recientes: {e}")
            return []

    def actualizar(self, movimiento: Movimiento) -> Movimiento:
        """
        Actualiza un movimiento existente.

        Args:
            movimiento: Entidad de dominio con los cambios

        Returns:
            Optional[Movimiento]: Entidad actualizada o None si error
        """
        try:
            orm = self.db.query(MovimientoORM).filter(MovimientoORM.id == movimiento.id).first()
            if not orm:
                logger.warning(f"Movimiento {movimiento.id} no encontrado para actualizar")
                return None

            # Actualizar campos
            orm.monto = movimiento.monto
            orm.moneda = movimiento.moneda
            orm.tipo = movimiento.tipo
            orm.motivo = movimiento.motivo
            orm.nota = movimiento.nota

            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al actualizar movimiento {movimiento.id}: {e}")
            return None

    def eliminar(self, movimiento_id: int) -> None:
        """
        Elimina un movimiento.

        Args:
            movimiento_id: ID del movimiento a eliminar

        Returns:
            bool: True si se eliminó, False si no existe o hay error
        """
        try:
            orm = self.db.query(MovimientoORM).filter(MovimientoORM.id == movimiento_id).first()
            if not orm:
                return False

            self.db.delete(orm)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al eliminar movimiento {movimiento_id}: {e}")
            return False
