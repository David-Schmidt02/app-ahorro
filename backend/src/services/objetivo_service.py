"""Service para la lógica de negocio de Objetivo."""
from datetime import date
from decimal import Decimal
from typing import List, Optional

from src.domain.objetivo import Objetivo
from src.repositories.objetivo_repository import ObjetivoRepository
from src.domain.enums import Moneda, EstadoObjetivo


class ObjetivoService:
    """Service que orquesta la lógica de negocio de objetivos."""

    def __init__(self, repository: ObjetivoRepository):
        self.repository = repository

    def crear_objetivo(
        self,
        nombre: str,
        monto_objetivo: Decimal,
        moneda: Moneda,
        fecha_limite: date,
        descripcion: Optional[str] = None,
        es_prioritario: bool = False
    ) -> Objetivo:
        """
        Crea un nuevo objetivo.

        Args:
            nombre: Nombre del objetivo
            monto_objetivo: Monto a alcanzar
            moneda: Moneda del objetivo
            fecha_limite: Fecha límite
            descripcion: Descripción opcional
            es_prioritario: Si es prioritario

        Returns:
            Objetivo: Objetivo creado
        """
        # Crear entidad de dominio (valida reglas en __init__)
        objetivo = Objetivo(
            nombre=nombre,
            monto_objetivo=monto_objetivo,
            moneda=moneda,
            fecha_limite=fecha_limite,
            descripcion=descripcion,
            es_prioritario=es_prioritario
        )

        # Persistir
        nuevo_objetivo = self.repository.crear(objetivo)
        if not nuevo_objetivo:
            raise ValueError("No se pudo crear el objetivo en la base de datos")
        return nuevo_objetivo

    def obtener_objetivo(self, objetivo_id: int) -> Objetivo:
        """
        Obtiene un objetivo por su ID.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Objetivo: Objetivo encontrado

        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")
        return objetivo

    def listar_objetivos(self) -> List[Objetivo]:
        """
        Lista todos los objetivos.

        Returns:
            List[Objetivo]: Lista de objetivos
        """
        return self.repository.listar_todos()

    def listar_objetivos_activos(self) -> List[Objetivo]:
        """
        Lista todos los objetivos activos.

        Returns:
            List[Objetivo]: Lista de objetivos activos
        """
        return self.repository.listar_activos()

    def listar_objetivos_prioritarios(self) -> List[Objetivo]:
        """
        Lista todos los objetivos prioritarios.

        Returns:
            List[Objetivo]: Lista de objetivos prioritarios
        """
        return self.repository.listar_prioritarios()

    def listar_objetivos_por_estado(self, estado: EstadoObjetivo) -> List[Objetivo]:
        """
        Lista objetivos filtrados por estado.

        Args:
            estado: Estado a filtrar

        Returns:
            List[Objetivo]: Lista de objetivos
        """
        return self.repository.listar_por_estado(estado)

    def actualizar_objetivo(
        self,
        objetivo_id: int,
        nombre: Optional[str] = None,
        descripcion: Optional[str] = None,
        monto_objetivo: Optional[Decimal] = None,
        fecha_limite: Optional[date] = None,
        es_prioritario: Optional[bool] = None
    ) -> Objetivo:
        """
        Actualiza un objetivo existente.

        Args:
            objetivo_id: ID del objetivo
            nombre: Nuevo nombre (opcional)
            descripcion: Nueva descripción (opcional)
            monto_objetivo: Nuevo monto objetivo (opcional)
            fecha_limite: Nueva fecha límite (opcional)
            es_prioritario: Nuevo estado prioritario (opcional)

        Returns:
            Objetivo: Objetivo actualizado

        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        # Obtener entidad de dominio
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")

        # Modificar atributos (la entidad valida en _validar_invariantes si es necesario)
        if nombre is not None:
            objetivo.nombre = nombre

        if descripcion is not None:
            objetivo.descripcion = descripcion

        if monto_objetivo is not None:
            objetivo.monto_objetivo = monto_objetivo

        if fecha_limite is not None:
            objetivo.fecha_limite = fecha_limite

        if es_prioritario is not None:
            objetivo.es_prioritario = es_prioritario

        # Revalidar invariantes después de modificaciones
        objetivo._validar_invariantes()

        # Persistir cambios
        actualizado = self.repository.actualizar(objetivo)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo con id {objetivo_id}")
        return actualizado

    def postergar_fecha_limite(self, objetivo_id: int, nueva_fecha: date) -> Objetivo:
        """
        Posterga la fecha límite de un objetivo.

        Args:
            objetivo_id: ID del objetivo
            nueva_fecha: Nueva fecha límite

        Returns:
            Objetivo: Objetivo actualizado
            
        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        # Obtener entidad de dominio
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")

        # Usar método de dominio para postergar (valida reglas de negocio)
        objetivo.postergar_fecha_limite(nueva_fecha)

        # Persistir cambios
        actualizado = self.repository.actualizar(objetivo)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo con id {objetivo_id}")
        return actualizado

    def marcar_completado(self, objetivo_id: int) -> Objetivo:
        """
        Marca un objetivo como completado.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Objetivo: Objetivo actualizado

        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        # Obtener entidad de dominio
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")

        # Usar método de dominio
        objetivo.marcar_completado()

        # Persistir cambios
        actualizado = self.repository.actualizar(objetivo)
        if not actualizado:
             raise ValueError(f"No se pudo actualizar el objetivo con id {objetivo_id}")
        return actualizado

    def pausar_objetivo(self, objetivo_id: int) -> Objetivo:
        """
        Pausa un objetivo.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Objetivo: Objetivo actualizado

        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")
            
        objetivo.pausar()
        actualizado = self.repository.actualizar(objetivo)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo con id {objetivo_id}")
        return actualizado

    def reactivar_objetivo(self, objetivo_id: int) -> Objetivo:
        """
        Reactiva un objetivo pausado.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Objetivo: Objetivo actualizado

        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")
            
        objetivo.reactivar()
        actualizado = self.repository.actualizar(objetivo)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo con id {objetivo_id}")
        return actualizado

    def eliminar_objetivo(self, objetivo_id: int) -> None:
        """
        Elimina un objetivo.

        Args:
            objetivo_id: ID del objetivo a eliminar
        Raises:
            KeyError: Si no se pudo eliminar o no existe el objetivo
        """
        if not self.repository.eliminar(objetivo_id):
            raise KeyError(f"No se pudo eliminar el objetivo con id {objetivo_id}")

    def calcular_porcentaje_completado(self, objetivo_id: int) -> Decimal:
        """
        Calcula el porcentaje completado de un objetivo.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Decimal: Porcentaje completado

        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")
        return objetivo.calcular_porcentaje_completado()

    def calcular_pago_mensual_requerido(self, objetivo_id: int) -> Decimal:
        """
        Calcula el pago mensual requerido para alcanzar un objetivo.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Decimal: Pago mensual requerido

        Raises:
            KeyError: Si no se encuentra el objetivo
        """
        objetivo = self.repository.obtener_por_id(objetivo_id)
        if not objetivo:
             raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")
        return objetivo.calcular_pago_mensual_requerido()
