from datetime import datetime

from pydantic import BaseModel

from app.models import Moneda
from app.schemas.comunes import MontoNoNegativo


class PreferenciasIn(BaseModel):
    objetivo: MontoNoNegativo | None = None
    objetivo_moneda: Moneda = Moneda.ARS


class PreferenciasOut(BaseModel):
    objetivo: float | None
    objetivo_moneda: Moneda


class CotizacionOut(BaseModel):
    compra: float
    venta: float
    fuente: str
    obtenida_en: datetime
