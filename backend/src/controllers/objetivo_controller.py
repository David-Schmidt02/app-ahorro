"""Controller para gestión de objetivos."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.objetivo_repository import ObjetivoRepository
from src.services.objetivo_service import ObjetivoService
from src.schemas.objetivo_schema import (
    ObjetivoCreate,
    ObjetivoUpdate,
    ObjetivoResponse,
    PostergarFechaRequest
)
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario
from src.domain.enums import EstadoObjetivo


router = APIRouter(prefix="/objetivos", tags=["Objetivos"])


def get_objetivo_service(db: Session = Depends(get_db)) -> ObjetivoService:
    """Dependency que proporciona el servicio de objetivo."""
    repository = ObjetivoRepository(db)
    return ObjetivoService(repository)


@router.post("/", response_model=ObjetivoResponse, status_code=status.HTTP_201_CREATED)
def crear_objetivo(
    objetivo_data: ObjetivoCreate,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Crea un nuevo objetivo."""
    objetivo = service.crear_objetivo(
        nombre=objetivo_data.nombre,
        monto_objetivo=objetivo_data.monto_objetivo,
        moneda=objetivo_data.moneda,
        fecha_limite=objetivo_data.fecha_limite,
        descripcion=objetivo_data.descripcion,
        es_prioritario=objetivo_data.es_prioritario
    )

    # Agregar campos calculados para la respuesta
    return _enriquecer_objetivo_response(objetivo)


@router.get("/", response_model=List[ObjetivoResponse])
def listar_objetivos(
    estado: EstadoObjetivo = Query(None, description="Filtrar por estado"),
    prioritario: bool = Query(None, description="Filtrar solo prioritarios"),
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Lista objetivos con filtros opcionales."""
    if prioritario:
        objetivos = service.listar_objetivos_prioritarios()
    elif estado:
        objetivos = service.listar_objetivos_por_estado(estado)
    else:
        objetivos = service.listar_objetivos()

    return [_enriquecer_objetivo_response(obj) for obj in objetivos]


@router.get("/{objetivo_id}", response_model=ObjetivoResponse)
def obtener_objetivo(
    objetivo_id: int,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene un objetivo por su ID."""
    objetivo = service.obtener_objetivo(objetivo_id)
    return _enriquecer_objetivo_response(objetivo)


@router.put("/{objetivo_id}", response_model=ObjetivoResponse)
def actualizar_objetivo(
    objetivo_id: int,
    objetivo_data: ObjetivoUpdate,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza un objetivo existente."""
    objetivo = service.actualizar_objetivo(
        objetivo_id=objetivo_id,
        nombre=objetivo_data.nombre,
        descripcion=objetivo_data.descripcion,
        monto_objetivo=objetivo_data.monto_objetivo,
        fecha_limite=objetivo_data.fecha_limite,
        es_prioritario=objetivo_data.es_prioritario
    )

    return _enriquecer_objetivo_response(objetivo)


@router.post("/{objetivo_id}/postergar", response_model=ObjetivoResponse)
def postergar_fecha_limite(
    objetivo_id: int,
    request: PostergarFechaRequest,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Posterga la fecha límite de un objetivo."""
    objetivo = service.postergar_fecha_limite(objetivo_id, request.nueva_fecha)
    return _enriquecer_objetivo_response(objetivo)


@router.post("/{objetivo_id}/completar", response_model=ObjetivoResponse)
def marcar_completado(
    objetivo_id: int,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Marca un objetivo como completado."""
    objetivo = service.marcar_completado(objetivo_id)
    return _enriquecer_objetivo_response(objetivo)


@router.post("/{objetivo_id}/pausar", response_model=ObjetivoResponse)
def pausar_objetivo(
    objetivo_id: int,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Pausa un objetivo."""
    objetivo = service.pausar_objetivo(objetivo_id)
    return _enriquecer_objetivo_response(objetivo)


@router.post("/{objetivo_id}/reactivar", response_model=ObjetivoResponse)
def reactivar_objetivo(
    objetivo_id: int,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Reactiva un objetivo pausado."""
    objetivo = service.reactivar_objetivo(objetivo_id)
    return _enriquecer_objetivo_response(objetivo)


@router.delete("/{objetivo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_objetivo(
    objetivo_id: int,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Elimina un objetivo."""
    service.eliminar_objetivo(objetivo_id)
    return None


def _enriquecer_objetivo_response(objetivo) -> dict:
    """Helper que agrega campos calculados a la respuesta del objetivo."""
    return {
        **objetivo.__dict__,
        "porcentaje_completado": objetivo.calcular_porcentaje_completado(),
        "pago_mensual_requerido": objetivo.calcular_pago_mensual_requerido()
    }
