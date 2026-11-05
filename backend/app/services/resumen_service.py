"""Cómo viene el mes: lo que entró, lo que salió, lo que falta y el objetivo de ahorro."""
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dinero import a_pesos, convertir_a_ars
from app.core.exceptions import ServicioExternoNoDisponible
from app.core.fechas import mes_anterior, parsear_mes, siguiente_mes
from app.models import Categoria, Moneda, Movimiento, TipoMovimiento
from app.schemas.categorias import CategoriaBreve
from app.schemas.resumen import CategoriaDelMes, CuposDelMesOut, DiaGasto, DiarioOut, EvolucionOut, MesEvolucion, ResumenOut
from app.services.cupo_service import CupoService, cupo_por_dias
from app.services.preferencias_service import PreferenciasService
from app.services.programado_service import ProgramadoService


class ResumenService:
    def __init__(self, db: Session, programados: ProgramadoService, hoy: date) -> None:
        self.db = db
        self.programados = programados
        self.cupos = CupoService(db, hoy)
        self.hoy = hoy

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
        reservado_cupos = a_pesos(self.cupos.reservado(inicio))
        es_el_mes_en_curso = inicio == self.hoy.replace(day=1)
        return ResumenOut(
            mes=mes,
            ingresos=a_pesos(ingresos),
            gastos=a_pesos(gastos),
            ahorro=ahorro,
            pendiente_ingresos=round(pendiente_ingresos, 2),
            pendiente_gastos=round(pendiente_gastos, 2),
            reservado_cupos=reservado_cupos,
            proyeccion=round(ahorro + pendiente_ingresos - pendiente_gastos - reservado_cupos, 2),
            objetivo=a_pesos(preferencias.objetivo_centavos),
            objetivo_moneda=preferencias.objetivo_moneda,
            objetivo_ars=self._objetivo_en_pesos(preferencias.objetivo_centavos, preferencias.objetivo_moneda),
            gastos_mes_anterior=a_pesos(self._totales_por_tipo(mes_anterior(inicio))[TipoMovimiento.GASTO]),
            categorias=self._categorias(inicio, pendiente_por_categoria),
            vencimientos=vencimientos,
            cupos=self.cupos.de_la_semana() if es_el_mes_en_curso else None,
        )

    def evolucion(self, hasta: str, meses: int) -> EvolucionOut:
        """Ingresos, gastos y ahorro de los `meses` meses que terminan en `hasta` (incluido)."""
        fin = siguiente_mes(parsear_mes(hasta))
        inicios = [mes_anterior(fin)]
        while len(inicios) < meses:
            inicios.append(mes_anterior(inicios[-1]))
        inicios.reverse()
        mes_de = func.strftime("%Y-%m", Movimiento.fecha)
        filas = self.db.execute(
            select(mes_de, Movimiento.tipo, func.sum(Movimiento.monto_ars_centavos))
            .where(Movimiento.fecha >= inicios[0], Movimiento.fecha < fin)
            .group_by(mes_de, Movimiento.tipo)
        )
        totales: dict[tuple[str, TipoMovimiento], int] = {(mes, tipo): total for mes, tipo, total in filas}
        resultado = []
        for inicio in inicios:
            clave = inicio.strftime("%Y-%m")
            ingresos = totales.get((clave, TipoMovimiento.INGRESO), 0)
            gastos = totales.get((clave, TipoMovimiento.GASTO), 0)
            resultado.append(
                MesEvolucion(mes=clave, ingresos=a_pesos(ingresos), gastos=a_pesos(gastos), ahorro=a_pesos(ingresos - gastos))
            )
        preferencias = PreferenciasService(self.db).obtener()
        return EvolucionOut(
            meses=resultado,
            objetivo_ars=self._objetivo_en_pesos(preferencias.objetivo_centavos, preferencias.objetivo_moneda),
        )

    def cupos_del_mes(self, mes: str) -> CuposDelMesOut:
        semanas, cupos, aporte = self.cupos.del_mes(parsear_mes(mes))
        preferencias = PreferenciasService(self.db).obtener()
        return CuposDelMesOut(
            mes=mes, semanas=semanas, cupos=cupos, aporte=a_pesos(aporte),
            objetivo_ars=self._objetivo_en_pesos(preferencias.objetivo_centavos, preferencias.objetivo_moneda),
        )

    def diario(self, desde: date, hasta: date) -> DiarioOut:
        """Lo gastado cada día entre `desde` y `hasta` (incluidos), con la parte que salda pagos programados."""
        filas = self.db.execute(
            select(Movimiento.fecha, Movimiento.programado_id.is_not(None), func.sum(Movimiento.monto_ars_centavos))
            .where(Movimiento.tipo == TipoMovimiento.GASTO, Movimiento.fecha >= desde, Movimiento.fecha <= hasta)
            .group_by(Movimiento.fecha, Movimiento.programado_id.is_not(None))
        )
        gastos: dict[date, int] = defaultdict(int)
        fijos: dict[date, int] = defaultdict(int)
        for fecha, es_programado, total in filas:
            gastos[fecha] += total
            if es_programado:
                fijos[fecha] += total
        dias = [desde + timedelta(days=n) for n in range((hasta - desde).days + 1)]
        return DiarioOut(dias=[DiaGasto(fecha=d, gastos=a_pesos(gastos[d]), fijos=a_pesos(fijos[d])) for d in dias])

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
        gastado: dict[int, int] = defaultdict(int)
        gastado_programado: dict[int, int] = defaultdict(int)
        filas_gasto = self.db.execute(
            select(Movimiento.categoria_id, Movimiento.programado_id.is_not(None), func.sum(Movimiento.monto_ars_centavos))
            .where(*self._rango(inicio), Movimiento.tipo == TipoMovimiento.GASTO)
            .group_by(Movimiento.categoria_id, Movimiento.programado_id.is_not(None))
        )
        for categoria_id, es_programado, total in filas_gasto:
            gastado[categoria_id] += total
            if es_programado:
                gastado_programado[categoria_id] += total
        categorias = self.db.scalars(select(Categoria).where(Categoria.tipo == TipoMovimiento.GASTO)).all()
        dias_del_mes = (siguiente_mes(inicio) - inicio).days
        filas = [
            CategoriaDelMes(
                categoria=CategoriaBreve.desde(c),
                gastado=a_pesos(gastado.get(c.id, 0)),
                gastado_programado=a_pesos(gastado_programado.get(c.id, 0)),
                pendiente=round(pendiente_por_categoria.get(c.id, 0), 2),
                presupuesto=a_pesos(
                    cupo_por_dias(c.cupo.monto_centavos, dias_del_mes) if c.cupo else c.presupuesto_centavos
                ),
                cupo_semanal=a_pesos(c.cupo.monto_centavos) if c.cupo else None,
            )
            for c in categorias
            if c.id in gastado or c.id in pendiente_por_categoria or (c.activa and (c.presupuesto_centavos or c.cupo))
        ]
        return sorted(filas, key=lambda f: (-(f.gastado + f.pendiente), f.categoria.nombre))

    def _objetivo_en_pesos(self, centavos: int | None, moneda: Moneda) -> float | None:
        if centavos is None or moneda == Moneda.ARS:
            return a_pesos(centavos)
        try:
            return a_pesos(convertir_a_ars(centavos, self.programados.movimientos.cotizaciones.venta()))
        except ServicioExternoNoDisponible:
            return None
