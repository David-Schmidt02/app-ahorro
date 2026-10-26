"""Cotización del dólar blue, cacheada en la base para no depender siempre de la API."""
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import ServicioExternoNoDisponible
from app.models import Cotizacion

ObtenerCotizacion = Callable[[], tuple[float, float]]
"""Devuelve (compra, venta) en pesos por dólar."""


def obtener_cotizacion_blue() -> tuple[float, float]:
    respuesta = httpx.get(get_settings().dolar_api_url, timeout=5)
    respuesta.raise_for_status()
    datos = respuesta.json()
    return float(datos["compra"]), float(datos["venta"])


def _ahora() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class CotizacionService:
    def __init__(self, db: Session, obtener: ObtenerCotizacion) -> None:
        self.db = db
        self.obtener = obtener

    def actual(self) -> Cotizacion:
        """La última guardada si sigue vigente; si no, una nueva. Si la API falla, la última conocida."""
        ultima = self.db.scalar(select(Cotizacion).order_by(Cotizacion.obtenida_en.desc()).limit(1))
        vigencia = timedelta(hours=get_settings().cotizacion_vigencia_horas)
        if ultima and _ahora() - ultima.obtenida_en < vigencia:
            return ultima
        try:
            compra, venta = self.obtener()
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
            if ultima:
                return ultima
            raise ServicioExternoNoDisponible(
                "No se pudo obtener la cotización del dólar. Cargala a mano en el movimiento."
            ) from exc
        nueva = Cotizacion(compra=compra, venta=venta, fuente="dolarapi.com (blue)", obtenida_en=_ahora())
        self.db.add(nueva)
        self.db.commit()
        return nueva

    def venta(self) -> float:
        return self.actual().venta
