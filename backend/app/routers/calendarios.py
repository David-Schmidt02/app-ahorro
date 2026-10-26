"""Calendarios de afuera que se muestran en la app, y el .ics de la app para suscribirse desde el teléfono."""
from datetime import date

from fastapi import APIRouter, Response, status

from app.dependencies import CalendariosExternosDep, DbDep, ProgramadosDep
from app.schemas.calendarios import CalendarioExternoIn, CalendarioExternoOut, SuscripcionOut
from app.services.suscripcion_service import SuscripcionService, clave_suscripcion, validar_clave

router = APIRouter(tags=["Calendarios"])
publico = APIRouter(tags=["Calendarios"])


@router.get("/calendarios-externos", response_model=list[CalendarioExternoOut])
def listar(servicio: CalendariosExternosDep) -> list[CalendarioExternoOut]:
    return servicio.listar()


@router.post("/calendarios-externos", response_model=CalendarioExternoOut, status_code=status.HTTP_201_CREATED)
def agregar(datos: CalendarioExternoIn, servicio: CalendariosExternosDep) -> CalendarioExternoOut:
    return servicio.agregar(datos)


@router.delete("/calendarios-externos/{calendario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(calendario_id: int, servicio: CalendariosExternosDep) -> None:
    servicio.eliminar(calendario_id)


@router.get("/calendario/suscripcion", response_model=SuscripcionOut)
def suscripcion() -> SuscripcionOut:
    return SuscripcionOut(ruta=f"/api/calendario.ics?clave={clave_suscripcion()}")


@publico.get("/calendario.ics", response_class=Response)
def ics(clave: str, db: DbDep, programados: ProgramadosDep) -> Response:
    """Sin sesión (los calendarios no mandan tokens): lo protege la clave del enlace."""
    validar_clave(clave)
    contenido = SuscripcionService(db, programados).ics(date.today())
    return Response(contenido, media_type="text/calendar; charset=utf-8", headers={"Cache-Control": "private, max-age=900"})
