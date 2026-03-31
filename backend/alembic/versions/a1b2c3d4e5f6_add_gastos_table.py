"""add gastos table

Revision ID: a1b2c3d4e5f6
Revises: 8f3a21c9b0d4
Create Date: 2026-03-26

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy import inspect
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8f3a21c9b0d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear tabla gastos solo si no existe
    bind = op.get_bind()
    inspector = inspect(bind)

    if 'gastos' not in inspector.get_table_names():
        op.create_table(
            'gastos',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('monto', sa.Numeric(precision=15, scale=2), nullable=False),
            sa.Column('moneda', sa.Enum('USD', 'ARS', name='moneda', create_type=False), nullable=False),
            sa.Column('categoria', sa.String(length=50), nullable=False),
            sa.Column('descripcion', sa.Text(), nullable=True),
            sa.Column('fecha', sa.DateTime(), nullable=False),
            sa.Column('usuario_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_gastos_id'), 'gastos', ['id'], unique=False)
        op.create_index(op.f('ix_gastos_fecha'), 'gastos', ['fecha'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_gastos_fecha'), table_name='gastos')
    op.drop_index(op.f('ix_gastos_id'), table_name='gastos')
    op.drop_table('gastos')
