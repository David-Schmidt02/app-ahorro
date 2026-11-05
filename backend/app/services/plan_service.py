"""El plan del mes (fijos, cupos y presupuestos) contra lo gastado, con la proyección a fin de mes."""
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dinero import a_centavos
from app.core.fechas import siguiente_mes
from app.models import Categoria, Movimiento, TipoMovimiento
from app.schemas.programados import VencimientoOut

# Antes de este día el ritmo del mes todavía no dice nada: se proyecta con el plan
DIA_MINIMO_RITMO = 5


def _a_pesos_enteros(centavos: float) -> int:
    return round(centavos / 100) * 100


class PlanDelMes:
    """Montos en centavos por día del mes. Se arma con los vencimientos del mes ya calculados."""

    def __init__(self, db: Session, inicio: date, hoy: date, vencimientos: list[VencimientoOut]) -> None:
        self.db = db
        self.inicio = inicio
        self.fin = siguiente_mes(inicio)
        self.hoy = hoy
        self.dias = [inicio + timedelta(days=n) for n in range((self.fin - inicio).days)]
        self.vencimientos = [v for v in vencimientos if v.tipo == TipoMovimiento.GASTO]
        self.ingresos_por_cobrar = sum(a_centavos(v.monto_ars) for v in vencimientos if v.tipo == TipoMovimiento.INGRESO and not v.pagado)

    def plan_por_dia(self) -> dict[date, int]:
        """Los fijos en el día que se pagaron (o vencen) y los topes (cupo o presupuesto) repartidos por día.
        En una categoría con tope y fijos, el tope ya incluye a los fijos."""
        fechas_de_pago = self._fechas_de_pago()
        fijos: dict[int, list[tuple[date, int]]] = defaultdict(list)
        for v in self.vencimientos:
            fijos[v.categoria.id].append((fechas_de_pago.get(v.movimiento_id, v.fecha), a_centavos(v.monto_ars)))
        plan: dict[date, int] = defaultdict(int)
        for lista in fijos.values():
            for fecha, monto in lista:
                plan[fecha] += monto
        for c in self.db.scalars(select(Categoria).where(Categoria.tipo == TipoMovimiento.GASTO, Categoria.activa)):
            por_dia = self._tope_por_dia(c)
            if not por_dia:
                continue
            extra = max(0, sum(por_dia) - sum(monto for _, monto in fijos.get(c.id, [])))
            for dia, parte in zip(self.dias, por_dia):
                plan[dia] += _a_pesos_enteros(extra * parte / sum(por_dia))
        return plan

    def gastado_por_dia(self) -> tuple[dict[date, int], dict[date, int]]:
        """Lo gastado cada día y la parte que no salda pagos programados."""
        filas = self.db.execute(
            select(Movimiento.fecha, Movimiento.programado_id.is_(None), func.sum(Movimiento.monto_ars_centavos))
            .where(Movimiento.tipo == TipoMovimiento.GASTO, Movimiento.fecha >= self.inicio, Movimiento.fecha < self.fin)
            .group_by(Movimiento.fecha, Movimiento.programado_id.is_(None))
        )
        total: dict[date, int] = defaultdict(int)
        variable: dict[date, int] = defaultdict(int)
        for fecha, es_variable, monto in filas:
            total[fecha] += monto
            if es_variable:
                variable[fecha] += monto
        return total, variable

    def ingresos_cobrados(self) -> int:
        return self.db.scalar(
            select(func.coalesce(func.sum(Movimiento.monto_ars_centavos), 0)).where(
                Movimiento.tipo == TipoMovimiento.INGRESO, Movimiento.fecha >= self.inicio, Movimiento.fecha < self.fin
            )
        )

    def proyeccion_por_dia(self, plan: dict[date, int], variable: dict[date, int]) -> dict[date, int]:
        """Lo que se espera gastar cada día después de hoy: los fijos pendientes y el ritmo del día a día."""
        transcurridos = (self.hoy - self.inicio).days + 1
        if transcurridos >= DIA_MINIMO_RITMO:
            ritmo = sum(monto for dia, monto in variable.items() if dia <= self.hoy) / transcurridos
        else:
            fijos_del_mes = sum(a_centavos(v.monto_ars) for v in self.vencimientos)
            ritmo = (sum(plan.values()) - fijos_del_mes) / len(self.dias)
        manana = self.hoy + timedelta(days=1)
        proyeccion: dict[date, int] = defaultdict(int)
        for dia in self.dias:
            if dia >= manana:
                proyeccion[dia] += _a_pesos_enteros(ritmo)
        for v in self.vencimientos:
            if not v.pagado:
                proyeccion[max(v.fecha, manana)] += a_centavos(v.monto_ars)
        return proyeccion

    def _tope_por_dia(self, c: Categoria) -> list[float]:
        if c.cupo:
            return [c.cupo.monto_centavos / 7] * len(self.dias)
        if c.presupuesto_centavos:
            return [c.presupuesto_centavos / len(self.dias)] * len(self.dias)
        return []

    def _fechas_de_pago(self) -> dict[int, date]:
        ids = [v.movimiento_id for v in self.vencimientos if v.movimiento_id]
        if not ids:
            return {}
        return dict(self.db.execute(select(Movimiento.id, Movimiento.fecha).where(Movimiento.id.in_(ids))).all())
