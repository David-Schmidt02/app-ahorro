from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dinero import a_centavos, convertir_a_ars
from app.core.exceptions import NoEncontrado
from app.core.fechas import parsear_mes, siguiente_mes
from app.models import Moneda, Movimiento, TipoMovimiento, Usuario
from app.schemas.movimientos import MovimientoIn, MovimientoUpdate
from app.services.categoria_service import CategoriaService
from app.services.cotizacion_service import CotizacionService


class MovimientoService:
    def __init__(self, db: Session, cotizaciones: CotizacionService) -> None:
        self.db = db
        self.cotizaciones = cotizaciones
        self.categorias = CategoriaService(db)

    def listar(
        self, mes: str, tipo: TipoMovimiento | None = None, categoria_id: int | None = None
    ) -> list[Movimiento]:
        inicio = parsear_mes(mes)
        consulta = (
            select(Movimiento)
            .where(Movimiento.fecha >= inicio, Movimiento.fecha < siguiente_mes(inicio))
            .order_by(Movimiento.fecha.desc(), Movimiento.id.desc())
        )
        if tipo:
            consulta = consulta.where(Movimiento.tipo == tipo)
        if categoria_id:
            consulta = consulta.where(Movimiento.categoria_id == categoria_id)
        return list(self.db.scalars(consulta))

    def obtener(self, movimiento_id: int) -> Movimiento:
        movimiento = self.db.get(Movimiento, movimiento_id)
        if movimiento is None:
            raise NoEncontrado("El movimiento no existe")
        return movimiento

    def crear(
        self,
        datos: MovimientoIn,
        usuario: Usuario,
        programado_id: int | None = None,
        periodo: date | None = None,
    ) -> Movimiento:
        self.categorias.para_movimiento(datos.categoria_id, datos.tipo)
        movimiento = Movimiento(
            tipo=datos.tipo, categoria_id=datos.categoria_id, fecha=datos.fecha,
            descripcion=(datos.descripcion or "").strip() or None,
            programado_id=programado_id, periodo=periodo, creado_por_id=usuario.id,
        )
        self._asignar_monto(movimiento, a_centavos(datos.monto), datos.moneda, datos.cotizacion)
        self.db.add(movimiento)
        self.db.commit()
        return self.obtener(movimiento.id)

    def actualizar(self, movimiento_id: int, datos: MovimientoUpdate) -> Movimiento:
        movimiento = self.obtener(movimiento_id)
        cambios = datos.model_dump(exclude_unset=True)
        if cambios.get("categoria_id") is not None:
            self.categorias.para_movimiento(cambios["categoria_id"], movimiento.tipo)
            movimiento.categoria_id = cambios["categoria_id"]
        if cambios.get("fecha") is not None:
            movimiento.fecha = cambios["fecha"]
        if "descripcion" in cambios:
            movimiento.descripcion = (cambios["descripcion"] or "").strip() or None
        if {"monto", "moneda", "cotizacion"} & cambios.keys():
            moneda = cambios.get("moneda") or movimiento.moneda
            # Si sigue en dólares y no mandan cotización, se conserva la original
            cotizacion = cambios.get("cotizacion") or (movimiento.cotizacion if moneda == Moneda.USD else None)
            centavos = a_centavos(cambios["monto"]) if cambios.get("monto") else movimiento.monto_centavos
            self._asignar_monto(movimiento, centavos, moneda, cotizacion)
        self.db.commit()
        return self.obtener(movimiento_id)

    def eliminar(self, movimiento_id: int) -> None:
        self.db.delete(self.obtener(movimiento_id))
        self.db.commit()

    def _asignar_monto(self, movimiento: Movimiento, centavos: int, moneda: Moneda, cotizacion: float | None) -> None:
        movimiento.monto_centavos = centavos
        movimiento.moneda = moneda
        if moneda == Moneda.ARS:
            movimiento.cotizacion = None
            movimiento.monto_ars_centavos = centavos
            return
        movimiento.cotizacion = cotizacion or self.cotizaciones.venta()
        movimiento.monto_ars_centavos = convertir_a_ars(centavos, movimiento.cotizacion)
