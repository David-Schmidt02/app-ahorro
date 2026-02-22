# FASTAPI CLEAN ARCHITECTURE SKILL - YAML CONFIG EDITION

## ROLE

You are generating production-grade FastAPI backends with Clean Architecture principles.
You MUST follow the configuration and structure rules defined here.

**This skill intentionally EXCLUDES:**
- Transactions / Unit of Work
- Advanced consistency patterns
- Testing strategy (implement separately)
- Event-driven architecture
- Performance optimizations
- Observability stack
- Microservices patterns
- Repository interfaces/abstractions (concrete classes only)

**Focus:** Clean FastAPI monolith with layered architecture, YAML-based configuration, optional JWT, optional rate limit, structured logging with rotation, dynamic config reload.

---

## CONFIGURATION SYSTEM (MANDATORY)

### ABSOLUTE RULE

- Configuration MUST be loaded from `config.yaml`
- Configuration MUST be accessed through `settings.py`
- `.env` files are **FORBIDDEN**
- Environment variables are **NOT used**

### STRUCTURE

```
src/
├── config/
│   ├── config.yaml      # Single source of truth
│   └── settings.py      # Loader with validation
```

### settings.py RESPONSIBILITIES

- Load and parse `config.yaml`
- Validate structure using Pydantic models
- Expose a singleton `Settings` object via `get_settings()`
- Provide safe access to all configuration values
- Support periodic reload without restarting API

**Required functions:**
- `load_config()` - Parse YAML and validate
- `get_settings()` - Return singleton instance
- `reload_config()` - Atomic config replacement
- `check_and_reload_if_changed()` - Check file mtime and reload if modified

---

## DYNAMIC CONFIG RELOAD (MANDATORY)

The application MUST support dynamic reload of `config.yaml` **without restarting**.

**Purpose:**
- Change logging level in production without downtime
- Adjust rate limits on the fly
- Toggle JWT authentication
- Any config change applies within check interval

**Implementation requirements:**
- Background task that runs every N seconds (configurable)
- Check file modification timestamp
- Reload atomically using thread lock
- Re-apply logging configuration when changed
- Must NOT interrupt running requests

**Rules:**
- Reload MUST be thread-safe (use `threading.Lock`)
- Settings replacement MUST be atomic
- Running requests MUST NOT be affected
- Log when config is reloaded

> **Critical:** Restarting the API for config changes defeats the purpose. This is essential for production environments where `sudo systemctl restart app_api` is not acceptable.

---

## PROJECT STRUCTURE (MANDATORY)

```
src/
├── main.py                      # FastAPI entry point
├── config/
│   ├── config.yaml
│   └── settings.py
├── controllers/                 # FastAPI routers
│   ├── __init__.py
│   ├── auth_controller.py
│   └── *_controller.py
├── services/                    # Business logic orchestration
│   ├── __init__.py
│   └── *_service.py
├── repositories/                # Data persistence layer
│   ├── __init__.py
│   └── *_repository.py
├── domain/                      # Domain entities (pure Python files)
│   ├── __init__.py
│   ├── usuario.py
│   ├── objetivo.py
├── schemas/                     # Pydantic DTOs
│   ├── __init__.py
│   └── *_schema.py
├── database.py                  # SQLAlchemy config + ORM models
├── utils/
│   └── enums.py                 # Enumerations
├── log/
│   └── logging_config.py        # Centralized logging
└── middleware/                  # Optional
    ├── auth_middleware.py       # JWT (if enabled)
    └── rate_limit.py            # Rate limiting (if enabled)

root/
└── todo.md                      # Active tasks only
```

**Important notes:**
- Domain entities are `.py` files directly in `src/domain/` (NOT `domain/entities/`)
- Repositories are in `src/repositories/` at root level (NOT `infrastructure/repositories/`)
- NO repository interfaces - use concrete classes directly
- NO `infrastructure/` folder unless absolutely necessary

---

## CLEAN ARCHITECTURE RULES

**Dependency flow:**
```
Controller → Service → Domain Entity → Repository → Database
```

**Core principles:**
- Dependencies ALWAYS point inward
- Domain layer is pure Python (NO FastAPI, NO ORM imports)
- Each layer has a single, well-defined responsibility
- NO cross-layer violations

---

## CONTROLLERS (FASTAPI ROUTERS)

**Responsibilities:**
- Validate HTTP request using Pydantic schemas
- Call ONE service method
- Return response DTO
- Declare dependency injection

**Error handling pattern:**
```python
@router.post("/endpoint")
def create_something(data: CreateDTO, service: Service = Depends(...)):
    result = service.create(data)
    return result
```

**Rules:**
- ❌ NO `try/except` block in controllers for business logic (let exceptions bubble up natively)
- ✅ Validate with Pydantic
- ❌ NO business logic
- ❌ NO direct repository usage
- ❌ NO direct entity mutation
- ❌ NO manual exception mapping (let global handler do it)

---

## SERVICES (BUSINESS LOGIC ORCHESTRATION)

**Responsibilities:**
- Orchestrate workflow
- Retrieve entities from repository
- Call domain methods on entities
- Persist changes via repository

**Example:**
```python
def crear_objetivo(self, nombre: str, monto: Decimal) -> Objetivo:
    # Create entity (domain validates)
    objetivo = Objetivo(nombre=nombre, monto_objetivo=monto)

    # Persist
    return self.repository.crear(objetivo)
```

**Rules:**
- ✅ Orchestrate flow
- ✅ Call domain entity methods
- ❌ NO SQL queries
- ❌ NO ORM usage
- ❌ NO direct attribute mutation (use entity methods)
- ❌ NO HTTP logic (status codes, headers)
- ❌ NO try/except for HTTP mapping

---

## DOMAIN (PURE BUSINESS LOGIC)

**Characteristics:**
- Pure Python classes
- Business rules enforced in methods
- Invariants validated in `__init__` or private methods
- Raise standard Python exceptions (e.g., `ValueError`, `KeyError`)

**Example:**
```python
class Objetivo:
    def __init__(self, nombre: str, monto_objetivo: Decimal):
        if monto_objetivo <= 0:
            raise ValueError("Monto debe ser mayor a cero")
        self.nombre = nombre
        self.monto_objetivo = monto_objetivo

    def agregar_monto(self, monto: Decimal):
        if monto <= 0:
            raise ValueError("Monto inválido")
        self.monto_actual += monto
```

**Rules:**
- ✅ Pure Python
- ✅ Enforce invariants
- ✅ Raise standard Python exceptions
- ❌ NO FastAPI imports
- ❌ NO SQLAlchemy imports
- ❌ NO framework dependencies

---

## REPOSITORIES (DATA PERSISTENCE)

**Responsibilities:**
- Abstract database access
- Map between ORM models ↔ Domain entities
- CRUD operations
- Handle DB failures and return safe defaults (None, []) or propagate specific standard exceptions

**Example:**
```python
class ObjetivoRepository:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, objetivo: Objetivo) -> Objetivo:
        orm = self._to_orm(objetivo)
        self.db.add(orm)
        self.db.commit()
        return self._to_domain(orm)

    def _to_domain(self, orm: ObjetivoORM) -> Objetivo:
        return Objetivo(id=orm.id, nombre=orm.nombre, ...)
```

**Rules:**
- ✅ Only layer that knows about ORM
- ✅ Map ORM ↔ Domain
- ✅ Return safe defaults (None, []) or specific native exceptions on DB errors
- ❌ NO business logic
- ❌ NO repository interfaces (concrete classes only)

---

## EXCEPTION HANDLING

### Standard Python Exceptions

Do not use custom hierarchal exceptions (`AppError`, `DomainError`, etc.). Instead, leverage standard Python exceptions combined with FastAPI's native capabilities or a simplified global handler.

- **`ValueError`**: Used for business rules violations, invalid states, or conflict errors (e.g., email already exists, invalid amount).
- **`KeyError`**: Used for Resource Not Found scenarios.

### Global Exception Handler

Register in `main.py` if needed to map standard exceptions cleanly:
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": "bad_request", "detail": str(exc)}
    )

@app.exception_handler(KeyError)
async def key_error_handler(request: Request, exc: KeyError):
    return JSONResponse(
        status_code=404,
        content={"error": "not_found", "detail": str(exc).strip("'")}
    )
```

**Behavior:**
- Automatically intercepts built-in exceptions raised anywhere in the Request-Response lifecycle.
- Maps to appropriate HTTP status code.
- Returns structured JSON.

**Standard error response:**
```json
{
  "error": "error_code_or_type",
  "detail": "Human-readable message"
}
```

---

## LOGGING (MANDATORY)

### Centralized Configuration

**File:** `src/log/logging_config.py`

**Requirements:**
- Timestamp in logs
- Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
- Logger name (module path)
- Rotating file handler with **7-day retention**
- Console handler (optional via YAML)
- Suppress uvicorn noise

**Usage in modules:**
```python
from src.log.logging_config import get_logger

logger = get_logger(__name__)

logger.info("Message", extra={"user_id": 123})
logger.error("Error occurred", exc_info=True)
```

**Configuration in config.yaml:**
```yaml
logging:
  level: "INFO"                    # Dynamic via reload
  console:
    enabled: true
  file:
    enabled: true
    path: "logs/app.log"
    max_bytes: 10485760            # 10MB
    backup_count: 7                # 7 days retention
    rotation: "daily"
```

**Dynamic updates:**
- When `config.yaml` is reloaded, logging level updates automatically
- No restart required to change log verbosity

**Rules:**
- ✅ Use `get_logger(__name__)` in every module
- ✅ Include timestamp + logger name
- ✅ Rotate logs daily, keep 7 days
- ❌ NO `print()` statements
- ❌ NO hardcoded log levels

---

## OPTIONAL: JWT AUTHENTICATION

**Configured via config.yaml:**
```yaml
jwt:
  enabled: true                    # Ask user if not specified
  secret_key: "your-secret-key"
  algorithm: "HS256"
  access_token_expire_minutes: 30
```

**Implementation:**
- If `enabled: true` → Apply JWT dependency to protected endpoints
- If `enabled: false` → No authentication required
- Use FastAPI dependency injection
- Decode and verify JWT in middleware
- Extract user context for services

**File:** `src/middleware/auth_middleware.py`

**Rules:**
- Controllers MUST NOT manually decode JWT
- Permissions validated in Service layer (not controller)
- Use `Depends(get_current_user)` pattern

---

## OPTIONAL: RATE LIMITING

**Ask user before implementing:**
> "Do you want rate limiting enabled? (recommended for production APIs)"

**If YES, configure via YAML:**
```yaml
rate_limit:
  enabled: true
  requests_per_minute: 60
```

**Implementation:**
- Middleware-based rate limiting
- Read limits dynamically from settings
- React to config reload (adjust limits without restart)
- Per-IP or per-user tracking

**File:** `src/middleware/rate_limit.py`

**If NO:** Skip implementation entirely.

---

## TODO.MD MANAGEMENT

**Location:** `root/todo.md`

**Rules:**
- ONLY pending/active tasks
- Completed tasks MUST be deleted immediately
- NO historical accumulation
- NO "Done" section
- Keep clean and actionable

**Example:**
```markdown
# TODO

- [ ] Implement user password reset
- [ ] Add unit tests for objetivo_service
- [ ] Document API endpoints in README
```

When task is done → **delete the line**, don't mark as completed.

---

## DTO SEPARATION (MANDATORY)

**Four distinct types:**

1. **Request DTO** (Pydantic) - Validates incoming HTTP requests
2. **Response DTO** (Pydantic) - Structures HTTP responses
3. **Domain Entity** (Pure Python) - Business logic
4. **ORM Model** (SQLAlchemy) - Database representation

**Mapping flow:**
```
HTTP Request → Request DTO → Domain Entity → ORM Model → Database
Database → ORM Model → Domain Entity → Response DTO → HTTP Response
```

**Rules:**
- ✅ Explicit mapping at each layer boundary
- ✅ Never return ORM models to controllers
- ✅ Never pass Request DTOs to domain
- ❌ NO mixing of concerns

---

## FORBIDDEN PATTERNS

**Absolutely prohibited:**

- ❌ Business logic in controllers
- ❌ Returning ORM models from controllers
- ❌ Domain importing FastAPI
- ❌ Domain importing SQLAlchemy
- ❌ Services modifying entity attributes directly (use entity methods)
- ❌ try/except blocks in controllers for business logic (let native exceptions bubble up)
- ❌ `print()` statements anywhere
- ❌ `.env` files
- ❌ Environment variable configuration
- ❌ Repository interfaces/abstractions (use concrete classes)

---

## FASTAPI STARTUP SEQUENCE

**main.py MUST:**

1. Load settings from `settings.py`
2. Initialize logging from YAML config
3. Register global exception handlers
4. Configure CORS (from YAML)
5. Apply middleware (rate limit if enabled)
6. Include routers with API prefix
7. Start background config reload task
8. Create database tables on startup

**Example startup:**
```python
from src.config.settings import get_settings, check_and_reload_if_changed
from src.log.logging_config import setup_logging, reload_logging_config

@app.on_event("startup")
async def startup():
    # 1. Setup logging
    setup_logging()

    # 2. Create tables
    create_tables()

    # 3. Start config reload task
    asyncio.create_task(config_reload_task())

async def config_reload_task():
    while True:
        await asyncio.sleep(settings.config_reload.check_interval_seconds)
        if check_and_reload_if_changed():
            reload_logging_config()
```

---

## IMPLEMENTATION CHECKLIST

When implementing this skill, verify:

- [ ] `config.yaml` exists and is the ONLY config source
- [ ] `settings.py` implements singleton pattern with reload
- [ ] Background task checks config changes periodically
- [ ] Logging is centralized in `src/log/logging_config.py`
- [ ] Logs rotate daily with 7-day retention
- [ ] Global exception handler configured for standard Python exceptions if needed
- [ ] Controllers have NO try/except catchalls for business logic
- [ ] Services orchestrate without direct attribute mutation
- [ ] Domain entities are pure Python (no framework imports)
- [ ] Repositories are concrete classes (no interfaces)
- [ ] Structure is `src/domain/`, `src/controllers/`, `src/services/`, `src/repositories/`
- [ ] `todo.md` exists and only contains pending tasks
- [ ] Rate limiting prompts user for confirmation
- [ ] JWT is optional via YAML config

---

## EXAMPLE FLOW

**Creating an Objetivo (Goal):**

1. **Controller receives request:**
```python
@router.post("/objetivos/")
def crear_objetivo(data: ObjetivoCreate, service: ObjetivoService = Depends(...)):
    objetivo = service.crear_objetivo(...)
    return objetivo
```

2. **Service orchestrates:**
```python
def crear_objetivo(self, nombre: str, monto: Decimal) -> Objetivo:
    objetivo = Objetivo(nombre=nombre, monto_objetivo=monto)  # Domain validates
    return self.repository.crear(objetivo)
```

3. **Domain enforces rules:**
```python
class Objetivo:
    def __init__(self, nombre: str, monto_objetivo: Decimal):
        if monto_objetivo <= 0:
            raise ValueError("Monto inválido")
        self.monto_objetivo = monto_objetivo
```

4. **Repository persists:**
```python
def crear(self, objetivo: Objetivo) -> Objetivo:
    orm = ObjetivoORM(nombre=objetivo.nombre, ...)
    self.db.add(orm)
    self.db.commit()
    return self._to_domain(orm)
```

5. **Global handler catches errors:**
- `ValueError` → 400 Bad Request
- `KeyError` → 404 Not Found

---

**END OF FASTAPI CLEAN ARCHITECTURE SKILL (YAML CONFIG EDITION)**
