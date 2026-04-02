"""Servicio de gastos."""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

from src.domain.gasto import Gasto
from src.domain.enums import Moneda
from src.repositories.gasto_repository import GastoRepository


class GastoService:

    def __init__(self, repository: GastoRepository):
        self.repo = repository

    def crear_gasto(
        self,
        monto: float,
        moneda: str,
        categoria: str,
        usuario_id: int,
        descripcion: Optional[str] = None,
        fecha: Optional[datetime] = None,
        subtipo: str = 'regular',
        fecha_pago: Optional[date] = None,
    ) -> Gasto:
        gasto = Gasto(
            monto=Decimal(str(monto)),
            moneda=Moneda(moneda),
            categoria=categoria,
            usuario_id=usuario_id,
            descripcion=descripcion,
            fecha=fecha or datetime.now(),
            subtipo=subtipo,
            fecha_pago=fecha_pago,
        )
        return self.repo.crear(gasto)

    def listar_gastos(self, usuario_id: int, limite: Optional[int] = None) -> List[Gasto]:
        return self.repo.listar_por_usuario(usuario_id, limite)

    def eliminar_gasto(self, gasto_id: int, usuario_id: int) -> None:
        gasto = self.repo.obtener(gasto_id)
        if not gasto:
            raise KeyError(f"Gasto {gasto_id} no encontrado")
        if gasto.usuario_id != usuario_id:
            raise ValueError("No tenés permiso para eliminar este gasto")
        self.repo.eliminar(gasto_id)
