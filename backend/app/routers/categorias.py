from fastapi import APIRouter, status

from app.dependencies import DbDep
from app.schemas.categorias import CategoriaIn, CategoriaOut, CategoriaUpdate
from app.services.categoria_service import CategoriaService

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.get("", response_model=list[CategoriaOut])
def listar(db: DbDep, incluir_archivadas: bool = False) -> list[CategoriaOut]:
    return [CategoriaOut.desde(c) for c in CategoriaService(db).listar(incluir_archivadas)]


@router.post("", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def crear(datos: CategoriaIn, db: DbDep) -> CategoriaOut:
    return CategoriaOut.desde(CategoriaService(db).crear(datos))


@router.patch("/{categoria_id}", response_model=CategoriaOut)
def actualizar(categoria_id: int, datos: CategoriaUpdate, db: DbDep) -> CategoriaOut:
    return CategoriaOut.desde(CategoriaService(db).actualizar(categoria_id, datos))


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(categoria_id: int, db: DbDep) -> None:
    CategoriaService(db).eliminar(categoria_id)
