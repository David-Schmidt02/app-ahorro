"""Traduce las excepciones de dominio a respuestas HTTP con {detail}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    Conflicto,
    DomainError,
    NoAutorizado,
    NoEncontrado,
    ReglaDeNegocio,
    ServicioExternoNoDisponible,
)

logger = logging.getLogger("app.errores")

_STATUS: dict[type[DomainError], int] = {
    NoEncontrado: 404,
    Conflicto: 409,
    NoAutorizado: 401,
    ReglaDeNegocio: 422,
    ServicioExternoNoDisponible: 503,
}


def registrar_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _dominio(_request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=_STATUS.get(type(exc), 400), content={"detail": exc.mensaje})

    @app.exception_handler(RequestValidationError)
    async def _validacion(_request: Request, exc: RequestValidationError) -> JSONResponse:
        primero = exc.errors()[0]
        campo = ".".join(str(parte) for parte in primero["loc"] if parte != "body")
        mensaje = primero["msg"].removeprefix("Value error, ")
        return JSONResponse(status_code=422, content={"detail": f"{campo}: {mensaje}" if campo else mensaje})

    @app.exception_handler(Exception)
    async def _inesperado(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Error no controlado en %s", request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})
