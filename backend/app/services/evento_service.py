from sqlalchemy import extract, select
from sqlalchemy.orm import Session

from app.core.exceptions import NoEncontrado
from app.core.fechas import dia_en_mes, parsear_mes, siguiente_mes
from app.models import Evento, Usuario
from app.schemas.eventos import EventoDelMes, EventoIn, EventoOut


class EventoService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def obtener(self, evento_id: int) -> Evento:
        evento = self.db.get(Evento, evento_id)
        if evento is None:
            raise NoEncontrado("El evento no existe")
        return evento

    def del_mes(self, mes: str) -> list[EventoDelMes]:
        """Los eventos del mes; los anuales aparecen cada año desde su fecha original."""
        inicio = parsear_mes(mes)
        unicos = self.db.scalars(
            select(Evento).where(~Evento.anual, Evento.fecha >= inicio, Evento.fecha < siguiente_mes(inicio))
        )
        anuales = self.db.scalars(
            select(Evento).where(
                Evento.anual, extract("month", Evento.fecha) == inicio.month, Evento.fecha < siguiente_mes(inicio)
            )
        )
        eventos = [
            EventoDelMes(**EventoOut.model_validate(e).model_dump(), dia=e.fecha) for e in unicos
        ] + [
            EventoDelMes(**EventoOut.model_validate(e).model_dump(), dia=dia_en_mes(inicio, e.fecha.day))
            for e in anuales
        ]
        return sorted(eventos, key=lambda e: (e.dia, e.hora or "", e.titulo))

    def crear(self, datos: EventoIn, usuario: Usuario) -> Evento:
        evento = Evento(**datos.model_dump(), creado_por_id=usuario.id)
        evento.titulo = evento.titulo.strip()
        self.db.add(evento)
        self.db.commit()
        return evento

    def actualizar(self, evento_id: int, datos: EventoIn) -> Evento:
        evento = self.obtener(evento_id)
        for campo, valor in datos.model_dump().items():
            setattr(evento, campo, valor)
        self.db.commit()
        return evento

    def eliminar(self, evento_id: int) -> None:
        self.db.delete(self.obtener(evento_id))
        self.db.commit()
