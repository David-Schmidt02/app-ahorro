"""Repository para la entidad TasaCambio."""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.database import TasaCambioORM
from src.domain.tasa_cambio import TasaCambio
from src.domain.enums import TipoCotizacion
from src.log.logging_config import get_logger

logger = get_logger("tasa_cambio_repository")


class TasaCambioRepository:
    """Repository que maneja la persistencia de tasas de cambio."""

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: TasaCambioORM) -> TasaCambio:
        """Convierte un modelo ORM a entidad de dominio."""
        return TasaCambio(
            id=orm.id,
            moneda_origen=orm.moneda_origen,
            moneda_destino=orm.moneda_destino,
            tasa=orm.tasa,
            tipo_cotizacion=orm.tipo_cotizacion,
            fuente=orm.fuente,
            fecha=orm.fecha
        )

    def _to_orm(self, tasa_cambio: TasaCambio) -> TasaCambioORM:
        """Convierte una entidad de dominio a modelo ORM."""
        orm = TasaCambioORM(
            moneda_origen=tasa_cambio.moneda_origen,
            moneda_destino=tasa_cambio.moneda_destino,
            tasa=tasa_cambio.tasa,
            tipo_cotizacion=tasa_cambio.tipo_cotizacion,
            fuente=tasa_cambio.fuente,
            fecha=tasa_cambio.fecha
        )
        if tasa_cambio.id:
            orm.id = tasa_cambio.id
        return orm

    def crear(self, tasa_cambio: TasaCambio) -> TasaCambio:
        """
        Crea una nueva tasa de cambio en la base de datos.

        Args:
            tasa_cambio: Entidad de dominio TasaCambio

        Returns:
            Optional[TasaCambio]: Entidad creada con ID asignado o None si error
        """
        try:
            orm = self._to_orm(tasa_cambio)
            self.db.add(orm)
            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error al crear tasa de cambio: {e}")
            return None

    def obtener_por_id(self, tasa_id: int) -> TasaCambio:
        """
        Obtiene una tasa de cambio por su ID.

        Args:
            tasa_id: ID de la tasa de cambio

        Returns:
            Optional[TasaCambio]: Entidad de dominio o None
        """
        try:
            orm = self.db.query(TasaCambioORM).filter(TasaCambioORM.id == tasa_id).first()
            return self._to_domain(orm) if orm else None
        except SQLAlchemyError as e:
            logger.error(f"Error al obtener tasa de cambio {tasa_id}: {e}")
            return None

    def obtener_ultima(
        self,
        moneda_origen: str,
        moneda_destino: str,
        tipo_cotizacion: TipoCotizacion
    ) -> Optional[TasaCambio]:
        """
        Obtiene la tasa de cambio más reciente para un par de monedas.

        Args:
            moneda_origen: Moneda de origen
            moneda_destino: Moneda de destino
            tipo_cotizacion: Tipo de cotización

        Returns:
            Optional[TasaCambio]: Tasa más reciente o None si no existe
        """
        try:
            orm = self.db.query(TasaCambioORM).filter(
                TasaCambioORM.moneda_origen == moneda_origen,
                TasaCambioORM.moneda_destino == moneda_destino,
                TasaCambioORM.tipo_cotizacion == tipo_cotizacion
            ).order_by(TasaCambioORM.fecha.desc()).first()

            return self._to_domain(orm) if orm else None
        except SQLAlchemyError as e:
            logger.error(f"Error al obtener última tasa de cambio: {e}")
            return None

    def listar_por_tipo(self, tipo_cotizacion: TipoCotizacion) -> List[TasaCambio]:
        """
        Obtiene todas las tasas de un tipo específico.

        Args:
            tipo_cotizacion: Tipo de cotización

        Returns:
            List[TasaCambio]: Lista de tasas ordenadas por fecha
        """
        try:
            orms = self.db.query(TasaCambioORM).filter(
                TasaCambioORM.tipo_cotizacion == tipo_cotizacion
            ).order_by(TasaCambioORM.fecha.desc()).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar tasas por tipo {tipo_cotizacion}: {e}")
            return []

    def listar_todas(self) -> List[TasaCambio]:
        """
        Obtiene todas las tasas de cambio.

        Returns:
            List[TasaCambio]: Lista de tasas ordenadas por fecha
        """
        try:
            orms = self.db.query(TasaCambioORM).order_by(TasaCambioORM.fecha.desc()).all()
            return [self._to_domain(orm) for orm in orms]
        except SQLAlchemyError as e:
            logger.error(f"Error al listar todas las tasas de cambio: {e}")
            return []
