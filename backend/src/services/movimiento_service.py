"""Service para la lógica de negocio de Movimiento."""
from decimal import Decimal
from typing import List, Optional

from src.domain.movimiento import Movimiento
from src.repositories.movimiento_repository import MovimientoRepository
from src.repositories.objetivo_repository import ObjetivoRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.services.tasa_cambio_service import TasaCambioService
from src.domain.enums import TipoMovimiento, Moneda

class MovimientoService:
    """Service que orquesta la lógica de negocio de movimientos."""

    def __init__(
        self,
        repository: MovimientoRepository,
        objetivo_repository: ObjetivoRepository,
        usuario_repository: UsuarioRepository,
        tasa_cambio_service: TasaCambioService
    ):
        self.repository = repository
        self.objetivo_repository = objetivo_repository
        self.usuario_repository = usuario_repository
        self.tasa_cambio_service = tasa_cambio_service

    def crear_movimiento(
        self,
        monto: Decimal,
        moneda: Moneda,
        tipo: TipoMovimiento,
        usuario_id: int,
        objetivo_id: int,
        motivo: Optional[str] = None,
        nota: Optional[str] = None
    ) -> Movimiento:
        """
        Crea un nuevo movimiento (aporte o retiro).

        Args:
            monto: Monto del movimiento
            moneda: Moneda del movimiento
            tipo: Tipo (aporte/retiro)
            usuario_id: ID del usuario que realiza el movimiento
            objetivo_id: ID del objetivo asociado
            motivo: Motivo opcional
            nota: Nota opcional

        Returns:
            Movimiento: Movimiento creado

        Raises:
            ValueError: Si hay errores de validación
            KeyError: Si el usuario o el objetivo no existen
        """
        # Validar que el usuario existe
        usuario = self.usuario_repository.obtener_por_id(usuario_id)
        if not usuario:
            raise KeyError(f"No se encontró usuario con id {usuario_id}")

        # Obtener el objetivo
        objetivo = self.objetivo_repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró objetivo con id {objetivo_id}")

        # Convertir monto si las monedas son diferentes
        monto_convertido = monto
        if moneda != objetivo.moneda:
            monto_convertido = self.tasa_cambio_service.convertir(
                monto=monto,
                moneda_origen=moneda,
                moneda_destino=objetivo.moneda
            )

        # Aplicar el movimiento al objetivo según su tipo
        if tipo == TipoMovimiento.APORTE:
            objetivo.agregar_monto(monto_convertido)
        elif tipo == TipoMovimiento.RETIRO:
            objetivo.retirar_monto(monto_convertido)

        # Persistir cambios en el objetivo
        actualizado = self.objetivo_repository.actualizar(objetivo)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo {objetivo_id} al aplicar movimiento")

        # Crear entidad de movimiento
        movimiento = Movimiento(
            monto=monto,
            moneda=moneda,
            tipo=tipo,
            usuario_id=usuario_id,
            objetivo_id=objetivo_id,
            motivo=motivo,
            nota=nota
        )

        # Persistir el movimiento
        nuevo_movimiento = self.repository.crear(movimiento)
        if not nuevo_movimiento:
            raise ValueError("No se pudo crear el movimiento en la base de datos")
        return nuevo_movimiento

    def obtener_movimiento(self, movimiento_id: int) -> Movimiento:
        """
        Obtiene un movimiento por su ID.

        Args:
            movimiento_id: ID del movimiento

        Returns:
            Movimiento: Movimiento encontrado

        Raises:
            KeyError: Si no se encuentra el movimiento
        """
        movimiento = self.repository.obtener_por_id(movimiento_id)
        if not movimiento:
            raise KeyError(f"No se encontró el movimiento con id {movimiento_id}")
        return movimiento

    def listar_movimientos_por_objetivo(self, objetivo_id: int) -> List[Movimiento]:
        """
        Lista todos los movimientos de un objetivo.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            List[Movimiento]: Lista de movimientos
        """
        return self.repository.listar_por_objetivo(objetivo_id)

    def listar_movimientos_por_usuario(self, usuario_id: int) -> List[Movimiento]:
        """
        Lista todos los movimientos de un usuario.

        Args:
            usuario_id: ID del usuario

        Returns:
            List[Movimiento]: Lista de movimientos
        """
        return self.repository.listar_por_usuario(usuario_id)

    def listar_todos_movimientos(self) -> List[Movimiento]:
        """
        Lista todos los movimientos.

        Returns:
            List[Movimiento]: Lista de movimientos
        """
        return self.repository.listar_todos()

    def listar_movimientos_recientes(self, limite: int = 10) -> List[Movimiento]:
        """
        Lista los movimientos más recientes.

        Args:
            limite: Cantidad máxima de movimientos

        Returns:
            List[Movimiento]: Lista de movimientos recientes
        """
        return self.repository.listar_recientes(limite)

    def eliminar_movimiento(self, movimiento_id: int) -> None:
        """
        Elimina un movimiento y revierte su efecto en el objetivo.

        Args:
            movimiento_id: ID del movimiento a eliminar

        Raises:
            ValueError: Si hay errores al revertir
            KeyError: Si el movimiento o su objetivo no existen
        """
        # Obtener el movimiento
        movimiento = self.repository.obtener_por_id(movimiento_id)
        if not movimiento:
            raise KeyError(f"No se encontró el movimiento con id {movimiento_id}")

        # Obtener el objetivo
        objetivo = self.objetivo_repository.obtener_por_id(movimiento.objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo asociado al movimiento (id {movimiento.objetivo_id})")

        # Convertir monto si es necesario
        monto_convertido = movimiento.monto
        if movimiento.moneda != objetivo.moneda:
            monto_convertido = self.tasa_cambio_service.convertir(
                monto=movimiento.monto,
                moneda_origen=movimiento.moneda,
                moneda_destino=objetivo.moneda
            )

        # Revertir el efecto del movimiento en el objetivo
        if movimiento.tipo == TipoMovimiento.APORTE:
            # Si fue un aporte, retirar el monto
            objetivo.retirar_monto(monto_convertido)
        elif movimiento.tipo == TipoMovimiento.RETIRO:
            # Si fue un retiro, agregar el monto de vuelta
            objetivo.agregar_monto(monto_convertido)

        # Persistir cambios en el objetivo
        actualizado = self.objetivo_repository.actualizar(objetivo)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo {objetivo.id} al revertir movimiento")

        # Eliminar el movimiento
        if not self.repository.eliminar(movimiento_id):
            raise KeyError(f"No se pudo eliminar el movimiento con id {movimiento_id}")
