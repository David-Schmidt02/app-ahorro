"""Eventos de calendarios de afuera (iCal), descargados cada tanto y guardados en memoria."""
import logging
import time
from collections.abc import Callable
from datetime import date, datetime, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import httpx
import recurring_ical_events
from icalendar import Calendar
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import NoEncontrado, ReglaDeNegocio
from app.models import CalendarioExterno
from app.schemas.calendarios import CalendarioExternoIn, CalendarioExternoOut, EventoExterno, EventosExternos

logger = logging.getLogger(__name__)

DescargarIcs = Callable[[str], bytes]

# url -> (momento de la descarga, calendario); compartido entre requests
_cache: dict[str, tuple[float, Calendar]] = {}


def descargar_ics(url: str) -> bytes:
    respuesta = httpx.get(url, timeout=5, follow_redirects=True)
    respuesta.raise_for_status()
    return respuesta.content


class CalendarioExternoService:
    def __init__(self, db: Session, descargar: DescargarIcs) -> None:
        self.db = db
        self.descargar = descargar

    def listar(self) -> list[CalendarioExternoOut]:
        calendarios = self.db.scalars(select(CalendarioExterno).order_by(CalendarioExterno.id))
        return [CalendarioExternoOut(id=c.id, nombre=c.nombre, origen=urlparse(c.url).hostname or "") for c in calendarios]

    def agregar(self, datos: CalendarioExternoIn) -> CalendarioExternoOut:
        """Lo descarga una vez antes de guardarlo, para avisar enseguida si la dirección no sirve."""
        try:
            self._calendario(datos.url, forzar=True)
        except (httpx.HTTPError, ValueError) as exc:
            raise ReglaDeNegocio("No se pudo leer ese calendario: revisá que sea la dirección iCal completa") from exc
        calendario = CalendarioExterno(nombre=datos.nombre.strip(), url=datos.url)
        self.db.add(calendario)
        self.db.commit()
        return CalendarioExternoOut(id=calendario.id, nombre=calendario.nombre, origen=urlparse(calendario.url).hostname or "")

    def eliminar(self, calendario_id: int) -> None:
        calendario = self.db.get(CalendarioExterno, calendario_id)
        if calendario is None:
            raise NoEncontrado("El calendario no existe")
        _cache.pop(calendario.url, None)
        self.db.delete(calendario)
        self.db.commit()

    def eventos(self, desde: date, hasta: date) -> EventosExternos:
        """Eventos que empiezan entre `desde` y `hasta` (incluidos), con las repeticiones ya expandidas."""
        zona = ZoneInfo(get_settings().zona_horaria)
        resultado = EventosExternos()
        for c in self.db.scalars(select(CalendarioExterno)):
            try:
                ocurrencias = recurring_ical_events.of(self._calendario(c.url)).between(desde, hasta + timedelta(days=1))
            except (httpx.HTTPError, ValueError) as exc:
                logger.warning("No se pudo leer el calendario externo %s: %s", c.nombre, exc)
                resultado.con_error.append(c.nombre)
                continue
            for evento in ocurrencias:
                inicio = evento.decoded("DTSTART")
                if isinstance(inicio, datetime):
                    local = inicio.astimezone(zona) if inicio.tzinfo else inicio
                    dia, hora = local.date(), local.strftime("%H:%M")
                else:
                    dia, hora = inicio, None
                if desde <= dia <= hasta:
                    titulo = str(evento.get("SUMMARY", "")).strip() or "(sin título)"
                    resultado.eventos.append(EventoExterno(titulo=titulo, dia=dia, hora=hora, calendario=c.nombre))
        resultado.eventos.sort(key=lambda e: (e.dia, e.hora or "", e.titulo))
        return resultado

    def _calendario(self, url: str, forzar: bool = False) -> Calendar:
        guardado = _cache.get(url)
        vigencia = get_settings().calendario_externo_minutos * 60
        if guardado and not forzar and time.monotonic() - guardado[0] < vigencia:
            return guardado[1]
        try:
            calendario = Calendar.from_ical(self.descargar(url))
        except httpx.HTTPError:
            if guardado:
                return guardado[1]
            raise
        _cache[url] = (time.monotonic(), calendario)
        return calendario
