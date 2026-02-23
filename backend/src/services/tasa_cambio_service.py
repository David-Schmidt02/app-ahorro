"""Service para la lógica de negocio de TasaCambio."""
from decimal import Decimal
from typing import List, Optional
import httpx

from src.domain.tasa_cambio import TasaCambio
from src.repositories.tasa_cambio_repository import TasaCambioRepository
from src.domain.enums import TipoCotizacion, Moneda
from src.config.settings import get_settings
from src.log.logging_config import get_logger

logger = get_logger("tasa_cambio_service")

class TasaCambioService:
    """Service que orquesta la lógica de negocio de tasas de cambio."""

    def __init__(self, repository: TasaCambioRepository):
        self.repository = repository

    async def obtener_tasa_desde_api(self, tipo_cotizacion: TipoCotizacion) -> Decimal:
        """
        Obtiene la tasa de cambio desde la API externa (dolarapi.com).

        Args:
            tipo_cotizacion: Tipo de cotización a obtener

        Returns:
            Decimal: Tasa de cambio

        Raises:
            ValueError: Si hay error al obtener la tasa
        """
        try:
            url = f"https://dolarapi.com/v1/dolares/{tipo_cotizacion.value.lower()}"
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()

                # dolarapi retorna {"compra": X, "venta": Y, ...}
                # Usamos el promedio de compra y venta
                compra = Decimal(str(data.get("compra", 0)))
                venta = Decimal(str(data.get("venta", 0)))

                if compra == 0 or venta == 0:
                    raise ValueError("Tasa inválida recibida de la API")

                tasa_promedio = (compra + venta) / Decimal("2")
                return tasa_promedio

        except httpx.HTTPError as e:
            raise ValueError(f"Error al obtener tasa de cambio: {str(e)}") from e
        except (KeyError, ValueError) as e:
            raise ValueError(f"Error al parsear respuesta de API: {str(e)}") from e

    async def actualizar_tasa(self, tipo_cotizacion: Optional[TipoCotizacion] = None) -> TasaCambio:
        """
        Actualiza la tasa de cambio desde la API y la persiste.

        Args:
            tipo_cotizacion: Tipo de cotización (usa default de config si no se especifica)

        Returns:
            TasaCambio: Tasa actualizada
        """
        if not tipo_cotizacion:
            settings = get_settings()
            tipo_cotizacion = TipoCotizacion(settings.tasa_cambio.tipo_cotizacion_default)

        # Obtener tasa desde API
        tasa_valor = await self.obtener_tasa_desde_api(tipo_cotizacion)

        # Crear entidad de dominio
        tasa = TasaCambio(
            moneda_origen=Moneda.ARS.value,
            moneda_destino=Moneda.USD.value,
            tasa=tasa_valor,
            tipo_cotizacion=tipo_cotizacion,
            fuente="dolarapi.com"
        )

        # Persistir
        nueva_tasa = self.repository.crear(tasa)
        if not nueva_tasa:
            raise ValueError("No se pudo crear la tasa de cambio en la base de datos")
        return nueva_tasa

    def obtener_tasa_vigente(self, tipo_cotizacion: Optional[TipoCotizacion] = None) -> Optional[TasaCambio]:
        """
        Obtiene la tasa de cambio vigente (última registrada y aún válida).

        Args:
            tipo_cotizacion: Tipo de cotización (usa default de config si no se especifica)

        Returns:
            TasaCambio: Tasa vigente o None si no hay una vigente
        """
        if not tipo_cotizacion:
            settings = get_settings()
            tipo_cotizacion = TipoCotizacion(settings.tasa_cambio.tipo_cotizacion_default)

        # Obtener última tasa
        tasa = self.repository.obtener_ultima(
            moneda_origen=Moneda.ARS.value,
            moneda_destino=Moneda.USD.value,
            tipo_cotizacion=tipo_cotizacion
        )

        if not tasa:
            logger.info(f"No se encontró ninguna tasa registrada para {tipo_cotizacion.value}")
            return None

        # Verificar si está vigente
        settings = get_settings()
        vigente = tasa.esta_vigente(horas_vigencia=settings.tasa_cambio.horas_vigencia)
        logger.info(f"Tasa encontrada: {tasa.tasa} ({tasa.fecha}). Vigente: {vigente}")
        
        if vigente:
            return tasa

        return None

    async def obtener_o_actualizar_tasa(self, tipo_cotizacion: Optional[TipoCotizacion] = None) -> TasaCambio:
        """
        Obtiene la tasa vigente o la actualiza si no hay una vigente.
        Implementa fallback: si la actualización falla, intenta usar la última registrada.

        Args:
            tipo_cotizacion: Tipo de cotización (usa default de config si no se especifica)

        Returns:
            TasaCambio: Tasa vigente, recién actualizada o última disponible.

        Raises:
            ValueError: Si no existe ninguna tasa en la base de datos y la API falla.
        """
        tasa_vigente = self.obtener_tasa_vigente(tipo_cotizacion)

        if tasa_vigente:
            return tasa_vigente

        # No hay tasa vigente, intentar actualizar
        try:
            return await self.actualizar_tasa(tipo_cotizacion)
        except Exception as e:
            logger.warning(f"Error al actualizar tasa desde API ({e}). Usando fallback de base de datos.")
            
            # Fallback: buscar la última registrada sin importar vigencia
            if not tipo_cotizacion:
                settings = get_settings()
                tipo_cotizacion = TipoCotizacion(settings.tasa_cambio.tipo_cotizacion_default)
            
            tasa_fallback = self.repository.obtener_ultima(
                moneda_origen=Moneda.ARS.value,
                moneda_destino=Moneda.USD.value,
                tipo_cotizacion=tipo_cotizacion
            )
            
            if tasa_fallback:
                return tasa_fallback
                
            # Si ni siquiera hay fallback, propagar error
            raise ValueError("No se pudo obtener tasa de API ni de base de datos locales.")

    async def convertir(
        self,
        monto: Decimal,
        moneda_origen: Moneda,
        moneda_destino: Moneda,
        tipo_cotizacion: Optional[TipoCotizacion] = None
    ) -> Decimal:
        """
        Convierte un monto de una moneda a otra usando la tasa vigente.
        Si la tasa no existe o expiró, la actualiza automáticamente.

        Args:
            monto: Monto a convertir
            moneda_origen: Moneda origen
            moneda_destino: Moneda destino
            tipo_cotizacion: Tipo de cotización (usa default de config si no se especifica)

        Returns:
            Decimal: Monto convertido

        Raises:
            ValueError: Si hay error al obtener/actualizar la tasa o monedas no soportadas
        """
        # Si las monedas son iguales, no convertir
        if moneda_origen == moneda_destino:
            return monto

        # Validar que la conversión sea ARS <-> USD
        if not ((moneda_origen == Moneda.ARS and moneda_destino == Moneda.USD) or
                (moneda_origen == Moneda.USD and moneda_destino == Moneda.ARS)):
            raise ValueError("Solo se soporta conversión entre ARS y USD")

        # Obtener tasa vigente o actualizarla automáticamente
        tasa = await self.obtener_o_actualizar_tasa(tipo_cotizacion)

        # Convertir según la dirección
        if moneda_origen == Moneda.ARS and moneda_destino == Moneda.USD:
            # ARS -> USD: dividir por la tasa
            return tasa.convertir(monto)
        else:
            # USD -> ARS: multiplicar por la tasa
            return (monto * tasa.tasa).quantize(Decimal("0.01"))

    def listar_tasas_por_tipo(self, tipo_cotizacion: TipoCotizacion) -> List[TasaCambio]:
        """
        Lista todas las tasas de un tipo específico.

        Args:
            tipo_cotizacion: Tipo de cotización

        Returns:
            List[TasaCambio]: Lista de tasas
        """
        return self.repository.listar_por_tipo(tipo_cotizacion)

    def listar_todas_tasas(self) -> List[TasaCambio]:
        """
        Lista todas las tasas registradas.

        Returns:
            List[TasaCambio]: Lista de tasas
        """
        return self.repository.listar_todas()
