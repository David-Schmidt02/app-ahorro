# App de Ahorro - Savings Goal Tracker

Aplicación web para trackear ahorros y alcanzar objetivos financieros. Uso personal para 2 usuarios.

## Stack Técnico

### Backend: FastAPI (Python)
**Por qué FastAPI:**
- Moderno y rápido: alto rendimiento comparable a Node.js
- Documentación automática: Swagger UI incluido out-of-the-box
- Type hints nativos: validación automática de datos con Pydantic
- Fácil de aprender: sintaxis simple y pythonic
- Async support: manejo eficiente de requests concurrentes
- Preferencia del equipo: conocimiento previo de Python

**Alternativa descartada:** Flask (más minimalista pero menos features incluidos)

### Frontend: React
**Por qué React:**
- Lightweight: más simple que Angular para proyectos pequeños
- Ecosystem maduro: abundancia de librerías y recursos
- Component-based: fácil de organizar y mantener
- Curva de aprendizaje razonable: documentación excelente
- Deploy sencillo: integración directa con plataformas modernas

**Alternativa descartada:** Angular (demasiado pesado para 2 usuarios, mayor complejidad)

### Base de Datos: PostgreSQL
**Por qué PostgreSQL:**
- Persistencia garantizada: datos no se pierden en redeploys (vs SQLite en contenedores efímeros)
- Railway integration: provisión gratuita con un click
- Production-ready: mismo setup en desarrollo y producción
- SQLAlchemy compatible: ORM Python estándar funciona perfectamente
- Escalable: si eventualmente crece el proyecto

**Alternativa descartada:** SQLite (archivos locales se pierden en plataformas como Railway)

### Deployment: Railway
**Por qué Railway:**
- Deploy automático desde Git
- Tier gratuito razonable
- PostgreSQL incluido gratis
- Configuración mínima
- CLI simple para management

### Autenticación
Sistema básico de login con:
- Contraseñas hasheadas (bcrypt)
- 2 usuarios hardcoded
- No requiere OAuth ni sistemas complejos

## Modelo de Dominio

### Entidades

**Objetivo**
- `nombre`: str - Nombre descriptivo del objetivo
- `descripcion`: str (opcional) - Detalles adicionales
- `monto_objetivo`: Decimal - Meta a alcanzar
- `monto_actual`: Decimal - Acumulado hasta el momento
- `moneda`: enum (USD/ARS) - Moneda del objetivo
- `fecha_limite`: date - Deadline para alcanzar la meta
- `fecha_creacion`: datetime - Timestamp de creación
- `estado`: enum (activo/completado/pausado) - Estado actual
- `es_prioritario`: bool - Marca si es objetivo prioritario
- `completado`: bool - Si se alcanzó la meta

**Métodos de negocio:**
- `postergar_fecha_limite(nueva_fecha)` - Ajusta el deadline
- `calcular_porcentaje_completado()` - Retorna % de avance
- `calcular_pago_mensual_requerido()` - Calcula aporte mensual necesario para llegar a tiempo
- `marcar_completado()` - Marca objetivo como alcanzado

**Movimiento** (Aportes y Retiros)
- `monto`: Decimal - Cantidad del movimiento
- `moneda`: enum (USD/ARS) - Moneda del movimiento
- `tipo`: enum (aporte/retiro) - Tipo de transacción
- `usuario_id`: FK - Usuario que realizó el movimiento
- `objetivo_id`: FK - Objetivo asociado
- `fecha`: datetime - Timestamp del movimiento
- `motivo`: str (opcional) - Explicación del movimiento
- `nota`: str (opcional) - Notas adicionales

**Usuario**
- `nombre`: str - Nombre del usuario
- `email`: str - Email único
- `password_hash`: str - Contraseña hasheada con bcrypt

**TasaCambio** (Conversión USD/ARS)
- `moneda_origen`: str - Moneda origen (ARS)
- `moneda_destino`: str - Moneda destino (USD)
- `tasa`: Decimal - Tasa de conversión
- `fecha`: datetime - Fecha de la cotización
- `fuente`: str - API utilizada (dolarapi.com)
- `tipo_cotizacion`: str - Tipo de dólar (blue/oficial/MEP)

**Nota:** La tasa se actualiza cada 24hs mediante un job automático.

## Funcionalidades Core

### Dashboard Principal
- Lista de objetivos activos con barras de progreso
- Resumen global: total ahorrado en USD
- Últimos movimientos realizados
- Alertas y notificaciones pendientes
- Destacado de objetivos prioritarios

### Gestión de Objetivos
- Crear/editar/eliminar objetivos
- Marcar como prioritario
- Postergar fecha límite
- Marcar como completado (queda archivado en verde)
- Filtrar por estado (activo/completado/pausado)

### Vista de Objetivo Individual
- Gráfico de barra de progreso (%)
- Línea de tiempo con histórico de movimientos
- Proyección: "Al ritmo actual, alcanzas la meta el [fecha]"
- Cálculo de pago mensual requerido para llegar a deadline
- Historial completo de aportes y retiros

### Gestión de Movimientos
- Agregar aportes y retiros por objetivo
- Conversión automática USD/ARS según tasa del día
- Registrar quién realizó el movimiento
- Agregar motivo/nota opcional
- Historial filtrable por objetivo/usuario/fecha

### Sistema de Alertas
- Meta alcanzada (100%)
- Hitos de progreso (25%, 50%, 75%)
- Advertencia: "Al ritmo actual no llegarán a la fecha límite"
- Sugerencia: "Necesitan aportar X USD/mes para llegar a tiempo"

### Conversión de Moneda
- Integración con API externa (dolarapi.com)
- Actualización automática cada 24hs
- Conversión automática en movimientos (si aportan ARS a objetivo USD)
- Selección de tipo de cotización (blue/oficial/MEP)

## Arquitectura del Backend

### Patrón de Capas

**Controllers (Routers)**
- Únicos con bloques try/except para manejo de errores
- Validación de requests/responses con Pydantic schemas
- Retornan respuestas HTTP apropiadas
- No contienen lógica de negocio

**Services**
- Orquestan la lógica de negocio
- Solicitan entidades al repository
- Invocan métodos de dominio en las entidades
- Solicitan al repository que persista cambios
- Pueden lanzar excepciones de validación de negocio
- NO modifican directamente atributos de entidades

**Repositories**
- Únicos que conocen la conexión a base de datos
- Abstraen los detalles de SQLAlchemy
- Operaciones CRUD sobre entidades
- Lanzan excepciones relacionadas a persistencia
- NO contienen lógica de negocio

**Entities (Dominio)**
- Clases de dominio con lógica de negocio
- Métodos que modifican su propio estado
- Independientes de la capa de persistencia

**Middleware**
- Autenticación JWT simple
- CORS configuration
- Request logging

### Estructura de Carpetas

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app principal
│   ├── config.py               # Configuración y variables de entorno
│   ├── database.py             # Conexión a PostgreSQL
│   │
│   ├── domain/                 # Entidades de dominio
│   │   ├── __init__.py
│   │   ├── objetivo.py
│   │   ├── movimiento.py
│   │   ├── usuario.py
│   │   └── tasa_cambio.py
│   │
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── objetivo_schema.py
│   │   ├── movimiento_schema.py
│   │   ├── usuario_schema.py
│   │   └── tasa_cambio_schema.py
│   │
│   ├── repositories/           # Capa de persistencia
│   │   ├── __init__.py
│   │   ├── objetivo_repository.py
│   │   ├── movimiento_repository.py
│   │   ├── usuario_repository.py
│   │   └── tasa_cambio_repository.py
│   │
│   ├── services/               # Lógica de negocio
│   │   ├── __init__.py
│   │   ├── objetivo_service.py
│   │   ├── movimiento_service.py
│   │   ├── usuario_service.py
│   │   ├── tasa_cambio_service.py
│   │   └── alerta_service.py
│   │
│   ├── controllers/            # Routers de FastAPI
│   │   ├── __init__.py
│   │   ├── objetivo_controller.py
│   │   ├── movimiento_controller.py
│   │   ├── usuario_controller.py
│   │   └── auth_controller.py
│   │
│   ├── middleware/             # Middleware custom
│   │   ├── __init__.py
│   │   └── auth_middleware.py
│   │
│   └── utils/                  # Utilidades
│       ├── __init__.py
│       ├── exceptions.py
│       └── enums.py
│
├── requirements.txt
└── .env.example
