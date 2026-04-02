"""Entidad de dominio Gasto."""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from src.domain.enums import Moneda


CATEGORIAS_VALIDAS = {
    'comida', 'transporte', 'entretenimiento', 'salud',
    'hogar', 'ropa', 'viajes', 'tecnologia', 'regalos', 'otros'
}

SUBTIPOS_VALIDOS = {'regular', 'impuesto', 'hormiga'}


class Gasto:
    """Representa un gasto del día a día (sin objetivo asociado)."""

    def __init__(
        self,
        monto: Decimal,
        moneda: Moneda,
        categoria: str,
        usuario_id: int,
        descripcion: Optional[str] = None,
        id: Optional[int] = None,
        fecha: Optional[datetime] = None,
        subtipo: str = 'regular',
        fecha_pago: Optional[date] = None,
    ):
        self.id = id
        self.monto = monto
        self.moneda = moneda
        self.categoria = categoria.lower()
        self.usuario_id = usuario_id
        self.descripcion = descripcion
        self.fecha = fecha or datetime.now()
        self.subtipo = subtipo or 'regular'
        self.fecha_pago = fecha_pago

        self._validar()

    def _validar(self) -> None:
        if self.monto <= 0:
            raise ValueError("El monto del gasto debe ser mayor a cero")
        if self.categoria not in CATEGORIAS_VALIDAS:
            raise ValueError(f"Categoría inválida: {self.categoria}")
        if self.subtipo not in SUBTIPOS_VALIDOS:
            raise ValueError(f"Subtipo inválido: {self.subtipo}")

    def __repr__(self) -> str:
        return f"<Gasto(id={self.id}, monto={self.monto} {self.moneda}, categoria={self.categoria})>"
