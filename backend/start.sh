#!/bin/bash
set -e  # Abortar si cualquier comando falla

echo "==> Aplicando migraciones de base de datos..."
alembic upgrade head

echo "==> Iniciando servidor..."
exec uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
