"""Controller para gestión de movimientos."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.movimiento_repository import MovimientoRepository
from src.repositories.objetivo_repository import ObjetivoRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.repositories.tasa_cambio_repository import TasaCambioRepository
from src.services.movimiento_service import MovimientoService
from src.services.tasa_cambio_service import TasaCambioService
from src.schemas.movimiento_schema import MovimientoCreate, MovimientoUpdate, MovimientoResponse
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario



router = APIRouter(prefix="/movimientos", tags=["Movimientos"])


def get_movimiento_service(db: Session = Depends(get_db)) -> MovimientoService:
    """Dependency que proporciona el servicio de movimiento."""
    movimiento_repo = MovimientoRepository(db)
    objetivo_repo = ObjetivoRepository(db)
    usuario_repo = UsuarioRepository(db)
    tasa_cambio_repo = TasaCambioRepository(db)
    tasa_cambio_service = TasaCambioService(tasa_cambio_repo)

    return MovimientoService(
        repository=movimiento_repo,
        objetivo_repository=objetivo_repo,
        usuario_repository=usuario_repo,
        tasa_cambio_service=tasa_cambio_service
    )


@router.post("/", response_model=MovimientoResponse, status_code=status.HTTP_201_CREATED)
async def crear_movimiento(
    movimiento_data: MovimientoCreate,
    service: MovimientoService = Depends(get_movimiento_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Crea un nuevo movimiento (aporte o retiro)."""
    movimiento = await service.crear_movimiento(
        monto=movimiento_data.monto,
        moneda=movimiento_data.moneda,
        tipo=movimiento_data.tipo,
        usuario_id=current_user.id,
        objetivo_id=movimiento_data.objetivo_id,
        motivo=movimiento_data.motivo,
        nota=movimiento_data.nota
    )

    return movimiento


@router.get("/", response_model=List[MovimientoResponse])
def listar_movimientos(
    objetivo_id: int = Query(None, description="Filtrar por objetivo"),
    limite: int = Query(None, ge=1, le=100, description="Limitar resultados"),
    service: MovimientoService = Depends(get_movimiento_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Lista movimientos con filtros opcionales."""
    if objetivo_id:
        movimientos = service.listar_movimientos_por_objetivo(objetivo_id)
    else:
        movimientos = service.listar_todos_movimientos()

    if limite:
        movimientos = movimientos[:limite]

    return movimientos


@router.get("/{movimiento_id}", response_model=MovimientoResponse)
def obtener_movimiento(
    movimiento_id: int,
    service: MovimientoService = Depends(get_movimiento_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene un movimiento por su ID."""
    movimiento = service.obtener_movimiento(movimiento_id)
    return movimiento


@router.put("/{movimiento_id}", response_model=MovimientoResponse)
async def actualizar_movimiento(
    movimiento_id: int,
    movimiento_data: MovimientoUpdate,
    service: MovimientoService = Depends(get_movimiento_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza un movimiento existente."""
    movimiento = await service.actualizar_movimiento(
        movimiento_id=movimiento_id,
        monto=movimiento_data.monto,
        moneda=movimiento_data.moneda,
        tipo=movimiento_data.tipo,
        motivo=movimiento_data.motivo,
        nota=movimiento_data.nota
    )
    return movimiento



@router.delete("/{movimiento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_movimiento(
    movimiento_id: int,
    service: MovimientoService = Depends(get_movimiento_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Elimina un movimiento y revierte su efecto en el objetivo."""
    await service.eliminar_movimiento(movimiento_id)
    return None
