"""Schemas de Pydantic para TasaCambio."""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from src.domain.enums import TipoCotizacion


class TasaCambioBase(BaseModel):
    """Schema base para TasaCambio."""
    moneda_origen: str = Field(..., min_length=3, max_length=3)
    moneda_destino: str = Field(..., min_length=3, max_length=3)
    tasa: Decimal = Field(..., gt=0)
    tipo_cotizacion: TipoCotizacion
    fuente: str


class TasaCambioCreate(TasaCambioBase):
    """Schema para crear una TasaCambio."""
    pass


class TasaCambioResponse(TasaCambioBase):
    """Schema para respuesta de TasaCambio."""
    id: int
    fecha: datetime

    class Config:
        from_attributes = True
