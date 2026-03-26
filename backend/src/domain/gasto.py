"""Entidad de dominio Gasto."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from src.domain.enums import Moneda


CATEGORIAS_VALIDAS = {
    'comida', 'transporte', 'entretenimiento', 'salud',
    'hogar', 'ropa', 'viajes', 'tecnologia', 'regalos', 'otros'
}


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
    ):
        self.id = id
        self.monto = monto
        self.moneda = moneda
        self.categoria = categoria.lower()
        self.usuario_id = usuario_id
        self.descripcion = descripcion
        self.fecha = fecha or datetime.now()

        self._validar()

    def _validar(self) -> None:
        if self.monto <= 0:
            raise ValueError("El monto del gasto debe ser mayor a cero")
        if self.categoria not in CATEGORIAS_VALIDAS:
            raise ValueError(f"Categoría inválida: {self.categoria}")

    def __repr__(self) -> str:
        return f"<Gasto(id={self.id}, monto={self.monto} {self.moneda}, categoria={self.categoria})>"
