"""Repositorio de eventos de calendario."""
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from src.database import EventoCalendarioORM
from src.domain.evento_calendario import EventoCalendario


class EventoCalendarioRepository:

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: EventoCalendarioORM) -> EventoCalendario:
        return EventoCalendario(
            id=orm.id,
            titulo=orm.titulo,
            tipo=orm.tipo,
            fecha=orm.fecha,
            hora=orm.hora,
            foto=orm.foto,
            usuario_id=orm.usuario_id,
            creado_en=orm.creado_en,
        )

    def crear(self, evento: EventoCalendario) -> EventoCalendario:
        orm = EventoCalendarioORM(
            titulo=evento.titulo,
            tipo=evento.tipo,
            fecha=evento.fecha,
            hora=evento.hora,
            foto=evento.foto,
            usuario_id=evento.usuario_id,
            creado_en=evento.creado_en,
        )
        self.db.add(orm)
        self.db.commit()
        self.db.refresh(orm)
        return self._to_domain(orm)

    def listar_todos(self) -> List[EventoCalendario]:
        orms = (
            self.db.query(EventoCalendarioORM)
            .order_by(EventoCalendarioORM.fecha.asc())
            .all()
        )
        return [self._to_domain(o) for o in orms]

    def obtener(self, evento_id: int) -> Optional[EventoCalendario]:
        orm = self.db.query(EventoCalendarioORM).filter(EventoCalendarioORM.id == evento_id).first()
        return self._to_domain(orm) if orm else None

    def eliminar(self, evento_id: int) -> None:
        orm = self.db.query(EventoCalendarioORM).filter(EventoCalendarioORM.id == evento_id).first()
        if orm:
            self.db.delete(orm)
            self.db.commit()
