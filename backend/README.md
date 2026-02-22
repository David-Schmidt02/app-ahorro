# App de Ahorro - Backend API

API REST construida con **FastAPI** siguiendo **Clean Architecture** estricta, con configuración YAML y dynamic reload.

## 🎯 Características Principales

- ✅ **Clean Architecture** - Separación estricta de capas
- ✅ **YAML Configuration** - Sin `.env`, configuración centralizada
- ✅ **Dynamic Config Reload** - Cambios sin reiniciar la API
- ✅ **Global Exception Handler** - Manejo centralizado de errores
- ✅ **Structured Logging** - Rotación de 7 días, timestamp + logger name
- ✅ **JWT Authentication** - Opcional vía config
- ✅ **PostgreSQL** - Con SQLAlchemy ORM

---

## 📁 Estructura del Proyecto

```
backend/
├── config.yaml              # ÚNICA fuente de configuración
├── log/
│   └── logging.py           # Configuración centralizada de logs
├── src/
│   ├── main.py              # Entry point de FastAPI
│   ├── database.py          # SQLAlchemy config + ORM models
│   │
│   ├── config/
│   │   ├── settings.py      # Loader de config.yaml
│   │   └── __init__.py
│   │
│   ├── controllers/         # FastAPI routers
│   │   ├── auth_controller.py
│   │   ├── objetivo_controller.py
│   │   └── movimiento_controller.py
│   │
│   ├── services/            # Lógica de negocio (orquestación)
│   │   ├── usuario_service.py
│   │   ├── objetivo_service.py
│   │   ├── movimiento_service.py
│   │   └── tasa_cambio_service.py
│   │
│   ├── repositories/        # Persistencia (CRUD)
│   │   ├── usuario_repository.py
│   │   ├── objetivo_repository.py
│   │   ├── movimiento_repository.py
│   │   └── tasa_cambio_repository.py
│   │
│   ├── domain/              # Entidades + Lógica de dominio pura
│   │   ├── usuario.py
│   │   ├── objetivo.py
│   │   ├── movimiento.py
│   │   ├── tasa_cambio.py

│   │   └── enums.py         # Enumeraciones
│   │
│   ├── schemas/             # Pydantic DTOs
│   │   ├── usuario_schema.py
│   │   ├── objetivo_schema.py
│   │   ├── movimiento_schema.py
│   │   └── tasa_cambio_schema.py
│   │
│   └── middleware/          # Middleware opcional
│       └── auth_middleware.py
│
├── requirements.txt
└── README.md                # Este archivo
```

---

## ⚙️ Configuración

### config.yaml (Raíz del proyecto)

**IMPORTANTE:** Este es el ÚNICO archivo de configuración. No uses `.env`.

```yaml
app:
  name: "App de Ahorro"
  version: "1.0.0"
  api_prefix: "/api/v1"

database:
  url: "postgresql://user:password@localhost:5432/app_ahorro"
  pool_size: 5
  max_overflow: 10
  echo: false

jwt:
  enabled: true
  secret_key: "tu-secret-key-aqui-min-32-caracteres"
  algorithm: "HS256"
  access_token_expire_minutes: 30

cors:
  enabled: true
  origins:
    - "http://localhost:3000"
    - "http://localhost:5173"

logging:
  level: "INFO"               # DEBUG/INFO/WARNING/ERROR
  console:
    enabled: true
  file:
    enabled: true
    path: "logs/app.log"
    max_bytes: 10485760       # 10MB
    backup_count: 7           # 7 días de retención
    rotation: "daily"

config_reload:
  enabled: true
  check_interval_seconds: 30   # Revisar cambios cada 30s
```

### Dynamic Config Reload

**Característica clave:** Puedes modificar `config.yaml` y los cambios se aplican automáticamente sin reiniciar la API.

**Ejemplo:**
1. Cambiar `logging.level: "DEBUG"` en `config.yaml`
2. Esperar 30 segundos
3. Los logs ahora están en nivel DEBUG (sin restart)

Esto es especialmente útil en producción para evitar `sudo systemctl restart app_api`.

---

## 🚀 Instalación y Ejecución

### 1. Instalar dependencias

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configurar base de datos

Editar `config.yaml` con tus credenciales de PostgreSQL:

```yaml
database:
  url: "postgresql://tu_usuario:tu_password@localhost:5432/app_ahorro"
```

Crear la base de datos:

```bash
createdb app_ahorro
```

O en psql:

```sql
CREATE DATABASE app_ahorro;
```

### 3. Ejecutar la API

```bash
# Desde backend/
python -m src.main
```

O con uvicorn directamente:

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Acceder a la documentación

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

---

## 🏗️ Arquitectura Clean

### Flujo de dependencias

```
HTTP Request
    ↓
Controller (FastAPI router)
    ↓
Service (orquestación)
    ↓
Domain Entity (lógica de negocio)
    ↓
Repository (persistencia)
    ↓
Database (PostgreSQL)
```

### Responsabilidades por capa

**Controllers** (`src/controllers/`):
- Validar request con Pydantic
- Llamar UN método de service
- Retornar response DTO
- **UN solo try/except que re-raise** para global handler

**Services** (`src/services/`):
- Orquestar flujo de negocio
- Obtener entidades del repository
- Llamar métodos de dominio
- Persistir cambios vía repository
- ❌ NO modificar atributos directamente

**Domain** (`src/domain/`):
- Entidades de negocio puras (Pure Python)
- Lógica de negocio en métodos
- Validar invariantes
- Lanzar excepciones de dominio
- ❌ NO imports de FastAPI ni SQLAlchemy

**Repositories** (`src/repositories/`):
- Única capa que conoce ORM y DB
- Mapear ORM ↔ Domain
- Operaciones CRUD
- Lanzar `InfrastructureError` en fallos de DB

---

## 🔥 Exception Handling

### Jerarquía de Excepciones

```
AppError (base)
├── DomainError (400 Bad Request)
├── NotFoundError (404 Not Found)
├── ConflictError (409 Conflict)
└── InfrastructureError (500 Internal Server Error)
```

### Global Exception Handler

Los controllers **NO manejan excepciones manualmente**. Tienen UN solo try/except que re-raise:

```python
@router.post("/objetivos/")
def crear_objetivo(data: ObjetivoCreate, service: ObjetivoService = Depends(...)):
    try:
        objetivo = service.crear_objetivo(...)
        return objetivo
    except Exception:
        raise  # Global handler se encarga automáticamente
```

El global handler mapea automáticamente:
- `DomainError` → 400
- `NotFoundError` → 404
- `ConflictError` → 409
- `InfrastructureError` → 500

**Formato de respuesta de error:**

```json
{
  "error": "error_code",
  "detail": "Mensaje descriptivo"
}
```

---

## 📝 Logging

Cada módulo usa logging centralizado:

```python
from log.logging import get_logger

logger = get_logger(__name__)

logger.info("Usuario creado", extra={"user_id": 123})
logger.error("Error al procesar", exc_info=True)
```

**Características:**
- Timestamp en cada log
- Logger name (módulo/clase)
- Rotating file handler
- **7 días de retención**
- Nivel configurable desde `config.yaml`

**Cambiar nivel de logging sin restart:**

1. Editar `config.yaml`:
```yaml
logging:
  level: "DEBUG"
```

2. Esperar ~30 segundos
3. Los logs ahora muestran DEBUG

---

## 🔐 Autenticación JWT

Configurable en `config.yaml`:

```yaml
jwt:
  enabled: true   # false para deshabilitar
```

Si `enabled: false`, los endpoints NO requieren autenticación.

**Uso:**

1. Login:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret"}'
```

Respuesta:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

2. Usar token en requests:
```bash
curl -X GET http://localhost:8000/api/v1/objetivos/ \
  -H "Authorization: Bearer eyJ..."
```

---

## 📊 Endpoints Principales

Ver documentación completa en `/docs`.

### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Login (retorna JWT)

### Objetivos
- `POST /api/v1/objetivos/` - Crear objetivo
- `GET /api/v1/objetivos/` - Listar objetivos
- `GET /api/v1/objetivos/{id}` - Obtener objetivo
- `PUT /api/v1/objetivos/{id}` - Actualizar objetivo
- `POST /api/v1/objetivos/{id}/postergar` - Postergar fecha límite
- `POST /api/v1/objetivos/{id}/completar` - Marcar completado
- `DELETE /api/v1/objetivos/{id}` - Eliminar objetivo

### Movimientos
- `POST /api/v1/movimientos/` - Crear movimiento (aporte/retiro)
- `GET /api/v1/movimientos/` - Listar movimientos
- `GET /api/v1/movimientos/{id}` - Obtener movimiento
- `DELETE /api/v1/movimientos/{id}` - Eliminar movimiento

---

## 🧪 Testing

```bash
# Crear usuario
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "email": "juan@example.com",
    "password": "secret123"
  }'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "juan@example.com", "password": "secret123"}'

# Crear objetivo
curl -X POST http://localhost:8000/api/v1/objetivos/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token>" \
  -d '{
    "nombre": "Casa propia",
    "monto_objetivo": 20000,
    "moneda": "USD",
    "fecha_limite": "2026-12-31",
    "es_prioritario": true
  }'
```

---

## 🚢 Deploy en Railway

1. Conectar repositorio de GitHub a Railway
2. Agregar PostgreSQL addon
3. Editar `config.yaml` con credenciales de producción (o usar variables de Railway)
4. Railway ejecutará automáticamente `python -m src.main`

---

## 📚 Recursos

- **Skill de referencia**: `API-SKILL.md` en raíz del proyecto
- **TODO activo**: `todo.md` (solo tareas pendientes)
- **FastAPI docs**: https://fastapi.tiangolo.com
- **SQLAlchemy docs**: https://docs.sqlalchemy.org

---

## ⚡ Tips de Desarrollo

1. **No usar print()** - usar `logger` siempre
2. **No usar .env** - todo en `config.yaml`
3. **No modificar atributos directamente en services** - usar métodos de dominio
4. **Aprovechar dynamic reload** - cambiar config sin restart
5. **Ver logs en tiempo real**: `tail -f logs/app.log`

---

**Autor:** David
**Versión:** 1.0.0
**Skill:** FastAPI Clean Architecture - YAML Config Edition
