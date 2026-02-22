"""Entidad de dominio TasaCambio."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from src.domain.enums import TipoCotizacion



class TasaCambio:
    """Entidad de dominio que representa una tasa de cambio entre monedas."""

    def __init__(
        self,
        moneda_origen: str,
        moneda_destino: str,
        tasa: Decimal,
        tipo_cotizacion: TipoCotizacion,
        fuente: str,
        id: Optional[int] = None,
        fecha: Optional[datetime] = None
    ):
        self.id = id
        self.moneda_origen = moneda_origen
        self.moneda_destino = moneda_destino
        self.tasa = tasa
        self.tipo_cotizacion = tipo_cotizacion
        self.fuente = fuente
        self.fecha = fecha or datetime.now()

        self._validar_invariantes()

    def _validar_invariantes(self) -> None:
        """Valida las reglas de negocio invariantes de la entidad."""
        if self.tasa <= 0:
            raise ValueError("La tasa de cambio debe ser mayor a cero")

        if self.moneda_origen == self.moneda_destino:
            raise ValueError("La moneda origen y destino deben ser diferentes")

    def convertir(self, monto: Decimal) -> Decimal:
        """
        Convierte un monto usando esta tasa de cambio.

        Args:
            monto: Monto a convertir

        Returns:
            Decimal: Monto convertido
        """
        if monto < 0:
            raise ValueError("El monto a convertir no puede ser negativo")

        return (monto / self.tasa).quantize(Decimal("0.01"))

    def esta_vigente(self, horas_vigencia: int = 24) -> bool:
        """
        Verifica si la tasa aún está vigente.

        Args:
            horas_vigencia: Horas de vigencia de la tasa (default: 24)

        Returns:
            bool: True si la tasa está vigente
        """
        ahora = datetime.now()
        diferencia = ahora - self.fecha
        return diferencia.total_seconds() / 3600 < horas_vigencia

    def __repr__(self) -> str:
        return f"<TasaCambio(id={self.id}, {self.moneda_origen}/{self.moneda_destino}={self.tasa}, tipo={self.tipo_cotizacion})>"
