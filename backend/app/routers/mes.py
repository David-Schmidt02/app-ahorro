"""Vistas del mes: resumen, evolución, calendario y próximos días."""
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import DbDep, ProgramadosDep, ResumenDep
from app.schemas.comunes import Mes
from app.schemas.eventos import CalendarioOut, ProximosOut
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


@router.get("/proximos", response_model=ProximosOut)
def proximos(
    desde: date, db: DbDep, programados: ProgramadosDep, dias: Annotated[int, Query(ge=1, le=31)] = 7
) -> ProximosOut:
    """Pagos pendientes y eventos de `dias` días a partir de `desde` (incluido), aunque cambie el mes."""
    hasta = desde + timedelta(days=dias - 1)
    meses = sorted({(desde + timedelta(days=n)).strftime("%Y-%m") for n in range(dias)})
    eventos_servicio = EventoService(db)
    vencimientos = [
        v for mes in meses for v in programados.vencimientos(mes) if not v.pagado and desde <= v.fecha <= hasta
    ]
    eventos = [e for mes in meses for e in eventos_servicio.del_mes(mes) if desde <= e.dia <= hasta]
    return ProximosOut(desde=desde, hasta=hasta, vencimientos=vencimientos, eventos=eventos)
