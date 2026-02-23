"""Service para cálculo de estadísticas."""
from decimal import Decimal
from typing import Dict

from src.repositories.objetivo_repository import ObjetivoRepository
from src.repositories.movimiento_repository import MovimientoRepository
from src.domain.enums import EstadoObjetivo, TipoMovimiento


class EstadisticaService:
    """Service que calcula estadísticas globales del usuario."""

    def __init__(
        self,
        objetivo_repository: ObjetivoRepository,
        movimiento_repository: MovimientoRepository
    ):
        self.objetivo_repository = objetivo_repository
        self.movimiento_repository = movimiento_repository

    def calcular_estadisticas(self) -> Dict:
        """
        Calcula las estadísticas globales de la pareja.

        Returns:
            Dict: Diccionario con todas las estadísticas
        """
        # Obtener todos los objetivos del usuario
        objetivos = self.objetivo_repository.listar_todos()

        # Obtener todos los movimientos del usuario
        movimientos = self.movimiento_repository.listar_todos()

        # Contadores de objetivos
        total_objetivos = len(objetivos)
        objetivos_activos = sum(1 for obj in objetivos if obj.estado == EstadoObjetivo.ACTIVO)
        objetivos_completados = sum(1 for obj in objetivos if obj.estado == EstadoObjetivo.COMPLETADO)
        objetivos_pausados = sum(1 for obj in objetivos if obj.estado == EstadoObjetivo.PAUSADO)

        # Montos de objetivos
        monto_total_objetivos = sum(obj.monto_objetivo for obj in objetivos)
        monto_total_guardado = Decimal(0)
        for obj in objetivos:
            porcentaje = obj.calcular_porcentaje_completado()
            monto_total_guardado += (obj.monto_objetivo * (porcentaje / Decimal(100)))

        monto_restante = monto_total_objetivos - monto_total_guardado
        progreso_global_porcentaje = (
            (monto_total_guardado / monto_total_objetivos * Decimal(100))
            if monto_total_objetivos > 0 else Decimal(0)
        )

        # Movimientos
        total_movimientos = len(movimientos)
        aportes = [m for m in movimientos if m.tipo == TipoMovimiento.APORTE]
        retiros = [m for m in movimientos if m.tipo == TipoMovimiento.RETIRO]

        total_aportes = len(aportes)
        total_retiros = len(retiros)
        suma_aportes = sum(m.monto for m in aportes)
        suma_retiros = sum(m.monto for m in retiros)

        # Promedios
        promedio_aporte = suma_aportes / Decimal(total_aportes) if total_aportes > 0 else Decimal(0)

        # Promedio de cumplimiento de objetivos
        if total_objetivos > 0:
            suma_porcentajes = sum(obj.calcular_porcentaje_completado() for obj in objetivos)
            promedio_cumplimiento = suma_porcentajes / Decimal(total_objetivos)
        else:
            promedio_cumplimiento = Decimal(0)

        return {
            "total_objetivos": total_objetivos,
            "objetivos_activos": objetivos_activos,
            "objetivos_completados": objetivos_completados,
            "objetivos_pausados": objetivos_pausados,
            "monto_total_objetivos": monto_total_objetivos,
            "monto_total_guardado": monto_total_guardado,
            "monto_restante": monto_restante,
            "progreso_global_porcentaje": progreso_global_porcentaje,
            "total_movimientos": total_movimientos,
            "total_aportes": total_aportes,
            "total_retiros": total_retiros,
            "suma_aportes": suma_aportes,
            "suma_retiros": suma_retiros,
            "promedio_aporte": promedio_aporte,
            "promedio_cumplimiento_objetivos": promedio_cumplimiento
        }
