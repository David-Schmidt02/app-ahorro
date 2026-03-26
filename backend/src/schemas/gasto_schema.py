"""Schemas Pydantic para Gasto."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class GastoCreate(BaseModel):
    monto: float
    moneda: str = "ARS"
    categoria: str
    descripcion: Optional[str] = None
    fecha: Optional[datetime] = None

    @field_validator('monto')
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        return v

    @field_validator('moneda')
    @classmethod
    def moneda_valida(cls, v):
        if v not in ('ARS', 'USD'):
            raise ValueError("Moneda inválida")
        return v


class GastoResponse(BaseModel):
    id: int
    monto: float
    moneda: str
    categoria: str
    descripcion: Optional[str]
    fecha: datetime
    usuario_id: int

    model_config = {"from_attributes": True}
