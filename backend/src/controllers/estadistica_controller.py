"""Controller para estadísticas."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.objetivo_repository import ObjetivoRepository
from src.repositories.movimiento_repository import MovimientoRepository
from src.repositories.tasa_cambio_repository import TasaCambioRepository
from src.services.estadistica_service import EstadisticaService
from src.services.tasa_cambio_service import TasaCambioService
from src.schemas.estadistica_schema import EstadisticasResponse
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario


router = APIRouter(prefix="/estadisticas", tags=["Estadísticas"])


def get_estadistica_service(db: Session = Depends(get_db)) -> EstadisticaService:
    """Dependency que proporciona el servicio de estadísticas."""
    objetivo_repo = ObjetivoRepository(db)
    movimiento_repo = MovimientoRepository(db)
    tasa_cambio_repo = TasaCambioRepository(db)
    tasa_cambio_service = TasaCambioService(tasa_cambio_repo)

    return EstadisticaService(
        objetivo_repository=objetivo_repo,
        movimiento_repository=movimiento_repo,
        tasa_cambio_service=tasa_cambio_service
    )


@router.get("/", response_model=EstadisticasResponse)
async def obtener_estadisticas(
    service: EstadisticaService = Depends(get_estadistica_service)
):
    """
    Obtiene las estadísticas globales de la pareja.

    Returns:
        EstadisticasResponse: Estadísticas completas
    """
    estadisticas = await service.calcular_estadisticas()
    return estadisticas
