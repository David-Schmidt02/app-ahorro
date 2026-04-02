"""Repositorio de gastos."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from src.database import GastoORM
from src.domain.gasto import Gasto
from src.domain.enums import Moneda


class GastoRepository:

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: GastoORM) -> Gasto:
        return Gasto(
            id=orm.id,
            monto=Decimal(str(orm.monto)),
            moneda=Moneda(orm.moneda),
            categoria=orm.categoria,
            usuario_id=orm.usuario_id,
            descripcion=orm.descripcion,
            fecha=orm.fecha,
            subtipo=orm.subtipo or 'regular',
            fecha_pago=orm.fecha_pago,
        )

    def crear(self, gasto: Gasto) -> Gasto:
        orm = GastoORM(
            monto=gasto.monto,
            moneda=gasto.moneda.value,
            categoria=gasto.categoria,
            usuario_id=gasto.usuario_id,
            descripcion=gasto.descripcion,
            fecha=gasto.fecha,
            subtipo=gasto.subtipo,
            fecha_pago=gasto.fecha_pago,
        )
        self.db.add(orm)
        self.db.commit()
        self.db.refresh(orm)
        return self._to_domain(orm)

    def listar_por_usuario(self, usuario_id: int, limite: Optional[int] = None) -> List[Gasto]:
        q = (
            self.db.query(GastoORM)
            .filter(GastoORM.usuario_id == usuario_id)
            .order_by(GastoORM.fecha.desc())
        )
        if limite:
            q = q.limit(limite)
        return [self._to_domain(o) for o in q.all()]

    def obtener(self, gasto_id: int) -> Optional[Gasto]:
        orm = self.db.query(GastoORM).filter(GastoORM.id == gasto_id).first()
        return self._to_domain(orm) if orm else None

    def eliminar(self, gasto_id: int) -> None:
        orm = self.db.query(GastoORM).filter(GastoORM.id == gasto_id).first()
        if orm:
            self.db.delete(orm)
            self.db.commit()
