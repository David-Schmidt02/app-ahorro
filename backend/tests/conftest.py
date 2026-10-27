import os
import tempfile
from pathlib import Path

# La base de los tests va a un archivo temporal, antes de que app.database cree el engine
_DIR = Path(tempfile.mkdtemp(prefix="app-ahorro-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_DIR / 'tests.db'}"
os.environ["FRONTEND_DIST"] = str(_DIR / "sin-frontend")

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.dependencies import DbDep, calendario_externo_service, cotizacion_service  # noqa: E402
from app.main import app  # noqa: E402
from app.services import calendario_externo_service as modulo_externos  # noqa: E402
from app.services.calendario_externo_service import CalendarioExternoService  # noqa: E402
from app.services.cotizacion_service import CotizacionService  # noqa: E402

COTIZACION_VENTA = 1200.0


class CotizacionFalsa:
    """Reemplaza a dolarapi.com: devuelve una cotización fija o falla si `caida` es True."""

    def __init__(self) -> None:
        self.caida = False
        self.llamadas = 0

    def __call__(self) -> tuple[float, float]:
        self.llamadas += 1
        if self.caida:
            raise ValueError("API caída")
        return COTIZACION_VENTA - 40, COTIZACION_VENTA


@pytest.fixture
def cotizacion_falsa() -> CotizacionFalsa:
    return CotizacionFalsa()


class IcsFalso:
    """Reemplaza la descarga de calendarios de afuera: devuelve `contenido` o falla si `caido` es True."""

    def __init__(self) -> None:
        self.contenido = b""
        self.caido = False

    def __call__(self, url: str) -> bytes:
        if self.caido:
            raise httpx.ConnectError("sin red")
        return self.contenido


@pytest.fixture
def ics_falso() -> IcsFalso:
    return IcsFalso()


@pytest.fixture
def cliente(cotizacion_falsa: CotizacionFalsa, ics_falso: IcsFalso):
    Base.metadata.drop_all(engine)
    modulo_externos._cache.clear()

    def _cotizacion(db: DbDep) -> CotizacionService:
        return CotizacionService(db, cotizacion_falsa)

    def _externos(db: DbDep) -> CalendarioExternoService:
        return CalendarioExternoService(db, ics_falso)

    app.dependency_overrides[cotizacion_service] = _cotizacion
    app.dependency_overrides[calendario_externo_service] = _externos
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def registrar(cliente: TestClient, email: str = "ana@casa.com", nombre: str = "Ana") -> dict:
    respuesta = cliente.post("/api/auth/registro", json={"nombre": nombre, "email": email, "password": "secreta1"})
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


@pytest.fixture
def api(cliente: TestClient) -> TestClient:
    """Cliente con sesión iniciada."""
    sesion = registrar(cliente)
    cliente.headers["Authorization"] = f"Bearer {sesion['token']}"
    return cliente


def categoria_id(api: TestClient, nombre: str) -> int:
    return next(c["id"] for c in api.get("/api/categorias").json() if c["nombre"] == nombre)
