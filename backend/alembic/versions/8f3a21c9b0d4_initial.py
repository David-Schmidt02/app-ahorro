"""initial

Revision ID: 8f3a21c9b0d4
Revises:
Create Date: 2026-02-23

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy import inspect
from alembic import op

revision: str = '8f3a21c9b0d4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'usuarios' not in existing_tables:
        op.create_table(
            'usuarios',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('nombre', sa.String(length=100), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('fecha_creacion', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_usuarios_id'), 'usuarios', ['id'], unique=False)
        op.create_index(op.f('ix_usuarios_email'), 'usuarios', ['email'], unique=True)

    if 'objetivos' not in existing_tables:
        op.create_table(
            'objetivos',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('nombre', sa.String(length=200), nullable=False),
            sa.Column('descripcion', sa.Text(), nullable=True),
            sa.Column('monto_objetivo', sa.Numeric(precision=15, scale=2), nullable=False),
            sa.Column('monto_actual', sa.Numeric(precision=15, scale=2), nullable=False),
            sa.Column('moneda', sa.Enum('USD', 'ARS', name='moneda'), nullable=False),
            sa.Column('fecha_limite', sa.Date(), nullable=False),
            sa.Column('fecha_creacion', sa.DateTime(), nullable=False),
            sa.Column('estado', sa.Enum('activo', 'completado', 'pausado', name='estadoobjetivo'), nullable=False),
            sa.Column('es_prioritario', sa.Boolean(), nullable=False),
            sa.Column('completado', sa.Boolean(), nullable=False),
            sa.Column('historial_progreso', sa.Text(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_objetivos_id'), 'objetivos', ['id'], unique=False)

    if 'movimientos' not in existing_tables:
        op.create_table(
            'movimientos',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('monto', sa.Numeric(precision=15, scale=2), nullable=False),
            sa.Column('moneda', sa.Enum('USD', 'ARS', name='moneda', create_type=False), nullable=False),
            sa.Column('tipo', sa.Enum('aporte', 'retiro', name='tipomovimiento'), nullable=False),
            sa.Column('usuario_id', sa.Integer(), nullable=False),
            sa.Column('objetivo_id', sa.Integer(), nullable=False),
            sa.Column('motivo', sa.Text(), nullable=True),
            sa.Column('nota', sa.Text(), nullable=True),
            sa.Column('fecha', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['objetivo_id'], ['objetivos.id']),
            sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_movimientos_id'), 'movimientos', ['id'], unique=False)
        op.create_index(op.f('ix_movimientos_fecha'), 'movimientos', ['fecha'], unique=False)

    if 'tasas_cambio' not in existing_tables:
        op.create_table(
            'tasas_cambio',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('moneda_origen', sa.String(length=3), nullable=False),
            sa.Column('moneda_destino', sa.String(length=3), nullable=False),
            sa.Column('tasa', sa.Numeric(precision=15, scale=4), nullable=False),
            sa.Column('tipo_cotizacion', sa.Enum('BLUE', 'OFICIAL', 'MEP', name='tipocotizacion'), nullable=False),
            sa.Column('fuente', sa.String(length=100), nullable=False),
            sa.Column('fecha', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_tasas_cambio_id'), 'tasas_cambio', ['id'], unique=False)
        op.create_index(op.f('ix_tasas_cambio_fecha'), 'tasas_cambio', ['fecha'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tasas_cambio_fecha'), table_name='tasas_cambio')
    op.drop_index(op.f('ix_tasas_cambio_id'), table_name='tasas_cambio')
    op.drop_table('tasas_cambio')

    op.drop_index(op.f('ix_movimientos_fecha'), table_name='movimientos')
    op.drop_index(op.f('ix_movimientos_id'), table_name='movimientos')
    op.drop_table('movimientos')

    op.drop_index(op.f('ix_objetivos_id'), table_name='objetivos')
    op.drop_table('objetivos')

    op.drop_index(op.f('ix_usuarios_email'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_id'), table_name='usuarios')
    op.drop_table('usuarios')

    # Eliminar tipos ENUM de PostgreSQL
    sa.Enum(name='tipocotizacion').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='tipomovimiento').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='estadoobjetivo').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='moneda').drop(op.get_bind(), checkfirst=True)
