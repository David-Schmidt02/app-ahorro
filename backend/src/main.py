"""FastAPI application principal - Clean Architecture con YAML config."""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config.settings import get_settings, check_and_reload_if_changed
from src.log.logging_config import setup_logging, reload_logging_config, get_logger
from src.database import create_tables
from src.controllers import auth_controller, objetivo_controller, movimiento_controller

# Initialize logger
logger = get_logger(__name__)


# Background task for config reload
async def config_reload_task():
    """
    Background task that periodically checks and reloads config.yaml.
    """
    settings = get_settings()

    if not settings.config_reload.enabled:
        logger.info("Config reload is disabled")
        return

    interval = settings.config_reload.check_interval_seconds
    logger.info(f"Config reload enabled - checking every {interval} seconds")

    while True:
        await asyncio.sleep(interval)

        try:
            was_reloaded = check_and_reload_if_changed()
            if was_reloaded:
                logger.info("Configuration reloaded from config.yaml")
                reload_logging_config()
                logger.info("Logging configuration updated")
        except Exception as e:
            logger.error(f"Error reloading config: {e}", exc_info=True)


# Startup event
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    logger.info("Starting application...")

    # Initialize logging
    setup_logging()
    logger.info("Logging configured from config.yaml")

    # Create database tables
    create_tables()
    logger.info("Database tables created/verified")

    # Start config reload task
    settings = get_settings()
    if settings.config_reload.enabled:
        task = asyncio.create_task(config_reload_task())
        logger.info("Config reload background task started")
    else:
        task = None

    logger.info(f"✅ {settings.app.name} v{settings.app.version} started")

    yield

    # Shutdown
    if task:
        task.cancel()
    logger.info("Application shutdown")


# Create FastAPI app
settings = get_settings()

app = FastAPI(
    title=settings.app.name,
    version=settings.app.version,
    description="API para gestión de ahorros y objetivos financieros",
    lifespan=lifespan
)

# Configure CORS
if settings.cors.enabled:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors.origins,
        allow_credentials=settings.cors.allow_credentials,
        allow_methods=settings.cors.allow_methods,
        allow_headers=settings.cors.allow_headers,
    )
    logger.info(f"CORS enabled for origins: {settings.cors.origins}")

# Include routers
app.include_router(auth_controller.router, prefix=settings.app.api_prefix)
app.include_router(objetivo_controller.router, prefix=settings.app.api_prefix)
app.include_router(movimiento_controller.router, prefix=settings.app.api_prefix)


@app.get("/")
def root():
    """Endpoint raíz."""
    return {
        "message": f"Bienvenido a {settings.app.name}",
        "version": settings.app.version,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
