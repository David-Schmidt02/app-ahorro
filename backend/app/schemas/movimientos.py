from datetime import date

from pydantic import BaseModel, Field

from app.core.dinero import a_pesos
from app.models import Moneda, Movimiento, TipoMovimiento
from app.schemas.categorias import CategoriaBreve
from app.schemas.comunes import MontoPositivo


class MovimientoIn(BaseModel):
    tipo: TipoMovimiento
    monto: MontoPositivo
    moneda: Moneda = Moneda.ARS
    cotizacion: float | None = Field(None, gt=0, description="Pesos por dólar; si falta se usa el blue")
    categoria_id: int
    descripcion: str | None = Field(None, max_length=120)
    fecha: date


class MovimientoUpdate(BaseModel):
    monto: MontoPositivo | None = None
    moneda: Moneda | None = None
    cotizacion: float | None = Field(None, gt=0)
    categoria_id: int | None = None
    descripcion: str | None = Field(None, max_length=120)
    fecha: date | None = None


class MovimientoOut(BaseModel):
    id: int
    tipo: TipoMovimiento
    monto: float
    moneda: Moneda
    cotizacion: float | None
    monto_ars: float
    categoria: CategoriaBreve
    descripcion: str | None
    fecha: date
    programado_id: int | None
    creado_por: str | None

    @classmethod
    def desde(cls, m: Movimiento) -> "MovimientoOut":
        return cls(
            id=m.id, tipo=m.tipo, monto=a_pesos(m.monto_centavos), moneda=m.moneda,
            cotizacion=m.cotizacion, monto_ars=a_pesos(m.monto_ars_centavos),
            categoria=CategoriaBreve.desde(m.categoria), descripcion=m.descripcion, fecha=m.fecha,
            programado_id=m.programado_id, creado_por=m.creado_por.nombre if m.creado_por else None,
        )
