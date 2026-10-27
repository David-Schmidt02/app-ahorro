from datetime import date

from pydantic import BaseModel, Field, field_validator


class CalendarioExternoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    url: str = Field(min_length=10, max_length=500, description="Dirección iCal (https:// o webcal://)")

    @field_validator("url")
    @classmethod
    def _https(cls, url: str) -> str:
        url = url.strip()
        if url.startswith("webcal://"):
            url = "https://" + url.removeprefix("webcal://")
        if not url.startswith("https://"):
            raise ValueError("La dirección tiene que empezar con https:// o webcal://")
        return url


class CalendarioExternoOut(BaseModel):
    id: int
    nombre: str
    origen: str = Field(description="Solo el dominio: la dirección completa es secreta")


class EventoExterno(BaseModel):
    titulo: str
    dia: date
    hora: str | None
    calendario: str


class EventosExternos(BaseModel):
    eventos: list[EventoExterno] = []
    con_error: list[str] = Field([], description="Calendarios que no se pudieron leer")


class SuscripcionOut(BaseModel):
    ruta: str = Field(description="Ruta del calendario .ics, con la clave; se completa con el dominio de la app")
