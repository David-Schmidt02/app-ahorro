"""Vistas del mes: resumen y calendario."""
from fastapi import APIRouter

from app.dependencies import DbDep, ProgramadosDep, ResumenDep
from app.schemas.comunes import Mes
from app.schemas.eventos import CalendarioOut
from app.schemas.resumen import ResumenOut
from app.services.evento_service import EventoService

router = APIRouter(tags=["Mes"])


@router.get("/resumen", response_model=ResumenOut)
def resumen(mes: Mes, servicio: ResumenDep) -> ResumenOut:
    return servicio.del_mes(mes)


@router.get("/calendario", response_model=CalendarioOut)
def calendario(mes: Mes, db: DbDep, programados: ProgramadosDep) -> CalendarioOut:
    return CalendarioOut(mes=mes, vencimientos=programados.vencimientos(mes), eventos=EventoService(db).del_mes(mes))
