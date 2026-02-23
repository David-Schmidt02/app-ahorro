"""Schemas de Pydantic para Estadísticas."""
from decimal import Decimal
from pydantic import BaseModel


class EstadisticasResponse(BaseModel):
    """Schema para estadísticas globales del usuario."""
    # Totales
    total_objetivos: int
    objetivos_activos: int
    objetivos_completados: int
    objetivos_pausados: int

    # Montos
    monto_total_objetivos: Decimal
    monto_total_guardado: Decimal
    monto_restante: Decimal
    progreso_global_porcentaje: Decimal

    # Movimientos
    total_movimientos: int
    total_aportes: int
    total_retiros: int
    suma_aportes: Decimal
    suma_retiros: Decimal

    # Promedios
    promedio_aporte: Decimal
    promedio_cumplimiento_objetivos: Decimal  # % promedio de cumplimiento

    class Config:
        from_attributes = True
