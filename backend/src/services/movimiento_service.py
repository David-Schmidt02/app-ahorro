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

    async def crear_movimiento(
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

        # Convertir monto siempre a USD para guardarlo
        monto_convertido = monto
        if moneda != Moneda.USD:
            monto_convertido = await self.tasa_cambio_service.convertir(
                monto=monto,
                moneda_origen=moneda,
                moneda_destino=Moneda.USD
            )

        # Aplicar el movimiento al objetivo según su tipo
        # Nota: El objetivo ahora también debería estar siempre en USD
        if tipo == TipoMovimiento.APORTE:
            objetivo.agregar_monto(monto_convertido)
        elif tipo == TipoMovimiento.RETIRO:
            objetivo.retirar_monto(monto_convertido)

        from datetime import datetime
        objetivo.agregar_historial(datetime.now(), objetivo.monto_actual)

        # Persistir cambios en el objetivo (sin commit, para que sea atómico con el movimiento)
        actualizado = self.objetivo_repository.actualizar(objetivo, commit=False)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo {objetivo_id} al aplicar movimiento")

        # Crear entidad de movimiento, guardando siempre en USD
        movimiento = Movimiento(
            monto=monto_convertido,
            moneda=Moneda.USD,
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

    async def actualizar_movimiento(
        self,
        movimiento_id: int,
        monto: Optional[Decimal] = None,
        moneda: Optional[Moneda] = None,
        tipo: Optional[TipoMovimiento] = None,
        motivo: Optional[str] = None,
        nota: Optional[str] = None
    ) -> Movimiento:
        """
        Actualiza un movimiento existente.

        Args:
            movimiento_id: ID del movimiento a actualizar
            monto: Nuevo monto (opcional)
            moneda: Nueva moneda (opcional)
            tipo: Nuevo tipo (opcional)
            motivo: Nuevo motivo (opcional)
            nota: Nueva nota (opcional)

        Returns:
            Movimiento: Movimiento actualizado

        Raises:
            ValueError: Si hay errores de validación
            KeyError: Si el movimiento no existe
        """
        # Obtener el movimiento actual
        movimiento_actual = self.repository.obtener_por_id(movimiento_id)
        if not movimiento_actual:
            raise KeyError(f"No se encontró el movimiento con id {movimiento_id}")

        # Obtener el objetivo asociado
        objetivo = self.objetivo_repository.obtener_por_id(movimiento_actual.objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo asociado (id {movimiento_actual.objetivo_id})")

        # Si se cambia monto, moneda o tipo, hay que revertir el efecto anterior y aplicar el nuevo
        if monto is not None or moneda is not None or tipo is not None:
            # Valores anteriores (siempre estaban en USD en la BBDD)
            monto_anterior_usd = movimiento_actual.monto
            tipo_anterior = movimiento_actual.tipo

            # Valores nuevos (los proveídos, o los actuales asumiendo que ya son USD)
            monto_nuevo_bruto = monto if monto is not None else movimiento_actual.monto
            moneda_nueva = moneda if moneda is not None else Moneda.USD
            tipo_nuevo = tipo if tipo is not None else tipo_anterior

            # Revertir efecto anterior (que ya estaba en USD)
            if tipo_anterior == TipoMovimiento.APORTE:
                objetivo.retirar_monto(monto_anterior_usd)
            elif tipo_anterior == TipoMovimiento.RETIRO:
                objetivo.agregar_monto(monto_anterior_usd)

            # Convertir monto nuevo a USD
            monto_nuevo_usd = monto_nuevo_bruto
            if moneda_nueva != Moneda.USD:
                monto_nuevo_usd = await self.tasa_cambio_service.convertir(
                    monto=monto_nuevo_bruto,
                    moneda_origen=moneda_nueva,
                    moneda_destino=Moneda.USD
                )

            # Aplicar efecto nuevo en USD
            if tipo_nuevo == TipoMovimiento.APORTE:
                objetivo.agregar_monto(monto_nuevo_usd)
            elif tipo_nuevo == TipoMovimiento.RETIRO:
                objetivo.retirar_monto(monto_nuevo_usd)

            from datetime import datetime
            objetivo.agregar_historial(datetime.now(), objetivo.monto_actual)

            # Persistir cambios en el objetivo (sin commit, para que sea atómico con el movimiento)
            actualizado = self.objetivo_repository.actualizar(objetivo, commit=False)
            if not actualizado:
                raise ValueError(f"No se pudo actualizar el objetivo {objetivo.id}")

            # Al actualizar, el movimiento guardará la info convertida a USD
            if monto is not None or moneda is not None:
                movimiento_actual.monto = monto_nuevo_usd
                movimiento_actual.moneda = Moneda.USD

        # Actualizar campos del movimiento general
        if tipo is not None:
            movimiento_actual.tipo = tipo
        if motivo is not None:
            movimiento_actual.motivo = motivo
        if nota is not None:
            movimiento_actual.nota = nota

        # Persistir cambios en el movimiento
        movimiento_actualizado = self.repository.actualizar(movimiento_actual)
        if not movimiento_actualizado:
            raise ValueError(f"No se pudo actualizar el movimiento con id {movimiento_id}")

        return movimiento_actualizado

    async def eliminar_movimiento(self, movimiento_id: int) -> None:
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

        # Como el movimiento ya está en USD, lo revertimos directamente
        monto_convertido = movimiento.monto

        # Revertir el efecto del movimiento en el objetivo
        if movimiento.tipo == TipoMovimiento.APORTE:
            # Si fue un aporte, retirar el monto
            objetivo.retirar_monto(monto_convertido)
        elif movimiento.tipo == TipoMovimiento.RETIRO:
            # Si fue un retiro, agregar el monto de vuelta
            objetivo.agregar_monto(monto_convertido)

        from datetime import datetime
        objetivo.agregar_historial(datetime.now(), objetivo.monto_actual)

        # Persistir cambios en el objetivo (sin commit, para que sea atómico con la eliminación)
        actualizado = self.objetivo_repository.actualizar(objetivo, commit=False)
        if not actualizado:
            raise ValueError(f"No se pudo actualizar el objetivo {objetivo.id} al revertir movimiento")

        # Eliminar el movimiento
        if not self.repository.eliminar(movimiento_id):
            raise KeyError(f"No se pudo eliminar el movimiento con id {movimiento_id}")
