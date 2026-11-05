"""Utilidades de meses ('YYYY-MM') y semanas."""
import calendar
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import get_settings

from app.core.exceptions import ReglaDeNegocio


def parsear_mes(mes: str) -> date:
    """Devuelve el primer día del mes 'YYYY-MM'."""
    try:
        anio, numero = (int(parte) for parte in mes.split("-"))
        return date(anio, numero, 1)
    except ValueError as exc:
        raise ReglaDeNegocio(f"Mes inválido: {mes!r} (formato YYYY-MM)") from exc


def siguiente_mes(inicio: date) -> date:
    return date(inicio.year + inicio.month // 12, inicio.month % 12 + 1, 1)


def mes_anterior(inicio: date) -> date:
    return date(inicio.year - (inicio.month == 1), (inicio.month - 2) % 12 + 1, 1)


def sumar_meses(inicio: date, meses: int) -> date:
    total = inicio.year * 12 + inicio.month - 1 + meses
    return date(total // 12, total % 12 + 1, 1)


def meses_entre(desde: date, hasta: date) -> int:
    """Meses de diferencia entre dos fechas (0 si son del mismo mes)."""
    return (hasta.year - desde.year) * 12 + hasta.month - desde.month


def dia_en_mes(inicio: date, dia: int) -> date:
    """El día pedido dentro del mes, o el último si el mes es más corto (ej. 31 en febrero)."""
    ultimo = calendar.monthrange(inicio.year, inicio.month)[1]
    return inicio.replace(day=min(dia, ultimo))


def hoy_local() -> date:
    """La fecha de hoy en la zona horaria de la casa (el servidor puede estar en UTC)."""
    return datetime.now(ZoneInfo(get_settings().zona_horaria)).date()


def semanas_del_mes(inicio: date) -> list[tuple[date, date]]:
    """Las semanas (de lunes a domingo) del mes, la primera y la última recortadas al mes."""
    fin = siguiente_mes(inicio) - timedelta(days=1)
    semanas = []
    desde = inicio
    while desde <= fin:
        hasta = min(desde + timedelta(days=6 - desde.weekday()), fin)
        semanas.append((desde, hasta))
        desde = hasta + timedelta(days=1)
    return semanas
