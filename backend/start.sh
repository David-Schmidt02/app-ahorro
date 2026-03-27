#!/bin/bash

echo "==> Aplicando migraciones de base de datos..."
alembic upgrade head || echo "⚠️  Migraciones fallaron o ya estaban aplicadas, continuando..."

echo "==> Iniciando servidor..."
exec uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
