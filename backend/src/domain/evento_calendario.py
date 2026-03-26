"""Entidad de dominio EventoCalendario."""
from datetime import date, datetime
from typing import Optional


TIPOS_VALIDOS = {'aniversario', 'cumpleanos', 'salida', 'recordatorio', 'hogar', 'otro'}


class EventoCalendario:
    """Representa un evento del calendario compartido."""

    def __init__(
        self,
        titulo: str,
        tipo: str,
        fecha: date,
        usuario_id: int,
        hora: Optional[str] = None,
        foto: Optional[str] = None,
        id: Optional[int] = None,
        creado_en: Optional[datetime] = None,
    ):
        self.id = id
        self.titulo = titulo
        self.tipo = tipo.lower()
        self.fecha = fecha
        self.hora = hora
        self.foto = foto
        self.usuario_id = usuario_id
        self.creado_en = creado_en or datetime.now()

        self._validar()

    def _validar(self) -> None:
        if not self.titulo or not self.titulo.strip():
            raise ValueError("El título del evento no puede estar vacío")
        if self.tipo not in TIPOS_VALIDOS:
            raise ValueError(f"Tipo de evento inválido: {self.tipo}")

    def __repr__(self) -> str:
        return f"<EventoCalendario(id={self.id}, titulo={self.titulo}, tipo={self.tipo}, fecha={self.fecha})>"
