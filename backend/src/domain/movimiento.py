"""Entidad de dominio Movimiento."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from src.domain.enums import TipoMovimiento, Moneda



class Movimiento:
    """Entidad de dominio que representa un movimiento financiero (aporte o retiro)."""

    def __init__(
        self,
        monto: Decimal,
        moneda: Moneda,
        tipo: TipoMovimiento,
        usuario_id: int,
        objetivo_id: int,
        motivo: Optional[str] = None,
        nota: Optional[str] = None,
        id: Optional[int] = None,
        fecha: Optional[datetime] = None
    ):
        self.id = id
        self.monto = monto
        self.moneda = moneda
        self.tipo = tipo
        self.usuario_id = usuario_id
        self.objetivo_id = objetivo_id
        self.motivo = motivo
        self.nota = nota
        self.fecha = fecha or datetime.now()

        self._validar_invariantes()

    def _validar_invariantes(self) -> None:
        """Valida las reglas de negocio invariantes de la entidad."""
        if self.monto <= 0:
            raise ValueError("El monto del movimiento debe ser mayor a cero")

        if self.usuario_id is None or self.usuario_id <= 0:
            raise ValueError("El movimiento debe estar asociado a un usuario válido")

        if self.objetivo_id is None or self.objetivo_id <= 0:
            raise ValueError("El movimiento debe estar asociado a un objetivo válido")

    def __repr__(self) -> str:
        return f"<Movimiento(id={self.id}, tipo={self.tipo}, monto={self.monto} {self.moneda}, objetivo_id={self.objetivo_id})>"
