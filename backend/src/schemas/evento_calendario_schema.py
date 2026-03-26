"""Schemas Pydantic para EventoCalendario."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class EventoCalendarioCreate(BaseModel):
    titulo: str
    tipo: str
    fecha: date
    hora: Optional[str] = None
    foto: Optional[str] = None


class EventoCalendarioResponse(BaseModel):
    id: int
    titulo: str
    tipo: str
    fecha: date
    hora: Optional[str]
    foto: Optional[str]
    usuario_id: int
    creado_en: datetime

    model_config = {"from_attributes": True}
