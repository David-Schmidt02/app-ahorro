"""Pydantic schemas para Propiedad."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from src.domain.enums import EstadoPropiedad, Moneda


class PropiedadCreate(BaseModel):
    """Schema para crear una nueva propiedad."""
    url: str = Field(..., min_length=1, max_length=500)
    estado: EstadoPropiedad = EstadoPropiedad.VISTA
    precio: Optional[Decimal] = None
    moneda: Optional[Moneda] = None
    expensas: Optional[Decimal] = None
    moneda_expensas: Optional[Moneda] = None
    direccion: Optional[str] = Field(None, max_length=500)
    inmobiliaria: Optional[str] = Field(None, max_length=200)
    contacto: Optional[str] = Field(None, max_length=100)
    metros_cuadrados: Optional[Decimal] = None
    cuartos: Optional[int] = None
    banios: Optional[int] = None
    notas: Optional[str] = None


class PropiedadUpdate(BaseModel):
    """Schema para actualizar una propiedad."""
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    estado: Optional[EstadoPropiedad] = None
    precio: Optional[Decimal] = None
    moneda: Optional[Moneda] = None
    expensas: Optional[Decimal] = None
    moneda_expensas: Optional[Moneda] = None
    direccion: Optional[str] = Field(None, max_length=500)
    inmobiliaria: Optional[str] = Field(None, max_length=200)
    contacto: Optional[str] = Field(None, max_length=100)
    metros_cuadrados: Optional[Decimal] = None
    cuartos: Optional[int] = None
    banios: Optional[int] = None
    notas: Optional[str] = None


class PropiedadResponse(BaseModel):
    """Schema de respuesta para una propiedad."""
    id: int
    url: str
    creado_por_id: int
    estado: EstadoPropiedad
    precio: Optional[Decimal] = None
    moneda: Optional[Moneda] = None
    expensas: Optional[Decimal] = None
    moneda_expensas: Optional[Moneda] = None
    direccion: Optional[str] = None
    inmobiliaria: Optional[str] = None
    contacto: Optional[str] = None
    metros_cuadrados: Optional[Decimal] = None
    cuartos: Optional[int] = None
    banios: Optional[int] = None
    notas: Optional[str] = None
    en_top: bool
    posicion_top: Optional[int] = None
    creado_en: datetime

    model_config = {"from_attributes": True}


class ReordenarTopRequest(BaseModel):
    """Schema para reordenar el Top 10."""
    ids: list[int] = Field(..., min_length=1, max_length=10)
