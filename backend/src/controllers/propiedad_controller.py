"""Controller para propiedades en alquiler."""
from typing import List

from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from src.database import get_db, create_tables, engine, Base
from src.repositories.propiedad_repository import PropiedadRepository
from src.services.propiedad_service import PropiedadService
from src.schemas.propiedad_schema import PropiedadCreate, PropiedadUpdate, PropiedadResponse, ReordenarTopRequest
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario
from src.domain.enums import EstadoPropiedad


router = APIRouter(prefix="/propiedades", tags=["Propiedades"])


def get_propiedad_service(db: Session = Depends(get_db)) -> PropiedadService:
    """Crea el servicio de propiedades y asegura que las tablas existan."""
    try:
        # Intentar crear las tablas si no existen
        Base.metadata.create_all(bind=engine)
    except Exception:
        # Si hay error, continuar (las tablas pueden ya existir)
        pass

    return PropiedadService(repository=PropiedadRepository(db))


@router.post("/", response_model=PropiedadResponse, status_code=status.HTTP_201_CREATED)
async def crear_propiedad(
    data: PropiedadCreate,
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Crea una nueva propiedad."""
    try:
        return service.crear_propiedad(
            url=data.url,
            creado_por_id=current_user.id,
            estado=data.estado,
            precio=data.precio,
            moneda=data.moneda,
            expensas=data.expensas,
            moneda_expensas=data.moneda_expensas,
            direccion=data.direccion,
            inmobiliaria=data.inmobiliaria,
            contacto=data.contacto,
            metros_cuadrados=data.metros_cuadrados,
            cuartos=data.cuartos,
            banios=data.banios,
            notas=data.notas,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[PropiedadResponse])
def listar_propiedades(
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Lista todas las propiedades (compartidas entre usuarios)."""
    return service.listar_propiedades()


@router.get("/{propiedad_id}", response_model=PropiedadResponse)
def obtener_propiedad(
    propiedad_id: int,
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Obtiene una propiedad específica."""
    return service.obtener_propiedad(propiedad_id)


@router.put("/{propiedad_id}", response_model=PropiedadResponse)
def actualizar_propiedad(
    propiedad_id: int,
    data: PropiedadUpdate,
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Actualiza una propiedad existente."""
    return service.actualizar_propiedad(
        propiedad_id=propiedad_id,
        datos=data.model_dump(exclude_unset=True),
    )


@router.delete("/{propiedad_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_propiedad(
    propiedad_id: int,
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Elimina una propiedad."""
    service.eliminar_propiedad(propiedad_id)
    return None


@router.put("/{propiedad_id}/estado", response_model=PropiedadResponse)
def cambiar_estado(
    propiedad_id: int,
    estado: EstadoPropiedad = Query(...),
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Cambia el estado de una propiedad."""
    return service.cambiar_estado(propiedad_id, estado)


@router.put("/{propiedad_id}/top", response_model=PropiedadResponse)
def toggle_top(
    propiedad_id: int,
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Agrega/remueve una propiedad del Top 10."""
    return service.toggle_top(propiedad_id)


@router.put("/top/reordenar", status_code=status.HTTP_200_OK)
def reordenar_top(
    data: ReordenarTopRequest,
    service: PropiedadService = Depends(get_propiedad_service),
    current_user: Usuario = Depends(obtener_usuario_actual),
):
    """Reordena el Top 10 de propiedades."""
    success = service.reordenar_top(data.ids)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No se pudo reordenar el Top 10")
    return {"mensaje": "Top 10 reordenado exitosamente"}
