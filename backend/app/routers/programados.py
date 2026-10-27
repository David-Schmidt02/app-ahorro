from fastapi import APIRouter, status

from app.dependencies import ProgramadosDep, UsuarioDep
from app.schemas.comunes import Mes
from app.schemas.movimientos import MovimientoOut
from app.schemas.programados import PagarIn, ProgramadoIn, ProgramadoOut, ProgramadoUpdate, VencimientoOut

router = APIRouter(prefix="/programados", tags=["Pagos programados"])


@router.get("", response_model=list[ProgramadoOut])
def listar(servicio: ProgramadosDep) -> list[ProgramadoOut]:
    return [ProgramadoOut.desde_modelo(p) for p in servicio.listar()]


@router.get("/vencimientos", response_model=list[VencimientoOut])
def vencimientos(mes: Mes, servicio: ProgramadosDep) -> list[VencimientoOut]:
    return servicio.vencimientos(mes)


@router.post("", response_model=ProgramadoOut, status_code=status.HTTP_201_CREATED)
def crear(datos: ProgramadoIn, servicio: ProgramadosDep) -> ProgramadoOut:
    return ProgramadoOut.desde_modelo(servicio.crear(datos))


@router.patch("/{programado_id}", response_model=ProgramadoOut)
def actualizar(programado_id: int, datos: ProgramadoUpdate, servicio: ProgramadosDep) -> ProgramadoOut:
    return ProgramadoOut.desde_modelo(servicio.actualizar(programado_id, datos))


@router.delete("/{programado_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(programado_id: int, servicio: ProgramadosDep) -> None:
    servicio.eliminar(programado_id)


@router.post("/{programado_id}/pagar", response_model=MovimientoOut, status_code=status.HTTP_201_CREATED)
def pagar(programado_id: int, datos: PagarIn, servicio: ProgramadosDep, usuario: UsuarioDep) -> MovimientoOut:
    return MovimientoOut.desde(servicio.pagar(programado_id, datos, usuario))
