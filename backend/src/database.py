"""Configuración de la base de datos y modelos ORM de SQLAlchemy."""
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import create_engine, Column, Integer, String, Numeric, DateTime, Date, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

from src.config import settings
from src.domain.enums import Moneda, EstadoObjetivo, TipoMovimiento, TipoCotizacion, EstadoPropiedad


# check_same_thread=False: FastAPI usa la sesión desde distintos threads
engine = create_engine(
    settings.database.url,
    echo=settings.database.echo,
    connect_args={"check_same_thread": False}
)

# Crear session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos ORM
Base = declarative_base()


# Dependency para obtener DB session
def get_db():
    """Dependency que proporciona una sesión de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Modelos ORM (Mapeo a tablas de PostgreSQL)

class UsuarioORM(Base):
    """Modelo ORM para la tabla usuarios."""
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.now, nullable=False)

    # Relaciones
    movimientos = relationship("MovimientoORM", back_populates="usuario")
    gastos = relationship("GastoORM", back_populates="usuario")
    eventos_calendario = relationship("EventoCalendarioORM", back_populates="usuario")
    horarios = relationship("HorarioORM", back_populates="usuario", uselist=False)
    propiedades = relationship("PropiedadORM", back_populates="creado_por")


class ObjetivoORM(Base):
    """Modelo ORM para la tabla objetivos."""
    __tablename__ = "objetivos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    monto_objetivo = Column(Numeric(precision=15, scale=2), nullable=False)
    monto_actual = Column(Numeric(precision=15, scale=2), default=Decimal("0"), nullable=False)
    moneda = Column(SQLEnum(Moneda, values_callable=lambda x: [e.value for e in x]), nullable=False)
    fecha_limite = Column(Date, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.now, nullable=False)
    estado = Column(SQLEnum(EstadoObjetivo, values_callable=lambda x: [e.value for e in x]), default=EstadoObjetivo.ACTIVO, nullable=False)
    es_prioritario = Column(Boolean, default=False, nullable=False)
    completado = Column(Boolean, default=False, nullable=False)
    historial_progreso = Column(Text, default="[]", nullable=False)

    # Relaciones
    movimientos = relationship("MovimientoORM", back_populates="objetivo", cascade="all, delete-orphan")

class MovimientoORM(Base):
    """Modelo ORM para la tabla movimientos."""
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    monto = Column(Numeric(precision=15, scale=2), nullable=False)
    moneda = Column(SQLEnum(Moneda, values_callable=lambda x: [e.value for e in x]), nullable=False)
    tipo = Column(SQLEnum(TipoMovimiento, values_callable=lambda x: [e.value for e in x]), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    objetivo_id = Column(Integer, ForeignKey("objetivos.id"), nullable=False)
    motivo = Column(Text, nullable=True)
    nota = Column(Text, nullable=True)
    fecha = Column(DateTime, default=datetime.now, nullable=False, index=True)

    # Relaciones
    usuario = relationship("UsuarioORM", back_populates="movimientos")
    objetivo = relationship("ObjetivoORM", back_populates="movimientos")


class TasaCambioORM(Base):
    """Modelo ORM para la tabla tasas_cambio."""
    __tablename__ = "tasas_cambio"

    id = Column(Integer, primary_key=True, index=True)
    moneda_origen = Column(String(3), nullable=False)
    moneda_destino = Column(String(3), nullable=False)
    tasa = Column(Numeric(precision=15, scale=4), nullable=False)
    tipo_cotizacion = Column(SQLEnum(TipoCotizacion, values_callable=lambda x: [e.value for e in x]), nullable=False)
    fuente = Column(String(100), nullable=False)
    fecha = Column(DateTime, default=datetime.now, nullable=False, index=True)


class GastoORM(Base):
    """Modelo ORM para la tabla gastos."""
    __tablename__ = "gastos"

    id = Column(Integer, primary_key=True, index=True)
    monto = Column(Numeric(precision=15, scale=2), nullable=False)
    moneda = Column(SQLEnum(Moneda, values_callable=lambda x: [e.value for e in x]), nullable=False)
    categoria = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha = Column(DateTime, default=datetime.now, nullable=False, index=True)
    subtipo = Column(String(20), nullable=False, default='regular')
    fecha_pago = Column(Date, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    # Relaciones
    usuario = relationship("UsuarioORM", back_populates="gastos")


class EventoCalendarioORM(Base):
    """Modelo ORM para la tabla eventos_calendario."""
    __tablename__ = "eventos_calendario"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    tipo = Column(String(50), nullable=False)
    fecha = Column(Date, nullable=False, index=True)
    hora = Column(String(5), nullable=True)
    foto = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    creado_en = Column(DateTime, default=datetime.now, nullable=False)

    # Relaciones
    usuario = relationship("UsuarioORM", back_populates="eventos_calendario")


class HorarioORM(Base):
    """Modelo ORM para la tabla horarios."""
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    nombre_usuario = Column(String(100), nullable=True)
    data = Column(Text, nullable=False, default='{}')
    actualizado_en = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Relaciones
    usuario = relationship("UsuarioORM", back_populates="horarios")


class PropiedadORM(Base):
    """Modelo ORM para la tabla propiedades."""
    __tablename__ = "propiedades"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estado = Column(SQLEnum(EstadoPropiedad, values_callable=lambda x: [e.value for e in x]), default=EstadoPropiedad.VISTA, nullable=False)
    precio = Column(Numeric(precision=15, scale=2), nullable=True)
    moneda = Column(SQLEnum(Moneda, values_callable=lambda x: [e.value for e in x]), nullable=True)
    expensas = Column(Numeric(precision=15, scale=2), nullable=True)
    moneda_expensas = Column(SQLEnum(Moneda, values_callable=lambda x: [e.value for e in x]), nullable=True)
    direccion = Column(String(500), nullable=True)
    inmobiliaria = Column(String(200), nullable=True)
    contacto = Column(String(100), nullable=True)
    metros_cuadrados = Column(Numeric(precision=10, scale=2), nullable=True)
    cuartos = Column(Integer, nullable=True)
    banios = Column(Integer, nullable=True)
    notas = Column(Text, nullable=True)
    en_top = Column(Boolean, default=False, nullable=False)
    posicion_top = Column(Integer, nullable=True)
    creado_en = Column(DateTime, default=datetime.now, nullable=False, index=True)

    # Relaciones
    creado_por = relationship("UsuarioORM", back_populates="propiedades")


def create_tables():
    """Crea todas las tablas en la base de datos."""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Elimina todas las tablas de la base de datos."""
    Base.metadata.drop_all(bind=engine)
