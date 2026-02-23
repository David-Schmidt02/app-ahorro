"""Schemas de Pydantic para Objetivo."""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from src.domain.enums import Moneda, EstadoObjetivo


class ObjetivoBase(BaseModel):
    """Schema base para Objetivo."""
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = None
    monto_objetivo: Decimal = Field(..., gt=0)
    moneda: Moneda
    fecha_limite: date


class ObjetivoCreate(ObjetivoBase):
    """Schema para crear un Objetivo."""
    es_prioritario: bool = False


class ObjetivoUpdate(BaseModel):
    """Schema para actualizar un Objetivo."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    descripcion: Optional[str] = None
    monto_objetivo: Optional[Decimal] = Field(None, gt=0)
    moneda: Optional[Moneda] = None
    fecha_limite: Optional[date] = None
    es_prioritario: Optional[bool] = None
    estado: Optional[EstadoObjetivo] = None


class ObjetivoResponse(ObjetivoBase):
    """Schema para respuesta de Objetivo."""
    id: int
    monto_actual: Decimal
    estado: EstadoObjetivo
    es_prioritario: bool
    completado: bool
    fecha_creacion: datetime
    porcentaje_completado: Decimal
    pago_mensual_requerido: Decimal

    class Config:
        from_attributes = True


class PostergarFechaRequest(BaseModel):
    """Schema para postergar fecha límite."""
    nueva_fecha: date = Field(..., description="Nueva fecha límite del objetivo")
