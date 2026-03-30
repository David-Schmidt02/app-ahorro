"""add propiedades table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-29

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear el enum EstadoPropiedad
    op.execute("CREATE TYPE estadopropiedad AS ENUM ('favorita', 'vista', 'rechazada')")

    op.create_table(
        'propiedades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('creado_por_id', sa.Integer(), nullable=False),
        sa.Column('estado', sa.Enum('favorita', 'vista', 'rechazada', name='estadopropiedad'), nullable=False),
        sa.Column('precio', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('moneda', sa.Enum('USD', 'ARS', name='moneda'), nullable=True),
        sa.Column('expensas', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('moneda_expensas', sa.Enum('USD', 'ARS', name='moneda'), nullable=True),
        sa.Column('direccion', sa.String(length=500), nullable=True),
        sa.Column('inmobiliaria', sa.String(length=200), nullable=True),
        sa.Column('contacto', sa.String(length=100), nullable=True),
        sa.Column('metros_cuadrados', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('cuartos', sa.Integer(), nullable=True),
        sa.Column('banios', sa.Integer(), nullable=True),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('en_top', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('posicion_top', sa.Integer(), nullable=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['creado_por_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_propiedades_id'), 'propiedades', ['id'], unique=False)
    op.create_index(op.f('ix_propiedades_creado_en'), 'propiedades', ['creado_en'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_propiedades_creado_en'), table_name='propiedades')
    op.drop_index(op.f('ix_propiedades_id'), table_name='propiedades')
    op.drop_table('propiedades')
    op.execute("DROP TYPE estadopropiedad")
