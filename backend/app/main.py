"""App FastAPI: API en /api y, si existe el build, el frontend en el resto de las rutas."""
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import SECRET_KEY_DESARROLLO, get_settings
from app.core.exception_handlers import registrar_handlers
from app.database import Base, SessionLocal, engine
from app.dependencies import usuario_actual
from app.routers import auth, categorias, eventos, mes, movimientos, preferencias, programados
from app.services.categoria_service import sembrar_categorias

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if get_settings().secret_key == SECRET_KEY_DESARROLLO:
        logger.warning("SECRET_KEY no está definida: se usa la de desarrollo (no apta para producción)")
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        sembrar_categorias(db)
    yield


def crear_app() -> FastAPI:
    app = FastAPI(title="App Ahorro", version="2.1.0", lifespan=lifespan)
    registrar_handlers(app)

    api = APIRouter(prefix="/api")
    api.include_router(auth.router)
    privadas = APIRouter(dependencies=[Depends(usuario_actual)])
    for modulo in (categorias, movimientos, programados, mes, eventos, preferencias):
        privadas.include_router(modulo.router)
    api.include_router(privadas)
    app.include_router(api)

    @app.get("/health", include_in_schema=False)
    def health() -> dict[str, str]:
        return {"status": "ok"}

    _servir_frontend(app)
    return app


def _servir_frontend(app: FastAPI) -> None:
    """Sirve el build de Vite; cualquier ruta desconocida devuelve index.html (rutas del SPA)."""
    dist = get_settings().frontend_dist
    if not (dist / "index.html").exists():
        return
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{ruta:path}", include_in_schema=False)
    def spa(ruta: str) -> FileResponse:
        if ruta.startswith("api/"):
            raise HTTPException(status_code=404, detail="Ruta inexistente")
        archivo = (dist / ruta).resolve()
        if ruta and archivo.is_file() and archivo.is_relative_to(dist.resolve()):
            return FileResponse(archivo)
        return FileResponse(dist / "index.html")


app = crear_app()
