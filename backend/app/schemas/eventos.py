from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models import TipoEvento
from app.schemas.programados import VencimientoOut


class EventoIn(BaseModel):
    titulo: str = Field(min_length=1, max_length=80)
    tipo: TipoEvento
    fecha: date
    hora: str | None = Field(None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    anual: bool = False


class EventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    tipo: TipoEvento
    fecha: date
    hora: str | None
    anual: bool


class EventoDelMes(EventoOut):
    dia: date = Field(description="Fecha en el mes consultado; en los anuales, el aniversario de ese año")


class CalendarioOut(BaseModel):
    mes: str
    vencimientos: list[VencimientoOut]
    eventos: list[EventoDelMes]
