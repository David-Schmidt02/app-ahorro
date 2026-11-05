"""Cupos semanales: cuánto corresponde, cuánto se gastó y cuánto queda en cada semana del mes."""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dinero import a_pesos
from app.core.fechas import semanas_del_mes, siguiente_mes
from app.models import Categoria, CupoSemanal, Movimiento, TipoMovimiento
from app.schemas.categorias import CategoriaBreve
from app.schemas.resumen import CupoDeLaSemana, CupoDelMes, CuposOut, SemanaDeCupo, SemanaDelMes


def cupo_por_dias(semanal_centavos: int, dias: int) -> int:
    """La parte del cupo que corresponde a `dias` días, redondeada a pesos enteros."""
    return round(semanal_centavos * dias / 7 / 100) * 100


@dataclass(frozen=True)
class _Semana:
    """Un cupo en una semana, en centavos. `arrastre` es lo que quedó de la semana anterior (negativo si se pasaron)."""

    desde: date
    hasta: date
    cupo: int
    arrastre: int
    gastado: int

    @property
    def _base(self) -> int:
        # Lo que se pasaron la semana pasada se descuenta entero; lo que sobró ya fue al ahorro y no se suma
        return self.cupo + min(0, self.arrastre)

    @property
    def disponible(self) -> int:
        return max(0, self._base)

    @property
    def restante(self) -> int:
        """Negativo si se pasaron; si la deuda era mayor que el cupo, lo que no se cubrió sigue a la semana siguiente."""
        return self._base - self.gastado

    def salida(self) -> dict[str, float]:
        return {
            "cupo": a_pesos(self.cupo), "arrastre": a_pesos(self.arrastre), "disponible": a_pesos(self.disponible),
            "gastado": a_pesos(self.gastado), "restante": a_pesos(self.restante),
        }


class CupoService:
    def __init__(self, db: Session, hoy: date) -> None:
        self.db = db
        self.hoy = hoy

    def de_la_semana(self) -> CuposOut | None:
        """La semana en curso de cada cupo, o None si no hay cupos."""
        inicio = self.hoy.replace(day=1)
        cupos = self._por_semana(inicio)
        if not cupos:
            return None
        indice = next(i for i, (desde, hasta) in enumerate(semanas_del_mes(inicio)) if desde <= self.hoy <= hasta)
        actual = cupos[0][1][indice]
        return CuposOut(
            desde=actual.desde,
            hasta=actual.hasta,
            cupos=[
                CupoDeLaSemana(
                    categoria=CategoriaBreve.desde(c), cupo_semanal=a_pesos(c.cupo.monto_centavos), **semanas[indice].salida()
                )
                for c, semanas in cupos
            ],
        )

    def del_mes(self, inicio: date) -> tuple[list[SemanaDelMes], list[CupoDelMes], int]:
        """Semanas del mes, cada cupo semana por semana y el aporte al ahorro (centavos) de las semanas terminadas."""
        semanas = [SemanaDelMes(desde=d, hasta=h, estado=self._estado(d, h)) for d, h in semanas_del_mes(inicio)]
        cupos = self._por_semana(inicio)
        aporte = sum(
            s.cupo - s.gastado for _, lista in cupos for s, semana in zip(lista, semanas) if semana.estado == "pasada"
        )
        return (
            semanas,
            [
                CupoDelMes(
                    categoria=CategoriaBreve.desde(c),
                    cupo_semanal=a_pesos(c.cupo.monto_centavos),
                    semanas=[SemanaDeCupo(**s.salida()) for s in lista],
                )
                for c, lista in cupos
            ],
            aporte,
        )

    def reservado(self, inicio: date) -> int:
        """Centavos que quedan por gastar de los cupos hasta fin del mes que empieza en `inicio`."""
        if self.hoy >= siguiente_mes(inicio):
            return 0
        total = 0
        for _, semanas in self._por_semana(inicio):
            actual = sum(s.restante for s in semanas if self._estado(s.desde, s.hasta) == "actual")
            futuras = sum(s.cupo for s in semanas if self._estado(s.desde, s.hasta) == "futura")
            # Si esta semana se pasaron, a las que vienen les queda menos
            total += max(0, actual + futuras)
        return total

    def _estado(self, desde: date, hasta: date) -> str:
        if hasta < self.hoy:
            return "pasada"
        return "actual" if desde <= self.hoy else "futura"

    def _por_semana(self, inicio: date) -> list[tuple[Categoria, list[_Semana]]]:
        categorias = list(
            self.db.scalars(select(Categoria).join(CupoSemanal).where(Categoria.activa).order_by(Categoria.orden, Categoria.id))
        )
        if not categorias:
            return []
        semanas = semanas_del_mes(inicio)
        gastado = self._gastado_por_dia([c.id for c in categorias], inicio)
        resultado = []
        for c in categorias:
            semanal = c.cupo.monto_centavos
            arrastre = 0
            lista = []
            for desde, hasta in semanas:
                cupo = cupo_por_dias(semanal, (hasta - desde).days + 1)
                gastado_semana = sum(total for dia, total in gastado[c.id].items() if desde <= dia <= hasta)
                semana = _Semana(desde=desde, hasta=hasta, cupo=cupo, arrastre=arrastre, gastado=gastado_semana)
                lista.append(semana)
                arrastre = semana.restante
            resultado.append((c, lista))
        return resultado

    def _gastado_por_dia(self, categorias: list[int], inicio: date) -> dict[int, dict[date, int]]:
        filas = self.db.execute(
            select(Movimiento.categoria_id, Movimiento.fecha, func.sum(Movimiento.monto_ars_centavos))
            .where(
                Movimiento.tipo == TipoMovimiento.GASTO,
                Movimiento.categoria_id.in_(categorias),
                Movimiento.fecha >= inicio,
                Movimiento.fecha < siguiente_mes(inicio),
            )
            .group_by(Movimiento.categoria_id, Movimiento.fecha)
        )
        gastado: dict[int, dict[date, int]] = defaultdict(dict)
        for categoria_id, fecha, total in filas:
            gastado[categoria_id][fecha] = total
        return gastado
