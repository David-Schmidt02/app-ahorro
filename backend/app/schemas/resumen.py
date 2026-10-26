from pydantic import BaseModel, Field

from app.models import Moneda
from app.schemas.categorias import CategoriaBreve
from app.schemas.programados import VencimientoOut


class CategoriaDelMes(BaseModel):
    categoria: CategoriaBreve
    gastado: float
    gastado_programado: float = Field(description="Parte de lo gastado que salda pagos programados")
    pendiente: float
    presupuesto: float | None


class ResumenOut(BaseModel):
    """Todo en pesos; los movimientos en dólares ya vienen convertidos."""

    mes: str
    ingresos: float
    gastos: float
    ahorro: float
    pendiente_ingresos: float
    pendiente_gastos: float
    proyeccion: float
    objetivo: float | None
    objetivo_moneda: Moneda
    objetivo_ars: float | None
    gastos_mes_anterior: float
    categorias: list[CategoriaDelMes]
    vencimientos: list[VencimientoOut]


class MesEvolucion(BaseModel):
    mes: str
    ingresos: float
    gastos: float
    ahorro: float


class EvolucionOut(BaseModel):
    meses: list[MesEvolucion]
    objetivo_ars: float | None
