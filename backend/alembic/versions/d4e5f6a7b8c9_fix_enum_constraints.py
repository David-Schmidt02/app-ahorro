"""fix enum constraints and create_type flags

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-30

Este migration arregla el problema donde las migraciones anteriores intentaban
crear el ENUM 'moneda' múltiples veces. Las migraciones ya fueron parchadas,
pero esta migración limpia el estado de la BD.

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Las migraciones a1b2c3d4e5f6 y c3d4e5f6a7b8 intentaron crear el ENUM 'moneda'
    # múltiples veces, causando errores. Este migration limpia ese estado.

    # Verificar y crear los ENUMs si no existen, de forma segura
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Obtener todos los tipos ENUM existentes
    existing_enums = []
    try:
        # En PostgreSQL, los ENUMs están en information_schema
        result = bind.execute(sa.text(
            "SELECT typname FROM pg_type WHERE typtype = 'e'"
        ))
        existing_enums = [row[0] for row in result]
    except Exception:
        # Si hay error, continuar sin listar
        pass

    # Crear 'moneda' si no existe (aunque probablemente ya existe)
    if 'moneda' not in existing_enums:
        op.execute("CREATE TYPE moneda AS ENUM ('USD', 'ARS')")

    # Crear 'estadopropiedad' si no existe (aunque probablemente ya existe)
    if 'estadopropiedad' not in existing_enums:
        op.execute("CREATE TYPE estadopropiedad AS ENUM ('favorita', 'vista', 'rechazada')")


def downgrade() -> None:
    # No hay nada que deshacer - estos tipos ya existían
    pass
