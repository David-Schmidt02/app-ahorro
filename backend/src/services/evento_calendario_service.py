"""Servicio de eventos de calendario."""
from datetime import date, datetime
from typing import List, Optional

from src.domain.evento_calendario import EventoCalendario
from src.repositories.evento_calendario_repository import EventoCalendarioRepository


class EventoCalendarioService:

    def __init__(self, repository: EventoCalendarioRepository):
        self.repo = repository

    def crear_evento(
        self,
        titulo: str,
        tipo: str,
        fecha: date,
        usuario_id: int,
        hora: Optional[str] = None,
        foto: Optional[str] = None,
    ) -> EventoCalendario:
        evento = EventoCalendario(
            titulo=titulo,
            tipo=tipo,
            fecha=fecha,
            usuario_id=usuario_id,
            hora=hora,
            foto=foto,
        )
        return self.repo.crear(evento)

    def listar_eventos(self) -> List[EventoCalendario]:
        return self.repo.listar_todos()

    def eliminar_evento(self, evento_id: int, usuario_id: int) -> None:
        evento = self.repo.obtener(evento_id)
        if not evento:
            raise KeyError(f"Evento {evento_id} no encontrado")
        if evento.usuario_id != usuario_id:
            raise ValueError("No tenés permiso para eliminar este evento")
        self.repo.eliminar(evento_id)
