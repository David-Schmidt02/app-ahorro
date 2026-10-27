"""Copias para descargar: la base SQLite entera y los movimientos en CSV para abrir en una planilla."""
import csv
import io
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.dinero import a_pesos
from app.models import Movimiento


def copiar_base(engine: Engine, destino: Path) -> None:
    """Copia consistente aunque haya escrituras en curso (VACUUM INTO no corre dentro de una transacción)."""
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conexion:
        conexion.exec_driver_sql("VACUUM INTO ?", (str(destino),))


def movimientos_csv(db: Session) -> str:
    salida = io.StringIO()
    # Punto y coma: es lo que espera Excel en español al abrir un CSV
    escritor = csv.writer(salida, delimiter=";")
    escritor.writerow(["fecha", "tipo", "categoria", "detalle", "monto", "moneda", "cotizacion", "monto_en_pesos", "cargado_por", "pago_programado"])
    for m in db.scalars(select(Movimiento).order_by(Movimiento.fecha, Movimiento.id)):
        escritor.writerow([
            m.fecha.isoformat(), m.tipo.value, m.categoria.nombre, m.descripcion or "",
            _numero(a_pesos(m.monto_centavos)), m.moneda.value, _numero(m.cotizacion) if m.cotizacion else "",
            _numero(a_pesos(m.monto_ars_centavos)), m.creado_por.nombre if m.creado_por else "", "sí" if m.programado_id else "",
        ])
    # BOM para que Excel reconozca los acentos
    return "﻿" + salida.getvalue()


def _numero(valor: float) -> str:
    return f"{valor:.2f}".replace(".", ",")
