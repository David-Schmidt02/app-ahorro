"""Entidad de dominio Objetivo."""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from dateutil.relativedelta import relativedelta
import json

from src.domain.enums import Moneda, EstadoObjetivo



class Objetivo:
    """Entidad de dominio que representa un objetivo de ahorro."""

    def __init__(
        self,
        nombre: str,
        monto_objetivo: Decimal,
        moneda: Moneda,
        fecha_limite: date,
        descripcion: Optional[str] = None,
        monto_actual: Decimal = Decimal("0"),
        estado: EstadoObjetivo = EstadoObjetivo.ACTIVO,
        es_prioritario: bool = False,
        completado: bool = False,
        historial_progreso: str = "[]",
        id: Optional[int] = None,
        fecha_creacion: Optional[datetime] = None
    ):
        self.id = id
        self.nombre = nombre
        self.descripcion = descripcion
        self.monto_objetivo = monto_objetivo
        self.monto_actual = monto_actual
        self.moneda = moneda
        self.fecha_limite = fecha_limite
        self.fecha_creacion = fecha_creacion or datetime.now()
        self.estado = estado
        self.es_prioritario = es_prioritario
        self.completado = completado
        self.historial_progreso = historial_progreso

        self._validar_invariantes()

    def _validar_invariantes(self) -> None:
        """Valida las reglas de negocio invariantes de la entidad."""
        if self.monto_objetivo <= 0:
            raise ValueError("El monto objetivo debe ser mayor a cero")

        if self.monto_actual < 0:
            raise ValueError("El monto actual no puede ser negativo")

        if self.fecha_limite < date.today() and self.estado == EstadoObjetivo.ACTIVO:
            raise ValueError("La fecha límite no puede ser anterior a hoy para objetivos activos")

    def postergar_fecha_limite(self, nueva_fecha: date) -> None:
        """
        Posterga la fecha límite del objetivo.

        Args:
            nueva_fecha: Nueva fecha límite

        Raises:
            DomainError: Si la nueva fecha es anterior a la actual o si el objetivo está completado
        """
        if self.completado:
            raise ValueError("No se puede postergar la fecha de un objetivo completado")

        if nueva_fecha <= self.fecha_limite:
            raise ValueError("La nueva fecha límite debe ser posterior a la actual")

        self.fecha_limite = nueva_fecha

    def calcular_porcentaje_completado(self) -> Decimal:
        """
        Calcula el porcentaje de progreso del objetivo.

        Returns:
            Decimal: Porcentaje completado (0-100)
        """
        if self.monto_objetivo == 0:
            return Decimal("0")

        porcentaje = (self.monto_actual / self.monto_objetivo) * Decimal("100")
        return min(porcentaje, Decimal("100"))  # Cap at 100%

    def calcular_pago_mensual_requerido(self) -> Decimal:
        """
        Calcula el aporte mensual necesario para alcanzar el objetivo en la fecha límite.

        Returns:
            Decimal: Monto mensual requerido
        """
        monto_faltante = self.monto_objetivo - self.monto_actual

        if monto_faltante <= 0:
            return Decimal("0")

        hoy = date.today()
        if self.fecha_limite <= hoy:
            return monto_faltante  # Si la fecha ya pasó, necesitan todo el monto

        # Calcular meses restantes
        meses_restantes = relativedelta(self.fecha_limite, hoy).months + \
                         (relativedelta(self.fecha_limite, hoy).years * 12)

        if meses_restantes == 0:
            meses_restantes = 1  # Al menos 1 mes

        pago_mensual = monto_faltante / Decimal(meses_restantes)
        return pago_mensual.quantize(Decimal("0.01"))  # Redondear a 2 decimales

    def marcar_completado(self) -> None:
        """
        Marca el objetivo como completado.

        Raises:
            DomainError: Si el objetivo ya está completado
        """
        if self.completado:
            raise ValueError("El objetivo ya está completado")

        self.completado = True
        self.estado = EstadoObjetivo.COMPLETADO

    def agregar_monto(self, monto: Decimal) -> None:
        """
        Agrega un monto al objetivo (aporte).

        Args:
            monto: Monto a agregar

        Raises:
            DomainError: Si el monto es negativo o cero
        """
        if monto <= 0:
            raise ValueError("El monto a agregar debe ser mayor a cero")

        self.monto_actual += monto

        # Auto-completar si se alcanza el objetivo
        if self.monto_actual >= self.monto_objetivo and not self.completado:
            self.marcar_completado()

    def retirar_monto(self, monto: Decimal) -> None:
        """
        Retira un monto del objetivo.

        Args:
            monto: Monto a retirar

        Raises:
            DomainError: Si el monto es negativo, cero o excede el monto actual
        """
        if monto <= 0:
            raise ValueError("El monto a retirar debe ser mayor a cero")

        if monto > self.monto_actual:
            raise ValueError("No se puede retirar más dinero del disponible")

        self.monto_actual -= monto

        # Si estaba completado y ahora ya no alcanza, desmarcar
        if self.completado and self.monto_actual < self.monto_objetivo:
            self.completado = False
            self.estado = EstadoObjetivo.ACTIVO

    def pausar(self) -> None:
        """Pausa el objetivo."""
        if self.completado:
            raise ValueError("No se puede pausar un objetivo completado")

        self.estado = EstadoObjetivo.PAUSADO

    def reactivar(self) -> None:
        """Reactiva el objetivo."""
        if self.completado:
            raise ValueError("No se puede reactivar un objetivo completado")

        self.estado = EstadoObjetivo.ACTIVO

    def agregar_historial(self, fecha: datetime, monto_acumulado: Decimal) -> None:
        """Agrega un punto en el tiempo al historial serializado de progreso."""
        try:
            historial = json.loads(self.historial_progreso)
        except json.JSONDecodeError:
            historial = []
            
        historial.append({
            "fecha": fecha.isoformat(),
            "monto_acumulado": float(monto_acumulado)
        })
        self.historial_progreso = json.dumps(historial)

    def __repr__(self) -> str:
        return f"<Objetivo(id={self.id}, nombre='{self.nombre}', monto={self.monto_actual}/{self.monto_objetivo} {self.moneda})>"
