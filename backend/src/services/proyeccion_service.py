"""Service para cálculo de proyecciones."""
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional, Dict

from src.repositories.objetivo_repository import ObjetivoRepository
from src.repositories.movimiento_repository import MovimientoRepository
from src.services.tasa_cambio_service import TasaCambioService
from src.domain.enums import TipoMovimiento, TipoCotizacion
from src.config import get_settings


class ProyeccionService:
    """Service que calcula proyecciones de cumplimiento de objetivos."""

    def __init__(
        self,
        objetivo_repository: ObjetivoRepository,
        movimiento_repository: MovimientoRepository,
        tasa_cambio_service: TasaCambioService
    ):
        self.objetivo_repository = objetivo_repository
        self.movimiento_repository = movimiento_repository
        self.tasa_cambio_service = tasa_cambio_service

    async def calcular_proyeccion(self, objetivo_id: int) -> Dict:
        """
        Calcula la proyección de cumplimiento de un objetivo.

        Args:
            objetivo_id: ID del objetivo

        Returns:
            Dict: Datos de la proyección

        Raises:
            KeyError: Si el objetivo no existe
        """
        # Obtener objetivo
        objetivo = self.objetivo_repository.obtener_por_id(objetivo_id)
        if not objetivo:
            raise KeyError(f"No se encontró el objetivo con id {objetivo_id}")

        # Obtener movimientos del objetivo
        movimientos = self.movimiento_repository.listar_por_objetivo(objetivo_id)

        # Calcular monto restante
        porcentaje = objetivo.calcular_porcentaje_completado()
        monto_acumulado = objetivo.monto_objetivo * (porcentaje / Decimal(100))
        monto_restante = objetivo.monto_objetivo - monto_acumulado

        # Si ya está completado
        if monto_restante <= 0:
            return {
                "objetivo_id": objetivo_id,
                "monto_restante": Decimal(0),
                "promedio_mensual_aportes": Decimal(0),
                "meses_estimados_restantes": 0,
                "fecha_cumplimiento_estimada": date.today(),
                "mensaje": "¡Objetivo completado!"
            }

        # Calcular aportes (sin contar retiros)
        aportes = [m for m in movimientos if m.tipo == TipoMovimiento.APORTE]

        # Si no hay aportes
        if not aportes:
            return {
                "objetivo_id": objetivo_id,
                "monto_restante": monto_restante,
                "promedio_mensual_aportes": Decimal(0),
                "meses_estimados_restantes": None,
                "fecha_cumplimiento_estimada": None,
                "mensaje": "Aún no hay aportes registrados para calcular proyección"
            }

        # Calcular promedio mensual de aportes
        fecha_primer_aporte = min(m.fecha for m in aportes).date()
        fecha_ultimo_aporte = max(m.fecha for m in aportes).date()

        # Calcular meses transcurridos
        delta = relativedelta(fecha_ultimo_aporte, fecha_primer_aporte)
        meses_transcurridos = delta.years * 12 + delta.months + delta.days / 30

        # Si es menos de un mes, usar ese período
        if meses_transcurridos < 1:
            meses_transcurridos = max(Decimal(1), Decimal(delta.days) / Decimal(30))

        # Calcular promedio mensual
        suma_aportes = Decimal("0")
        for m in aportes:
            monto_convertido = await self.tasa_cambio_service.convertir(
                monto=m.monto,
                moneda_origen=m.moneda,
                moneda_destino=objetivo.moneda
            )
            suma_aportes += monto_convertido
            
        promedio_mensual = suma_aportes / Decimal(meses_transcurridos)

        # Proyectar meses restantes
        if promedio_mensual > 0:
            meses_estimados = float(monto_restante / promedio_mensual)
            meses_estimados_int = int(round(meses_estimados))

            # Calcular fecha estimada de cumplimiento
            fecha_estimada = date.today() + relativedelta(months=meses_estimados_int)

            # Mensaje personalizado
            if meses_estimados_int < 1:
                mensaje = "A este ritmo, alcanzarás tu objetivo muy pronto (menos de un mes)"
            elif meses_estimados_int == 1:
                mensaje = "A este ritmo, alcanzarás tu objetivo en aproximadamente 1 mes"
            elif meses_estimados_int <= 6:
                mensaje = f"A este ritmo, alcanzarás tu objetivo en {meses_estimados_int} meses"
            else:
                años = meses_estimados_int // 12
                meses = meses_estimados_int % 12
                if años == 1 and meses == 0:
                    mensaje = "A este ritmo, alcanzarás tu objetivo en aproximadamente 1 año"
                elif años == 1:
                    mensaje = f"A este ritmo, alcanzarás tu objetivo en 1 año y {meses} meses"
                elif meses == 0:
                    mensaje = f"A este ritmo, alcanzarás tu objetivo en {años} años"
                else:
                    mensaje = f"A este ritmo, alcanzarás tu objetivo en {años} años y {meses} meses"

            return {
                "objetivo_id": objetivo_id,
                "monto_restante": monto_restante,
                "promedio_mensual_aportes": promedio_mensual,
                "meses_estimados_restantes": meses_estimados_int,
                "fecha_cumplimiento_estimada": fecha_estimada,
                "mensaje": mensaje
            }
        else:
            return {
                "objetivo_id": objetivo_id,
                "monto_restante": monto_restante,
                "promedio_mensual_aportes": Decimal(0),
                "meses_estimados_restantes": None,
                "fecha_cumplimiento_estimada": None,
                "mensaje": "No hay aportes suficientes para calcular proyección"
            }
