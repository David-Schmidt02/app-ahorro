"""Entidad de dominio Propiedad (alquiler)."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from src.domain.enums import EstadoPropiedad, Moneda


class Propiedad:
    """Representa una propiedad en alquiler."""

    def __init__(
        self,
        url: str,
        creado_por_id: int,
        estado: EstadoPropiedad = EstadoPropiedad.VISTA,
        precio: Optional[Decimal] = None,
        moneda: Optional[Moneda] = None,
        expensas: Optional[Decimal] = None,
        moneda_expensas: Optional[Moneda] = None,
        direccion: Optional[str] = None,
        inmobiliaria: Optional[str] = None,
        contacto: Optional[str] = None,
        metros_cuadrados: Optional[Decimal] = None,
        cuartos: Optional[int] = None,
        banios: Optional[int] = None,
        notas: Optional[str] = None,
        en_top: bool = False,
        posicion_top: Optional[int] = None,
        id: Optional[int] = None,
        creado_en: Optional[datetime] = None,
    ):
        self.id = id
        self.url = url
        self.creado_por_id = creado_por_id
        self.estado = estado
        self.precio = precio
        self.moneda = moneda
        self.expensas = expensas
        self.moneda_expensas = moneda_expensas
        self.direccion = direccion
        self.inmobiliaria = inmobiliaria
        self.contacto = contacto
        self.metros_cuadrados = metros_cuadrados
        self.cuartos = cuartos
        self.banios = banios
        self.notas = notas
        self.en_top = en_top
        self.posicion_top = posicion_top
        self.creado_en = creado_en or datetime.now()

        self._validar_invariantes()

    def _validar_invariantes(self) -> None:
        """Valida las reglas de negocio."""
        if not self.url or not self.url.strip():
            raise ValueError("La URL de la propiedad es obligatoria")

        if self.precio is not None and self.precio < 0:
            raise ValueError("El precio no puede ser negativo")

        if self.expensas is not None and self.expensas < 0:
            raise ValueError("Las expensas no pueden ser negativas")

        if self.metros_cuadrados is not None and self.metros_cuadrados <= 0:
            raise ValueError("Los metros cuadrados deben ser mayores a cero")

        if self.cuartos is not None and self.cuartos < 0:
            raise ValueError("Los cuartos no pueden ser negativos")

        if self.banios is not None and self.banios < 0:
            raise ValueError("Los baños no pueden ser negativos")

    def cambiar_estado(self, nuevo_estado: EstadoPropiedad) -> None:
        """Cambia el estado de la propiedad."""
        self.estado = nuevo_estado

    def agregar_al_top(self, posicion: int) -> None:
        """Agrega la propiedad al top 10."""
        if posicion < 1 or posicion > 10:
            raise ValueError("La posición debe estar entre 1 y 10")
        self.en_top = True
        self.posicion_top = posicion

    def remover_del_top(self) -> None:
        """Remueve la propiedad del top 10."""
        self.en_top = False
        self.posicion_top = None

    def __repr__(self) -> str:
        return f"<Propiedad(id={self.id}, url={self.url[:30]}..., estado={self.estado}, en_top={self.en_top})>"
