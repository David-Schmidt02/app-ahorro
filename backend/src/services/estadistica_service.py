"""Service para cálculo de estadísticas."""
from decimal import Decimal
from typing import Dict

from src.services.tasa_cambio_service import TasaCambioService

from src.repositories.objetivo_repository import ObjetivoRepository
from src.repositories.movimiento_repository import MovimientoRepository
from src.domain.enums import EstadoObjetivo, TipoMovimiento, Moneda
from src.log.logging_config import get_logger

logger = get_logger("estadistica_service")


class EstadisticaService:
    """Service que calcula estadísticas globales del usuario."""

    def __init__(
        self,
        objetivo_repository: ObjetivoRepository,
        movimiento_repository: MovimientoRepository,
        tasa_cambio_service: TasaCambioService
    ):
        self.objetivo_repository = objetivo_repository
        self.movimiento_repository = movimiento_repository
        self.tasa_cambio_service = tasa_cambio_service

    async def calcular_estadisticas(self) -> Dict:
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

        # Montos de objetivos (Ya están asumiéndose en USD en la BBDD)
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
        
        # Como ahora todo está en USD, simplemente sumamos
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

        res = {
            "total_objetivos": total_objetivos,
            "objetivos_activos": objetivos_activos,
            "objetivos_completados": objetivos_completados,
            "objetivos_pausados": objetivos_pausados,
            "monto_total_objetivos": round(float(monto_total_objetivos), 2),
            "monto_total_guardado": round(float(monto_total_guardado), 2),
            "monto_restante": round(float(monto_restante), 2),
            "progreso_global_porcentaje": round(float(progreso_global_porcentaje), 2),
            "total_movimientos": total_movimientos,
            "total_aportes": total_aportes,
            "total_retiros": total_retiros,
            "suma_aportes": round(float(suma_aportes), 2),
            "suma_retiros": round(float(suma_retiros), 2),
            "promedio_aporte": round(float(promedio_aporte), 2),
            "promedio_cumplimiento_objetivos": round(float(promedio_cumplimiento), 2),
            "tasa_dolar_blue": 0.0
        }

        import traceback
        # Obtener la tasa de cambio vigente
        try:
            tasa = await self.tasa_cambio_service.obtener_o_actualizar_tasa()
            res["tasa_dolar_blue"] = round(float(tasa.tasa), 2) if tasa else 0.0
            logger.info(f"EstadisticaService: tasa_dolar_blue seteada en res: {res['tasa_dolar_blue']}")
        except Exception as e:
            logger.error(f"Error al obtener tasa para estadísticas: {e}\n{traceback.format_exc()}")
            res["tasa_dolar_blue"] = 0.0

        return res
