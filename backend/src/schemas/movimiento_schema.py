"""Schemas de Pydantic para Movimiento."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from src.domain.enums import TipoMovimiento, Moneda


class MovimientoBase(BaseModel):
    """Schema base para Movimiento."""
    monto: Decimal = Field(..., gt=0)
    moneda: Moneda
    tipo: TipoMovimiento
    motivo: Optional[str] = None
    nota: Optional[str] = None


class MovimientoCreate(MovimientoBase):
    """Schema para crear un Movimiento."""
    objetivo_id: int = Field(..., gt=0)


class MovimientoUpdate(BaseModel):
    """Schema para actualizar un Movimiento."""
    monto: Optional[Decimal] = Field(None, gt=0)
    moneda: Optional[Moneda] = None
    tipo: Optional[TipoMovimiento] = None
    motivo: Optional[str] = None
    nota: Optional[str] = None


class MovimientoResponse(MovimientoBase):
    """Schema para respuesta de Movimiento."""
    id: int
    usuario_id: int
    objetivo_id: int
    fecha: datetime

    class Config:
        from_attributes = True


class MovimientoWithUsuario(MovimientoResponse):
    """Schema para Movimiento con información del usuario."""
    usuario_nombre: str


class MovimientoWithObjetivo(MovimientoResponse):
    """Schema para Movimiento con información del objetivo."""
    objetivo_nombre: str
