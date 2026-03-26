"""Schemas Pydantic para HorarioUsuario."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class HorarioUpdate(BaseModel):
    data: str


class HorarioResponse(BaseModel):
    id: int
    usuario_id: int
    nombre_usuario: Optional[str]
    data: str
    actualizado_en: datetime

    model_config = {"from_attributes": True}
