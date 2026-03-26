"""Controller para eventos del calendario compartido."""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.evento_calendario_repository import EventoCalendarioRepository
from src.services.evento_calendario_service import EventoCalendarioService
from src.schemas.evento_calendario_schema import EventoCalendarioCreate, EventoCalendarioResponse
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario


router = APIRouter(prefix="/calendario", tags=["Calendario"])


def get_evento_service(db: Session = Depends(get_db)) -> EventoCalendarioService:
    return EventoCalendarioService(repository=EventoCalendarioRepository(db))


@router.post("/", response_model=EventoCalendarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_evento(
    data: EventoCalendarioCreate,
    service: EventoCalendarioService = Depends(get_evento_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Crea un nuevo evento en el calendario compartido."""
    return service.crear_evento(
        titulo=data.titulo,
        tipo=data.tipo,
        fecha=data.fecha,
        usuario_id=current_user.id,
        hora=data.hora,
        foto=data.foto,
    )


@router.get("/", response_model=List[EventoCalendarioResponse])
def listar_eventos(
    service: EventoCalendarioService = Depends(get_evento_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Lista todos los eventos del calendario (compartido entre usuarios)."""
    return service.listar_eventos()


@router.delete("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_evento(
    evento_id: int,
    service: EventoCalendarioService = Depends(get_evento_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Elimina un evento del calendario (solo el dueño puede eliminarlo)."""
    service.eliminar_evento(evento_id=evento_id, usuario_id=current_user.id)
    return None
