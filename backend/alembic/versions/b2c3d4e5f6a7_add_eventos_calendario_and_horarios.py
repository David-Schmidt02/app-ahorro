"""add eventos_calendario and horarios tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-26

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy import inspect
from alembic import op

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'eventos_calendario' not in existing_tables:
        op.create_table(
            'eventos_calendario',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('titulo', sa.String(length=200), nullable=False),
            sa.Column('tipo', sa.String(length=50), nullable=False),
            sa.Column('fecha', sa.Date(), nullable=False),
            sa.Column('hora', sa.String(length=5), nullable=True),
            sa.Column('foto', sa.Text(), nullable=True),
            sa.Column('usuario_id', sa.Integer(), nullable=False),
            sa.Column('creado_en', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_eventos_calendario_id'), 'eventos_calendario', ['id'], unique=False)
        op.create_index(op.f('ix_eventos_calendario_fecha'), 'eventos_calendario', ['fecha'], unique=False)

    if 'horarios' not in existing_tables:
        op.create_table(
            'horarios',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('usuario_id', sa.Integer(), nullable=False),
            sa.Column('nombre_usuario', sa.String(length=100), nullable=True),
            sa.Column('data', sa.Text(), nullable=False),
            sa.Column('actualizado_en', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('usuario_id'),
        )
        op.create_index(op.f('ix_horarios_id'), 'horarios', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_horarios_id'), table_name='horarios')
    op.drop_table('horarios')
    op.drop_index(op.f('ix_eventos_calendario_fecha'), table_name='eventos_calendario')
    op.drop_index(op.f('ix_eventos_calendario_id'), table_name='eventos_calendario')
    op.drop_table('eventos_calendario')
