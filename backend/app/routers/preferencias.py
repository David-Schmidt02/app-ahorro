from fastapi import APIRouter

from app.core.dinero import a_pesos
from app.dependencies import CotizacionDep, DbDep
from app.models import Preferencias
from app.schemas.preferencias import CotizacionOut, PreferenciasIn, PreferenciasOut
from app.services.preferencias_service import PreferenciasService

router = APIRouter(tags=["Preferencias"])


def _salida(p: Preferencias) -> PreferenciasOut:
    return PreferenciasOut(objetivo=a_pesos(p.objetivo_centavos), objetivo_moneda=p.objetivo_moneda)


@router.get("/preferencias", response_model=PreferenciasOut)
def obtener(db: DbDep) -> PreferenciasOut:
    return _salida(PreferenciasService(db).obtener())


@router.put("/preferencias", response_model=PreferenciasOut)
def guardar(datos: PreferenciasIn, db: DbDep) -> PreferenciasOut:
    return _salida(PreferenciasService(db).guardar(datos))


@router.get("/cotizacion", response_model=CotizacionOut)
def cotizacion(servicio: CotizacionDep) -> CotizacionOut:
    c = servicio.actual()
    return CotizacionOut(compra=c.compra, venta=c.venta, fuente=c.fuente, obtenida_en=c.obtenida_en)
