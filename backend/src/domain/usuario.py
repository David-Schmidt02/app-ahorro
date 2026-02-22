"""Entidad de dominio Usuario."""
from datetime import datetime
from typing import Optional


class Usuario:
    """Entidad de dominio que representa un usuario del sistema."""

    def __init__(
        self,
        nombre: str,
        email: str,
        password_hash: str,
        id: Optional[int] = None,
        fecha_creacion: Optional[datetime] = None
    ):
        self.id = id
        self.nombre = nombre
        self.email = email
        self.password_hash = password_hash
        self.fecha_creacion = fecha_creacion or datetime.now()

    def __repr__(self) -> str:
        return f"<Usuario(id={self.id}, nombre='{self.nombre}', email='{self.email}')>"
