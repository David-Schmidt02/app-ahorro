from pydantic import BaseModel, Field

from app.core.dinero import a_pesos
from app.models import Categoria, TipoMovimiento
from app.schemas.comunes import MontoNoNegativo

_COLOR = r"^#[0-9a-fA-F]{6}$"
_ICONO = r"^[a-z0-9-]{1,30}$"


class CategoriaIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    icono: str = Field(pattern=_ICONO, examples=["shopping-cart"])
    color: str = Field(pattern=_COLOR)
    tipo: TipoMovimiento
    presupuesto: MontoNoNegativo | None = None


class CategoriaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=40)
    icono: str | None = Field(None, pattern=_ICONO)
    color: str | None = Field(None, pattern=_COLOR)
    presupuesto: MontoNoNegativo | None = None
    orden: int | None = None
    activa: bool | None = None


class CategoriaBreve(BaseModel):
    id: int
    nombre: str
    icono: str
    color: str

    @classmethod
    def desde(cls, c: Categoria) -> "CategoriaBreve":
        return cls(id=c.id, nombre=c.nombre, icono=c.icono, color=c.color)


class CategoriaOut(CategoriaBreve):
    tipo: TipoMovimiento
    presupuesto: float | None
    orden: int
    activa: bool

    @classmethod
    def desde(cls, c: Categoria) -> "CategoriaOut":
        return cls(
            id=c.id, nombre=c.nombre, icono=c.icono, color=c.color, tipo=c.tipo,
            presupuesto=a_pesos(c.presupuesto_centavos), orden=c.orden, activa=c.activa,
        )
