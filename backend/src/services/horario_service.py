"""Servicio de horarios de usuarios."""
from typing import List, Optional

from src.domain.horario import HorarioUsuario
from src.repositories.horario_repository import HorarioRepository


class HorarioService:

    def __init__(self, repository: HorarioRepository):
        self.repo = repository

    def guardar_horario(self, usuario_id: int, nombre_usuario: Optional[str], data: str) -> HorarioUsuario:
        return self.repo.upsert(usuario_id=usuario_id, nombre_usuario=nombre_usuario, data=data)

    def obtener_mi_horario(self, usuario_id: int) -> Optional[HorarioUsuario]:
        return self.repo.obtener_por_usuario(usuario_id)

    def obtener_todos(self) -> List[HorarioUsuario]:
        return self.repo.listar_todos()
