"""add subtipo and fecha_pago to gastos

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-01

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy import inspect
from alembic import op

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns('gastos')]

    if 'subtipo' not in columns:
        op.add_column('gastos', sa.Column('subtipo', sa.String(20), nullable=False, server_default='regular'))

    if 'fecha_pago' not in columns:
        op.add_column('gastos', sa.Column('fecha_pago', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('gastos', 'fecha_pago')
    op.drop_column('gastos', 'subtipo')
