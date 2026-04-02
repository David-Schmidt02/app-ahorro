"""Controller para gastos del día a día."""
from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.gasto_repository import GastoRepository
from src.services.gasto_service import GastoService
from src.schemas.gasto_schema import GastoCreate, GastoResponse
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario


router = APIRouter(prefix="/gastos", tags=["Gastos"])


def get_gasto_service(db: Session = Depends(get_db)) -> GastoService:
    return GastoService(repository=GastoRepository(db))


@router.post("/", response_model=GastoResponse, status_code=status.HTTP_201_CREATED)
async def crear_gasto(
    data: GastoCreate,
    service: GastoService = Depends(get_gasto_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Registra un nuevo gasto."""
    return service.crear_gasto(
        monto=data.monto,
        moneda=data.moneda,
        categoria=data.categoria,
        usuario_id=current_user.id,
        descripcion=data.descripcion,
        fecha=data.fecha,
        subtipo=data.subtipo,
        fecha_pago=data.fecha_pago,
    )


@router.get("/", response_model=List[GastoResponse])
def listar_gastos(
    limite: int = Query(None, ge=1, le=500),
    service: GastoService = Depends(get_gasto_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Lista los gastos del usuario autenticado."""
    return service.listar_gastos(usuario_id=current_user.id, limite=limite)


@router.delete("/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_gasto(
    gasto_id: int,
    service: GastoService = Depends(get_gasto_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Elimina un gasto."""
    service.eliminar_gasto(gasto_id=gasto_id, usuario_id=current_user.id)
    return None
