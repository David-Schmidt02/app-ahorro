"""Utilidades de meses ('YYYY-MM')."""
import calendar
from datetime import date

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


def dia_en_mes(inicio: date, dia: int) -> date:
    """El día pedido dentro del mes, o el último si el mes es más corto (ej. 31 en febrero)."""
    ultimo = calendar.monthrange(inicio.year, inicio.month)[1]
    return inicio.replace(day=min(dia, ultimo))
