from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.models import Moneda
from app.schemas.categorias import CategoriaBreve
from app.schemas.programados import VencimientoOut


class CategoriaDelMes(BaseModel):
    categoria: CategoriaBreve
    gastado: float
    gastado_programado: float = Field(description="Parte de lo gastado que salda pagos programados")
    pendiente: float
    presupuesto: float | None = Field(description="Tope del mes; en las categorías con cupo, el cupo semanal llevado al mes")
    cupo_semanal: float | None


class SemanaDeCupo(BaseModel):
    """Una categoría con cupo en una semana del mes."""

    cupo: float = Field(description="Lo que corresponde a esta semana (menos si la semana está partida entre dos meses)")
    arrastre: float = Field(description="Lo que sobró (+) o se pasaron (−) la semana anterior; vuelve a cero cada mes")
    disponible: float = Field(description="Cupo de la semana menos lo que se pasaron la anterior; lo que sobró no se suma: va al ahorro")
    gastado: float
    restante: float = Field(description="Negativo si se pasaron")


class CupoDeLaSemana(SemanaDeCupo):
    categoria: CategoriaBreve
    cupo_semanal: float


class CuposOut(BaseModel):
    desde: date
    hasta: date
    cupos: list[CupoDeLaSemana]


class ResumenOut(BaseModel):
    """Todo en pesos; los movimientos en dólares ya vienen convertidos."""

    mes: str
    ingresos: float
    gastos: float
    ahorro: float
    pendiente_ingresos: float
    pendiente_gastos: float
    reservado_cupos: float = Field(description="Lo que falta gastar de los cupos semanales hasta fin de mes")
    proyeccion: float
    objetivo: float | None
    objetivo_moneda: Moneda
    objetivo_ars: float | None
    gastos_mes_anterior: float
    categorias: list[CategoriaDelMes]
    vencimientos: list[VencimientoOut]
    cupos: CuposOut | None = Field(description="Solo en el mes en curso y si hay categorías con cupo")


class MesEvolucion(BaseModel):
    mes: str
    ingresos: float
    gastos: float
    ahorro: float


class EvolucionOut(BaseModel):
    meses: list[MesEvolucion]
    objetivo_ars: float | None


class DiaGasto(BaseModel):
    fecha: date
    gastos: float
    fijos: float = Field(description="Parte de lo gastado que salda pagos programados (alquiler, servicios, cuotas…)")


class DiarioOut(BaseModel):
    dias: list[DiaGasto]


class SemanaDelMes(BaseModel):
    desde: date
    hasta: date
    estado: Literal["pasada", "actual", "futura"]


class CupoDelMes(BaseModel):
    categoria: CategoriaBreve
    cupo_semanal: float
    semanas: list[SemanaDeCupo] = Field(description="Una por cada semana del mes, en el mismo orden")


class CuposDelMesOut(BaseModel):
    mes: str
    semanas: list[SemanaDelMes]
    cupos: list[CupoDelMes]
    aporte: float = Field(description="Lo que sobró (+) o se pasaron (−) en las semanas ya terminadas: va o sale del ahorro")
    objetivo_ars: float | None
