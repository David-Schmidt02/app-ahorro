"""Dependencias inyectables de los routers."""
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import NoAutorizado
from app.core.security import leer_token
from app.database import get_db
from app.models import Usuario
from app.services.calendario_externo_service import CalendarioExternoService, descargar_ics
from app.services.cotizacion_service import CotizacionService, obtener_cotizacion_blue
from app.services.movimiento_service import MovimientoService
from app.services.programado_service import ProgramadoService
from app.services.resumen_service import ResumenService

DbDep = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


def usuario_actual(
    db: DbDep, credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
) -> Usuario:
    if credenciales is None:
        raise NoAutorizado("Ingresá para continuar")
    usuario = db.get(Usuario, leer_token(credenciales.credentials))
    if usuario is None:
        raise NoAutorizado("La cuenta ya no existe")
    return usuario


UsuarioDep = Annotated[Usuario, Depends(usuario_actual)]


def cotizacion_service(db: DbDep) -> CotizacionService:
    return CotizacionService(db, obtener_cotizacion_blue)


CotizacionDep = Annotated[CotizacionService, Depends(cotizacion_service)]


def movimiento_service(db: DbDep, cotizaciones: CotizacionDep) -> MovimientoService:
    return MovimientoService(db, cotizaciones)


MovimientosDep = Annotated[MovimientoService, Depends(movimiento_service)]


def programado_service(db: DbDep, movimientos: MovimientosDep) -> ProgramadoService:
    return ProgramadoService(db, movimientos)


ProgramadosDep = Annotated[ProgramadoService, Depends(programado_service)]


def resumen_service(db: DbDep, programados: ProgramadosDep) -> ResumenService:
    return ResumenService(db, programados)


ResumenDep = Annotated[ResumenService, Depends(resumen_service)]


def calendario_externo_service(db: DbDep) -> CalendarioExternoService:
    return CalendarioExternoService(db, descargar_ics)


CalendariosExternosDep = Annotated[CalendarioExternoService, Depends(calendario_externo_service)]
