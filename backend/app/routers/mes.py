"""Vistas del mes: resumen y calendario."""
from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import DbDep, ProgramadosDep, ResumenDep
from app.schemas.comunes import Mes
from app.schemas.eventos import CalendarioOut
from app.schemas.resumen import EvolucionOut, ResumenOut
from app.services.evento_service import EventoService

router = APIRouter(tags=["Mes"])


@router.get("/resumen", response_model=ResumenOut)
def resumen(mes: Mes, servicio: ResumenDep) -> ResumenOut:
    return servicio.del_mes(mes)


@router.get("/evolucion", response_model=EvolucionOut)
def evolucion(hasta: Mes, servicio: ResumenDep, meses: Annotated[int, Query(ge=2, le=24)] = 6) -> EvolucionOut:
    return servicio.evolucion(hasta, meses)


@router.get("/calendario", response_model=CalendarioOut)
def calendario(mes: Mes, db: DbDep, programados: ProgramadosDep) -> CalendarioOut:
    return CalendarioOut(mes=mes, vencimientos=programados.vencimientos(mes), eventos=EventoService(db).del_mes(mes))
