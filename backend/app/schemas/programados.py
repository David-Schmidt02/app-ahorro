from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.core.dinero import a_pesos
from app.models import Frecuencia, Moneda, Programado, TipoMovimiento
from app.schemas.categorias import CategoriaBreve
from app.schemas.comunes import Mes, MontoPositivo


class ProgramadoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=60)
    tipo: TipoMovimiento
    categoria_id: int
    monto: MontoPositivo
    moneda: Moneda = Moneda.ARS
    frecuencia: Frecuencia
    dia: int | None = Field(None, ge=1, le=31, description="Día del mes, solo para mensuales")
    fecha: date | None = Field(None, description="Fecha del pago, solo para únicos")
    desde: Mes | None = Field(None, description="Primer mes en que aplica; por defecto el actual")

    @model_validator(mode="after")
    def _segun_frecuencia(self) -> "ProgramadoIn":
        if self.frecuencia is Frecuencia.MENSUAL and self.dia is None:
            raise ValueError("Un pago mensual necesita el día de vencimiento")
        if self.frecuencia is Frecuencia.UNICA and self.fecha is None:
            raise ValueError("Un pago único necesita la fecha")
        return self


class ProgramadoUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=60)
    categoria_id: int | None = None
    monto: MontoPositivo | None = None
    moneda: Moneda | None = None
    dia: int | None = Field(None, ge=1, le=31)
    fecha: date | None = None
    hasta: Mes | None = Field(None, description="Último mes en que aplica; null lo deja vigente")


class ProgramadoOut(BaseModel):
    id: int
    nombre: str
    tipo: TipoMovimiento
    categoria: CategoriaBreve
    monto: float
    moneda: Moneda
    frecuencia: Frecuencia
    dia: int | None
    fecha: date | None
    desde: str
    hasta: str | None

    @classmethod
    def desde_modelo(cls, p: Programado) -> "ProgramadoOut":
        return cls(
            id=p.id, nombre=p.nombre, tipo=p.tipo, categoria=CategoriaBreve.desde(p.categoria),
            monto=a_pesos(p.monto_centavos), moneda=p.moneda, frecuencia=p.frecuencia,
            dia=p.dia, fecha=p.fecha, desde=p.desde.strftime("%Y-%m"),
            hasta=p.hasta.strftime("%Y-%m") if p.hasta else None,
        )


class PagarIn(BaseModel):
    mes: Mes
    monto: MontoPositivo | None = Field(None, description="Monto real; por defecto el estimado")
    fecha: date | None = Field(None, description="Por defecto la fecha de vencimiento")
    cotizacion: float | None = Field(None, gt=0)


class VencimientoOut(BaseModel):
    """Un programado en un mes concreto, pagado o no."""

    programado_id: int
    nombre: str
    tipo: TipoMovimiento
    categoria: CategoriaBreve
    fecha: date
    monto: float
    moneda: Moneda
    monto_ars: float
    pagado: bool
    movimiento_id: int | None
