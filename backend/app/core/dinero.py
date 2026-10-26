"""Conversión entre montos decimales de la API y centavos enteros de la base."""
from decimal import ROUND_HALF_UP, Decimal


def a_centavos(monto: Decimal | float) -> int:
    return int((Decimal(str(monto)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def a_pesos(centavos: int | None) -> float | None:
    return None if centavos is None else centavos / 100


def convertir_a_ars(centavos: int, cotizacion: float) -> int:
    return int((Decimal(centavos) * Decimal(str(cotizacion))).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
