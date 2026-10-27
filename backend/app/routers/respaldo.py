"""Descargas de respaldo: la base completa y los movimientos en CSV."""
import tempfile
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Response
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.database import engine
from app.dependencies import DbDep
from app.services.respaldo_service import copiar_base, movimientos_csv

router = APIRouter(prefix="/respaldo", tags=["Respaldo"])


@router.get("/base", response_class=FileResponse)
def base() -> FileResponse:
    carpeta = Path(tempfile.mkdtemp(prefix="ahorro-copia-"))
    destino = carpeta / f"ahorro-{date.today().isoformat()}.db"
    copiar_base(engine, destino)

    def _limpiar() -> None:
        destino.unlink(missing_ok=True)
        carpeta.rmdir()

    return FileResponse(destino, filename=destino.name, media_type="application/vnd.sqlite3", background=BackgroundTask(_limpiar))


@router.get("/movimientos.csv", response_class=Response)
def movimientos(db: DbDep) -> Response:
    return Response(
        movimientos_csv(db),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="movimientos-{date.today().isoformat()}.csv"'},
    )
