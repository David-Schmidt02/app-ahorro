"""Calendario .ics de la casa (vencimientos y eventos) para suscribirse desde Google Calendar o el iPhone."""
import hashlib
import hmac
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from icalendar import Alarm, Calendar, Event
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import NoAutorizado
from app.core.fechas import sumar_meses
from app.models import Evento, Moneda, TipoMovimiento
from app.schemas.programados import VencimientoOut
from app.services.programado_service import ProgramadoService

MESES_ATRAS = 1
MESES_ADELANTE = 12
# Aviso el día anterior a las 9 (el evento empieza a las 0 del día del vencimiento)
AVISO_ANTES = timedelta(hours=15)


def clave_suscripcion() -> str:
    """Derivada de SECRET_KEY: el enlace no necesita sesión y cambia si se cambia la clave."""
    return hmac.new(get_settings().secret_key.encode(), b"calendario-ics", hashlib.sha256).hexdigest()[:32]


def validar_clave(clave: str) -> None:
    if not hmac.compare_digest(clave, clave_suscripcion()):
        raise NoAutorizado("El enlace del calendario no es válido")


def _importe(v: VencimientoOut) -> str:
    texto = f"{v.monto:,.0f}".replace(",", ".")
    return f"US$ {texto}" if v.moneda == Moneda.USD else f"$ {texto}"


class SuscripcionService:
    def __init__(self, db: Session, programados: ProgramadoService) -> None:
        self.db = db
        self.programados = programados

    def ics(self, hoy: date) -> bytes:
        calendario = Calendar()
        calendario.add("prodid", "-//Ahorro de la casa//es-AR")
        calendario.add("version", "2.0")
        calendario.add("x-wr-calname", "Ahorro")
        calendario.add("x-wr-timezone", get_settings().zona_horaria)
        calendario.add("refresh-interval", timedelta(hours=6), parameters={"VALUE": "DURATION"})
        calendario.add("x-published-ttl", "PT6H")
        inicio = sumar_meses(hoy.replace(day=1), -MESES_ATRAS)
        for n in range(MESES_ATRAS + MESES_ADELANTE + 1):
            mes = sumar_meses(inicio, n).strftime("%Y-%m")
            for v in self.programados.vencimientos(mes):
                calendario.add_component(self._vencimiento(v, mes))
        for e in self.db.scalars(select(Evento)):
            calendario.add_component(self._evento(e))
        return calendario.to_ical()

    @staticmethod
    def _vencimiento(v: VencimientoOut, mes: str) -> Event:
        es_cobro = v.tipo == TipoMovimiento.INGRESO
        nombre = f"{v.nombre} {v.cuota}/{v.cuotas}" if v.cuotas else v.nombre
        estado = "Cobrado" if es_cobro else "Pagado"
        evento = Event()
        evento.add("uid", f"vencimiento-{v.programado_id}-{mes}@ahorro")
        evento.add("summary", f"{'✓ ' if v.pagado else ''}{'Cobro' if es_cobro else 'Vence'}: {nombre} ({_importe(v)})")
        evento.add("description", f"{v.categoria.nombre}. {estado if v.pagado else 'Se marca como hecho desde la app Ahorro.'}")
        evento.add("dtstart", v.fecha)
        evento.add("dtend", v.fecha + timedelta(days=1))
        evento.add("dtstamp", datetime.now(ZoneInfo("UTC")))
        evento.add("transp", "TRANSPARENT")
        if not v.pagado and not es_cobro:
            aviso = Alarm()
            aviso.add("action", "DISPLAY")
            aviso.add("description", f"Mañana vence {nombre}")
            aviso.add("trigger", -AVISO_ANTES)
            evento.add_component(aviso)
        return evento

    @staticmethod
    def _evento(e: Evento) -> Event:
        evento = Event()
        evento.add("uid", f"evento-{e.id}@ahorro")
        evento.add("summary", e.titulo)
        evento.add("dtstamp", datetime.now(ZoneInfo("UTC")))
        if e.hora:
            hora, minuto = (int(x) for x in e.hora.split(":"))
            comienzo = datetime(e.fecha.year, e.fecha.month, e.fecha.day, hora, minuto, tzinfo=ZoneInfo(get_settings().zona_horaria))
            evento.add("dtstart", comienzo)
            evento.add("dtend", comienzo + timedelta(hours=1))
        else:
            evento.add("dtstart", e.fecha)
            evento.add("dtend", e.fecha + timedelta(days=1))
        if e.anual:
            evento.add("rrule", {"freq": "yearly"})
        return evento
