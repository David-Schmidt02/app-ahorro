"""Configuración de la base de datos y modelos ORM de SQLAlchemy."""
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import create_engine, Column, Integer, String, Numeric, DateTime, Date, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

from src.config import settings
from src.domain.enums import Moneda, EstadoObjetivo, TipoMovimiento, TipoCotizacion

# Crear engine de SQLAlchemy
engine = create_engine(
    settings.database.url,
    pool_size=settings.database.pool_size,
    max_overflow=settings.database.max_overflow,
    echo=settings.database.echo,
    pool_pre_ping=True
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


class ObjetivoORM(Base):
    """Modelo ORM para la tabla objetivos."""
    __tablename__ = "objetivos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    monto_objetivo = Column(Numeric(precision=15, scale=2), nullable=False)
    monto_actual = Column(Numeric(precision=15, scale=2), default=Decimal("0"), nullable=False)
    moneda = Column(SQLEnum(Moneda), nullable=False)
    fecha_limite = Column(Date, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.now, nullable=False)
    estado = Column(SQLEnum(EstadoObjetivo), default=EstadoObjetivo.ACTIVO, nullable=False)
    es_prioritario = Column(Boolean, default=False, nullable=False)
    completado = Column(Boolean, default=False, nullable=False)

    # Relaciones
    movimientos = relationship("MovimientoORM", back_populates="objetivo")


class MovimientoORM(Base):
    """Modelo ORM para la tabla movimientos."""
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    monto = Column(Numeric(precision=15, scale=2), nullable=False)
    moneda = Column(SQLEnum(Moneda), nullable=False)
    tipo = Column(SQLEnum(TipoMovimiento), nullable=False)
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
    tipo_cotizacion = Column(SQLEnum(TipoCotizacion), nullable=False)
    fuente = Column(String(100), nullable=False)
    fecha = Column(DateTime, default=datetime.now, nullable=False, index=True)


def create_tables():
    """Crea todas las tablas en la base de datos."""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Elimina todas las tablas de la base de datos."""
    Base.metadata.drop_all(bind=engine)
