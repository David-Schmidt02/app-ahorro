from fastapi import APIRouter, status

from app.dependencies import DbDep, UsuarioDep
from app.schemas.eventos import EventoIn, EventoOut
from app.services.evento_service import EventoService

router = APIRouter(prefix="/eventos", tags=["Eventos"])


@router.post("", response_model=EventoOut, status_code=status.HTTP_201_CREATED)
def crear(datos: EventoIn, db: DbDep, usuario: UsuarioDep) -> EventoOut:
    return EventoOut.model_validate(EventoService(db).crear(datos, usuario))


@router.put("/{evento_id}", response_model=EventoOut)
def actualizar(evento_id: int, datos: EventoIn, db: DbDep) -> EventoOut:
    return EventoOut.model_validate(EventoService(db).actualizar(evento_id, datos))


@router.delete("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(evento_id: int, db: DbDep) -> None:
    EventoService(db).eliminar(evento_id)
