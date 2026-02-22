from enum import Enum


class Moneda(str, Enum):
    """Enumeración de monedas soportadas."""
    USD = "USD"
    ARS = "ARS"


class EstadoObjetivo(str, Enum):
    """Estados posibles de un objetivo."""
    ACTIVO = "activo"
    COMPLETADO = "completado"
    PAUSADO = "pausado"


class TipoMovimiento(str, Enum):
    """Tipos de movimientos financieros."""
    APORTE = "aporte"
    RETIRO = "retiro"


class TipoCotizacion(str, Enum):
    """Tipos de cotización del dólar en Argentina."""
    BLUE = "blue"
    OFICIAL = "oficial"
    MEP = "mep"
