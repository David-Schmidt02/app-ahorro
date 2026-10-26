"""Pagos y cobros programados, y su estado (pagado o pendiente) en cada mes."""
from datetime import date

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.dinero import a_centavos, a_pesos, convertir_a_ars
from app.core.exceptions import Conflicto, NoEncontrado, ReglaDeNegocio
from app.core.fechas import dia_en_mes, parsear_mes, siguiente_mes
from app.models import Frecuencia, Moneda, Movimiento, Programado, Usuario
from app.schemas.categorias import CategoriaBreve
from app.schemas.movimientos import MovimientoIn
from app.schemas.programados import PagarIn, ProgramadoIn, ProgramadoUpdate, VencimientoOut
from app.services.movimiento_service import MovimientoService


class ProgramadoService:
    def __init__(self, db: Session, movimientos: MovimientoService) -> None:
        self.db = db
        self.movimientos = movimientos

    def listar(self) -> list[Programado]:
        return list(self.db.scalars(select(Programado).order_by(Programado.tipo, Programado.dia, Programado.fecha)))

    def obtener(self, programado_id: int) -> Programado:
        programado = self.db.get(Programado, programado_id)
        if programado is None:
            raise NoEncontrado("El pago programado no existe")
        return programado

    def crear(self, datos: ProgramadoIn) -> Programado:
        self.movimientos.categorias.para_movimiento(datos.categoria_id, datos.tipo)
        es_mensual = datos.frecuencia == Frecuencia.MENSUAL
        if es_mensual:
            desde = parsear_mes(datos.desde) if datos.desde else date.today().replace(day=1)
        else:
            desde = datos.fecha.replace(day=1)
        programado = Programado(
            nombre=datos.nombre.strip(), tipo=datos.tipo, categoria_id=datos.categoria_id,
            monto_centavos=a_centavos(datos.monto), moneda=datos.moneda, frecuencia=datos.frecuencia,
            dia=datos.dia if es_mensual else None, fecha=None if es_mensual else datos.fecha, desde=desde,
        )
        self.db.add(programado)
        self.db.commit()
        return self.obtener(programado.id)

    def actualizar(self, programado_id: int, datos: ProgramadoUpdate) -> Programado:
        programado = self.obtener(programado_id)
        cambios = datos.model_dump(exclude_unset=True)
        if cambios.get("categoria_id") is not None:
            self.movimientos.categorias.para_movimiento(cambios["categoria_id"], programado.tipo)
            programado.categoria_id = cambios["categoria_id"]
        if cambios.get("nombre"):
            programado.nombre = cambios["nombre"].strip()
        if cambios.get("monto") is not None:
            programado.monto_centavos = a_centavos(cambios["monto"])
        if cambios.get("moneda") is not None:
            programado.moneda = cambios["moneda"]
        if programado.frecuencia == Frecuencia.MENSUAL:
            if cambios.get("dia") is not None:
                programado.dia = cambios["dia"]
            if "hasta" in cambios:
                programado.hasta = parsear_mes(cambios["hasta"]) if cambios["hasta"] else None
        elif cambios.get("fecha") is not None:
            programado.fecha = cambios["fecha"]
            programado.desde = cambios["fecha"].replace(day=1)
        self.db.commit()
        return self.obtener(programado_id)

    def eliminar(self, programado_id: int) -> None:
        """Los movimientos ya pagados quedan, solo pierden el vínculo."""
        self.db.delete(self.obtener(programado_id))
        self.db.commit()

    def vencimientos(self, mes: str) -> list[VencimientoOut]:
        inicio = parsear_mes(mes)
        fin = siguiente_mes(inicio)
        programados = self.db.scalars(
            select(Programado).where(
                or_(
                    (Programado.frecuencia == Frecuencia.MENSUAL)
                    & (Programado.desde <= inicio)
                    & (Programado.hasta.is_(None) | (Programado.hasta >= inicio)),
                    (Programado.frecuencia == Frecuencia.UNICA)
                    & (Programado.fecha >= inicio)
                    & (Programado.fecha < fin),
                )
            )
        ).all()
        if not programados:
            return []
        pagos = {
            m.programado_id: m
            for m in self.db.scalars(
                select(Movimiento).where(
                    Movimiento.programado_id.in_([p.id for p in programados]), Movimiento.periodo == inicio
                )
            )
        }
        cotizacion: float | None = None
        resultado = []
        for p in programados:
            pago = pagos.get(p.id)
            if pago:
                monto, moneda, monto_ars = pago.monto_centavos, pago.moneda, pago.monto_ars_centavos
            else:
                monto, moneda, monto_ars = p.monto_centavos, p.moneda, p.monto_centavos
                if moneda == Moneda.USD:
                    cotizacion = cotizacion or self.movimientos.cotizaciones.venta()
                    monto_ars = convertir_a_ars(monto, cotizacion)
            resultado.append(
                VencimientoOut(
                    programado_id=p.id, nombre=p.nombre, tipo=p.tipo, categoria=CategoriaBreve.desde(p.categoria),
                    fecha=self._fecha_en(p, inicio), monto=a_pesos(monto), moneda=moneda,
                    monto_ars=a_pesos(monto_ars), pagado=pago is not None, movimiento_id=pago.id if pago else None,
                )
            )
        return sorted(resultado, key=lambda v: (v.fecha, v.nombre))

    def pagar(self, programado_id: int, datos: PagarIn, usuario: Usuario) -> Movimiento:
        """Registra el pago (o cobro) de un programado en un mes, con el monto real."""
        programado = self.obtener(programado_id)
        inicio = parsear_mes(datos.mes)
        if not any(v.programado_id == programado_id for v in self.vencimientos(datos.mes)):
            raise ReglaDeNegocio(f"«{programado.nombre}» no corresponde a {datos.mes}")
        ya_pagado = self.db.scalar(
            select(Movimiento.id).where(Movimiento.programado_id == programado_id, Movimiento.periodo == inicio)
        )
        if ya_pagado:
            raise Conflicto(f"«{programado.nombre}» ya está registrado en {datos.mes}")
        movimiento = MovimientoIn(
            tipo=programado.tipo,
            monto=datos.monto or a_pesos(programado.monto_centavos),
            moneda=programado.moneda,
            cotizacion=datos.cotizacion,
            categoria_id=programado.categoria_id,
            descripcion=programado.nombre,
            fecha=datos.fecha or self._fecha_en(programado, inicio),
        )
        return self.movimientos.crear(movimiento, usuario, programado_id=programado_id, periodo=inicio)

    @staticmethod
    def _fecha_en(programado: Programado, inicio: date) -> date:
        if programado.frecuencia == Frecuencia.UNICA:
            return programado.fecha
        return dia_en_mes(inicio, programado.dia)
