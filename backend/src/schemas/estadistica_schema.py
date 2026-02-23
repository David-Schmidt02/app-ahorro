from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class EstadisticasResponse(BaseModel):
    """Schema para estadísticas globales del usuario."""
    # Totales
    total_objetivos: int
    objetivos_activos: int
    objetivos_completados: int
    objetivos_pausados: int

    # Montos
    monto_total_objetivos: float
    monto_total_guardado: float
    monto_restante: float
    progreso_global_porcentaje: float

    # Movimientos
    total_movimientos: int
    total_aportes: int
    total_retiros: int
    suma_aportes: float
    suma_retiros: float

    # Promedios
    promedio_aporte: float
    promedio_cumplimiento_objetivos: float  # % promedio de cumplimiento
    tasa_dolar_blue: Optional[float] = None

    class Config:
        from_attributes = True
