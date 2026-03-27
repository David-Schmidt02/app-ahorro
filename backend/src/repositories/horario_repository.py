"""Repositorio de horarios de usuarios."""
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.database import HorarioORM
from src.domain.horario import HorarioUsuario


class HorarioRepository:

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: HorarioORM) -> HorarioUsuario:
        return HorarioUsuario(
            id=orm.id,
            usuario_id=orm.usuario_id,
            nombre_usuario=orm.nombre_usuario,
            data=orm.data,
            actualizado_en=orm.actualizado_en,
        )

    def obtener_por_usuario(self, usuario_id: int) -> Optional[HorarioUsuario]:
        try:
            orm = self.db.query(HorarioORM).filter(HorarioORM.usuario_id == usuario_id).first()
            return self._to_domain(orm) if orm else None
        except SQLAlchemyError:
            self.db.rollback()
            return None

    def upsert(self, usuario_id: int, nombre_usuario: Optional[str], data: str) -> HorarioUsuario:
        try:
            orm = self.db.query(HorarioORM).filter(HorarioORM.usuario_id == usuario_id).first()
            if orm:
                orm.nombre_usuario = nombre_usuario
                orm.data = data
                orm.actualizado_en = datetime.now()
            else:
                orm = HorarioORM(
                    usuario_id=usuario_id,
                    nombre_usuario=nombre_usuario,
                    data=data,
                    actualizado_en=datetime.now(),
                )
                self.db.add(orm)
            self.db.commit()
            self.db.refresh(orm)
            return self._to_domain(orm)
        except SQLAlchemyError as e:
            self.db.rollback()
            raise e

    def listar_todos(self) -> List[HorarioUsuario]:
        try:
            orms = self.db.query(HorarioORM).all()
            return [self._to_domain(o) for o in orms]
        except SQLAlchemyError:
            self.db.rollback()
            return []
