"""Servicio de lógica de negocio para Propiedades."""
from decimal import Decimal
from typing import List, Optional

from src.domain.propiedad import Propiedad
from src.domain.enums import EstadoPropiedad, Moneda
from src.repositories.propiedad_repository import PropiedadRepository


class PropiedadService:

    def __init__(self, repository: PropiedadRepository):
        self.repository = repository

    def crear_propiedad(
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
    ) -> Propiedad:
        """Crea una nueva propiedad."""
        propiedad = Propiedad(
            url=url,
            creado_por_id=creado_por_id,
            estado=estado,
            precio=precio,
            moneda=moneda,
            expensas=expensas,
            moneda_expensas=moneda_expensas,
            direccion=direccion,
            inmobiliaria=inmobiliaria,
            contacto=contacto,
            metros_cuadrados=metros_cuadrados,
            cuartos=cuartos,
            banios=banios,
            notas=notas,
        )
        return self.repository.crear(propiedad)

    def listar_propiedades(self) -> List[Propiedad]:
        """Lista todas las propiedades."""
        return self.repository.listar_todas()

    def obtener_propiedad(self, propiedad_id: int) -> Propiedad:
        """Obtiene una propiedad por ID."""
        propiedad = self.repository.obtener(propiedad_id)
        if not propiedad:
            raise KeyError(f"Propiedad {propiedad_id} no encontrada")
        return propiedad

    def actualizar_propiedad(self, propiedad_id: int, datos: dict) -> Propiedad:
        """Actualiza una propiedad existente."""
        propiedad = self.obtener_propiedad(propiedad_id)  # Valida que exista

        # Limpiar Nones
        datos_limpios = {k: v for k, v in datos.items() if v is not None}

        # Si viene estado, validamos que sea EstadoPropiedad válido
        if 'estado' in datos_limpios and isinstance(datos_limpios['estado'], str):
            datos_limpios['estado'] = EstadoPropiedad(datos_limpios['estado'])

        # Actualizar via repository
        actualizada = self.repository.actualizar(propiedad_id, datos_limpios)
        if not actualizada:
            raise KeyError(f"No se pudo actualizar propiedad {propiedad_id}")

        return actualizada

    def cambiar_estado(self, propiedad_id: int, nuevo_estado: EstadoPropiedad) -> Propiedad:
        """Cambia el estado de una propiedad."""
        propiedad = self.obtener_propiedad(propiedad_id)
        propiedad.cambiar_estado(nuevo_estado)
        return self.repository.actualizar(propiedad_id, {'estado': nuevo_estado})

    def toggle_top(self, propiedad_id: int) -> Propiedad:
        """Activa/desactiva una propiedad del Top 10."""
        propiedad = self.obtener_propiedad(propiedad_id)

        if propiedad.en_top:
            # Remover del top
            propiedad.remover_del_top()
            return self.repository.actualizar(propiedad_id, {'en_top': False, 'posicion_top': None})
        else:
            # Agregar al top: buscar la próxima posición disponible
            todas = self.listar_propiedades()
            top_props = [p for p in todas if p.en_top]

            if len(top_props) >= 10:
                raise ValueError("El Top 10 está completo. Remueve una propiedad antes de agregar otra.")

            posicion = len(top_props) + 1
            propiedad.agregar_al_top(posicion)
            return self.repository.actualizar(propiedad_id, {'en_top': True, 'posicion_top': posicion})

    def reordenar_top(self, ids: List[int]) -> bool:
        """Reordena el Top 10."""
        if len(ids) > 10:
            raise ValueError("El Top 10 no puede tener más de 10 elementos")

        # Validar que todos los IDs existan y estén en el top
        for prop_id in ids:
            propiedad = self.obtener_propiedad(prop_id)
            if not propiedad.en_top:
                raise ValueError(f"La propiedad {prop_id} no está en el Top 10")

        return self.repository.reordenar_top(ids)

    def eliminar_propiedad(self, propiedad_id: int) -> bool:
        """Elimina una propiedad."""
        self.obtener_propiedad(propiedad_id)  # Valida que exista
        return self.repository.eliminar(propiedad_id)
