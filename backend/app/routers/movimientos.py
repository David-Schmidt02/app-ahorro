from fastapi import APIRouter, status

from app.dependencies import MovimientosDep, UsuarioDep
from app.models import TipoMovimiento
from app.schemas.comunes import Mes
from app.schemas.movimientos import MovimientoIn, MovimientoOut, MovimientoUpdate

router = APIRouter(prefix="/movimientos", tags=["Movimientos"])


@router.get("", response_model=list[MovimientoOut])
def listar(
    mes: Mes, servicio: MovimientosDep, tipo: TipoMovimiento | None = None, categoria_id: int | None = None
) -> list[MovimientoOut]:
    return [MovimientoOut.desde(m) for m in servicio.listar(mes, tipo, categoria_id)]


@router.post("", response_model=MovimientoOut, status_code=status.HTTP_201_CREATED)
def crear(datos: MovimientoIn, servicio: MovimientosDep, usuario: UsuarioDep) -> MovimientoOut:
    return MovimientoOut.desde(servicio.crear(datos, usuario))


@router.patch("/{movimiento_id}", response_model=MovimientoOut)
def actualizar(movimiento_id: int, datos: MovimientoUpdate, servicio: MovimientosDep) -> MovimientoOut:
    return MovimientoOut.desde(servicio.actualizar(movimiento_id, datos))


@router.delete("/{movimiento_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(movimiento_id: int, servicio: MovimientosDep) -> None:
    servicio.eliminar(movimiento_id)
