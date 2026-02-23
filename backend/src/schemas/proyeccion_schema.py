"""Schemas de Pydantic para Proyecciones."""
from decimal import Decimal
from datetime import date
from typing import Optional
from pydantic import BaseModel


class ProyeccionResponse(BaseModel):
    """Schema para proyección de cumplimiento de un objetivo."""
    objetivo_id: int
    monto_restante: float
    promedio_mensual_aportes: float
    meses_estimados_restantes: Optional[int]
    fecha_cumplimiento_estimada: Optional[date]
    mensaje: str

    class Config:
        from_attributes = True
