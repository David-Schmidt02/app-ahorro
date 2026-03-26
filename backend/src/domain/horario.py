"""Entidad de dominio HorarioUsuario."""
from datetime import datetime
from typing import Optional


class HorarioUsuario:
    """Representa el horario semanal de un usuario."""

    def __init__(
        self,
        usuario_id: int,
        data: str,
        nombre_usuario: Optional[str] = None,
        id: Optional[int] = None,
        actualizado_en: Optional[datetime] = None,
    ):
        self.id = id
        self.usuario_id = usuario_id
        self.nombre_usuario = nombre_usuario
        self.data = data
        self.actualizado_en = actualizado_en or datetime.now()

    def __repr__(self) -> str:
        return f"<HorarioUsuario(id={self.id}, usuario_id={self.usuario_id}, nombre_usuario={self.nombre_usuario})>"
