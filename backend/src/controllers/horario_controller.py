"""Controller para horarios de usuarios."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.horario_repository import HorarioRepository
from src.services.horario_service import HorarioService
from src.schemas.horario_schema import HorarioUpdate, HorarioResponse
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario


router = APIRouter(prefix="/horarios", tags=["Horarios"])


def get_horario_service(db: Session = Depends(get_db)) -> HorarioService:
    return HorarioService(repository=HorarioRepository(db))


@router.get("/mio", response_model=Optional[HorarioResponse])
def obtener_mi_horario(
    service: HorarioService = Depends(get_horario_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Obtiene el horario del usuario autenticado."""
    try:
        return service.obtener_mi_horario(usuario_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener horario: {str(e)}")


@router.get("/todos", response_model=List[HorarioResponse])
def obtener_todos_los_horarios(
    service: HorarioService = Depends(get_horario_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Obtiene los horarios de todos los usuarios."""
    try:
        return service.obtener_todos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar horarios: {str(e)}")


@router.put("/mio", response_model=HorarioResponse)
async def guardar_mi_horario(
    data: HorarioUpdate,
    service: HorarioService = Depends(get_horario_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Crea o actualiza el horario del usuario autenticado."""
    try:
        return service.guardar_horario(
            usuario_id=current_user.id,
            nombre_usuario=current_user.nombre,
            data=data.data,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar horario: {str(e)}")
