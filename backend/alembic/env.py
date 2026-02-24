"""Alembic environment configuration."""
import os
import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Agregar backend/ al sys.path para poder importar src.*
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Importar Base y todos los modelos ORM para que metadata los conozca
from src.database import Base  # noqa: F401
import src.database  # noqa: F401 — registra todos los ORM en Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """Obtiene la URL de la BD desde env var o settings."""
    db_url = os.environ.get("DATABASE_URL", "")
    if db_url:
        # psycopg2 requiere postgresql://, Railway a veces usa postgres://
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        return db_url

    from src.config import get_settings
    return get_settings().database.url


def run_migrations_offline() -> None:
    """Corre las migraciones en modo 'offline' (sin conexión activa)."""
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Corre las migraciones en modo 'online' (con conexión activa)."""
    connectable = engine_from_config(
        {"sqlalchemy.url": get_url()},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
