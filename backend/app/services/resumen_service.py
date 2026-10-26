"""Cómo viene el mes: lo que entró, lo que salió, lo que falta y el objetivo de ahorro."""
from collections import defaultdict
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dinero import a_pesos, convertir_a_ars
from app.core.exceptions import ServicioExternoNoDisponible
from app.core.fechas import mes_anterior, parsear_mes, siguiente_mes
from app.models import Categoria, Moneda, Movimiento, TipoMovimiento
from app.schemas.categorias import CategoriaBreve
from app.schemas.resumen import CategoriaDelMes, ResumenOut
from app.services.preferencias_service import PreferenciasService
from app.services.programado_service import ProgramadoService


class ResumenService:
    def __init__(self, db: Session, programados: ProgramadoService) -> None:
        self.db = db
        self.programados = programados

    def del_mes(self, mes: str) -> ResumenOut:
        inicio = parsear_mes(mes)
        totales = self._totales_por_tipo(inicio)
        ingresos = totales[TipoMovimiento.INGRESO]
        gastos = totales[TipoMovimiento.GASTO]

        vencimientos = self.programados.vencimientos(mes)
        pendientes = [v for v in vencimientos if not v.pagado]
        pendiente_ingresos = sum(v.monto_ars for v in pendientes if v.tipo == TipoMovimiento.INGRESO)
        pendiente_gastos = sum(v.monto_ars for v in pendientes if v.tipo == TipoMovimiento.GASTO)

        pendiente_por_categoria: dict[int, float] = defaultdict(float)
        for v in pendientes:
            if v.tipo == TipoMovimiento.GASTO:
                pendiente_por_categoria[v.categoria.id] += v.monto_ars

        preferencias = PreferenciasService(self.db).obtener()
        ahorro = a_pesos(ingresos - gastos)
        return ResumenOut(
            mes=mes,
            ingresos=a_pesos(ingresos),
            gastos=a_pesos(gastos),
            ahorro=ahorro,
            pendiente_ingresos=round(pendiente_ingresos, 2),
            pendiente_gastos=round(pendiente_gastos, 2),
            proyeccion=round(ahorro + pendiente_ingresos - pendiente_gastos, 2),
            objetivo=a_pesos(preferencias.objetivo_centavos),
            objetivo_moneda=preferencias.objetivo_moneda,
            objetivo_ars=self._objetivo_en_pesos(preferencias.objetivo_centavos, preferencias.objetivo_moneda),
            gastos_mes_anterior=a_pesos(self._totales_por_tipo(mes_anterior(inicio))[TipoMovimiento.GASTO]),
            categorias=self._categorias(inicio, pendiente_por_categoria),
            vencimientos=vencimientos,
        )

    def _rango(self, inicio: date) -> tuple:
        return Movimiento.fecha >= inicio, Movimiento.fecha < siguiente_mes(inicio)

    def _totales_por_tipo(self, inicio: date) -> dict[TipoMovimiento, int]:
        filas = self.db.execute(
            select(Movimiento.tipo, func.sum(Movimiento.monto_ars_centavos))
            .where(*self._rango(inicio))
            .group_by(Movimiento.tipo)
        )
        totales = {tipo: 0 for tipo in TipoMovimiento}
        totales.update({tipo: total or 0 for tipo, total in filas})
        return totales

    def _categorias(self, inicio: date, pendiente_por_categoria: dict[int, float]) -> list[CategoriaDelMes]:
        gastado = dict(
            self.db.execute(
                select(Movimiento.categoria_id, func.sum(Movimiento.monto_ars_centavos))
                .where(*self._rango(inicio), Movimiento.tipo == TipoMovimiento.GASTO)
                .group_by(Movimiento.categoria_id)
            ).all()
        )
        categorias = self.db.scalars(select(Categoria).where(Categoria.tipo == TipoMovimiento.GASTO)).all()
        filas = [
            CategoriaDelMes(
                categoria=CategoriaBreve.desde(c),
                gastado=a_pesos(gastado.get(c.id, 0)),
                pendiente=round(pendiente_por_categoria.get(c.id, 0), 2),
                presupuesto=a_pesos(c.presupuesto_centavos),
            )
            for c in categorias
            if c.id in gastado or c.id in pendiente_por_categoria or (c.activa and c.presupuesto_centavos)
        ]
        return sorted(filas, key=lambda f: (-(f.gastado + f.pendiente), f.categoria.nombre))

    def _objetivo_en_pesos(self, centavos: int | None, moneda: Moneda) -> float | None:
        if centavos is None or moneda == Moneda.ARS:
            return a_pesos(centavos)
        try:
            return a_pesos(convertir_a_ars(centavos, self.programados.movimientos.cotizaciones.venta()))
        except ServicioExternoNoDisponible:
            return None
