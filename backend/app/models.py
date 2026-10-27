"""Modelos ORM. Los montos se guardan en centavos para evitar errores de redondeo."""
from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TipoMovimiento(StrEnum):
    GASTO = "gasto"
    INGRESO = "ingreso"


class Moneda(StrEnum):
    ARS = "ARS"
    USD = "USD"


class Frecuencia(StrEnum):
    MENSUAL = "mensual"
    UNICA = "unica"


class TipoEvento(StrEnum):
    CUMPLEANOS = "cumpleanos"
    ANIVERSARIO = "aniversario"
    SALIDA = "salida"
    RECORDATORIO = "recordatorio"
    OTRO = "otro"


def _enum(tipo: type[StrEnum]) -> Enum:
    """Guarda el valor del enum (ej. 'gasto') como texto, sin tipo nativo."""
    return Enum(tipo, native_enum=False, values_callable=lambda e: [m.value for m in e], length=20)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))
    email: Mapped[str] = mapped_column(String(120), unique=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40))
    icono: Mapped[str] = mapped_column(String(30), comment="Nombre del ícono (lo dibuja el frontend)")
    color: Mapped[str] = mapped_column(String(7))
    tipo: Mapped[TipoMovimiento] = mapped_column(_enum(TipoMovimiento))
    presupuesto_centavos: Mapped[int | None]
    orden: Mapped[int] = mapped_column(default=0)
    activa: Mapped[bool] = mapped_column(default=True)


class Programado(Base):
    """Pago o cobro que se espera: todos los meses un día dado, o una única vez en una fecha."""

    __tablename__ = "programados"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))
    tipo: Mapped[TipoMovimiento] = mapped_column(_enum(TipoMovimiento))
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias.id", ondelete="RESTRICT"))
    monto_centavos: Mapped[int]
    moneda: Mapped[Moneda] = mapped_column(_enum(Moneda), default=Moneda.ARS)
    frecuencia: Mapped[Frecuencia] = mapped_column(_enum(Frecuencia))
    dia: Mapped[int | None]
    fecha: Mapped[date | None]
    desde: Mapped[date]
    hasta: Mapped[date | None]
    cuotas: Mapped[int | None] = mapped_column(comment="Cantidad de cuotas si es una compra en cuotas")
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())

    categoria: Mapped[Categoria] = relationship(lazy="joined")


class Movimiento(Base):
    __tablename__ = "movimientos"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[TipoMovimiento] = mapped_column(_enum(TipoMovimiento))
    monto_centavos: Mapped[int]
    moneda: Mapped[Moneda] = mapped_column(_enum(Moneda), default=Moneda.ARS)
    cotizacion: Mapped[float | None]
    monto_ars_centavos: Mapped[int]
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias.id", ondelete="RESTRICT"))
    descripcion: Mapped[str | None] = mapped_column(String(120))
    fecha: Mapped[date] = mapped_column(index=True)
    programado_id: Mapped[int | None] = mapped_column(
        ForeignKey("programados.id", ondelete="SET NULL"), index=True
    )
    periodo: Mapped[date | None] = mapped_column(comment="Mes del programado que salda (día 1)")
    creado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"))
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())

    categoria: Mapped[Categoria] = relationship(lazy="joined")
    creado_por: Mapped[Usuario | None] = relationship(lazy="joined")


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(80))
    tipo: Mapped[TipoEvento] = mapped_column(_enum(TipoEvento))
    fecha: Mapped[date]
    hora: Mapped[str | None] = mapped_column(String(5))
    anual: Mapped[bool] = mapped_column(default=False)
    creado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"))


class CalendarioExterno(Base):
    """Calendario de afuera (ej. la dirección secreta iCal de Google Calendar) cuyos eventos se muestran en el de la app."""

    __tablename__ = "calendarios_externos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40))
    url: Mapped[str] = mapped_column(String(500))
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class Preferencias(Base):
    """Fila única con la configuración compartida de la casa."""

    __tablename__ = "preferencias"

    id: Mapped[int] = mapped_column(primary_key=True)
    objetivo_centavos: Mapped[int | None]
    objetivo_moneda: Mapped[Moneda] = mapped_column(_enum(Moneda), default=Moneda.ARS)


class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    compra: Mapped[float]
    venta: Mapped[float]
    fuente: Mapped[str] = mapped_column(String(40))
    obtenida_en: Mapped[datetime] = mapped_column(index=True)
