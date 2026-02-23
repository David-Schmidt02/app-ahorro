"""Controller para gestión de objetivos."""
from typing import List
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories.objetivo_repository import ObjetivoRepository
from src.repositories.movimiento_repository import MovimientoRepository
from src.services.objetivo_service import ObjetivoService
from src.services.proyeccion_service import ProyeccionService
from src.schemas.objetivo_schema import (
    ObjetivoCreate,
    ObjetivoUpdate,
    ObjetivoResponse,
    PostergarFechaRequest
)
from src.schemas.proyeccion_schema import ProyeccionResponse
from src.middleware.auth_middleware import obtener_usuario_actual
from src.domain.usuario import Usuario
from src.domain.enums import EstadoObjetivo


router = APIRouter(prefix="/objetivos", tags=["Objetivos"])


def get_objetivo_service(db: Session = Depends(get_db)) -> ObjetivoService:
    """Dependency que proporciona el servicio de objetivo."""
    repository = ObjetivoRepository(db)
    return ObjetivoService(repository)


def get_proyeccion_service(db: Session = Depends(get_db)) -> ProyeccionService:
    """Dependency que proporciona el servicio de proyecciones."""
    from src.repositories.tasa_cambio_repository import TasaCambioRepository
    from src.services.tasa_cambio_service import TasaCambioService
    
    objetivo_repo = ObjetivoRepository(db)
    movimiento_repo = MovimientoRepository(db)
    tasa_repo = TasaCambioRepository(db)
    tasa_service = TasaCambioService(tasa_repo)
    
    return ProyeccionService(objetivo_repo, movimiento_repo, tasa_service)


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
    busqueda: str = Query(None, description="Buscar por nombre o descripción"),
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Lista objetivos con filtros opcionales."""
    # Obtener lista base según filtros prioritarios
    if prioritario:
        objetivos = service.listar_objetivos_prioritarios()
    elif estado:
        objetivos = service.listar_objetivos_por_estado(estado)
    else:
        objetivos = service.listar_objetivos()

    # Aplicar búsqueda por texto si se especificó
    if busqueda:
        busqueda_lower = busqueda.lower()
        objetivos = [
            obj for obj in objetivos
            if busqueda_lower in obj.nombre.lower() or
               (obj.descripcion and busqueda_lower in obj.descripcion.lower())
        ]

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
        moneda=objetivo_data.moneda,
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


@router.put("/{objetivo_id}/estado", response_model=ObjetivoResponse)
def actualizar_estado_objetivo(
    objetivo_id: int,
    estado: EstadoObjetivo = Query(..., description="Nuevo estado del objetivo"),
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza el estado de un objetivo (activo, pausado, completado)."""
    if estado == EstadoObjetivo.COMPLETADO:
        objetivo = service.marcar_completado(objetivo_id)
    elif estado == EstadoObjetivo.PAUSADO:
        objetivo = service.pausar_objetivo(objetivo_id)
    else:
        objetivo = service.reactivar_objetivo(objetivo_id)
    
    return _enriquecer_objetivo_response(objetivo)


@router.get("/{objetivo_id}/proyeccion", response_model=ProyeccionResponse)
async def obtener_proyeccion(
    objetivo_id: int,
    service: ProyeccionService = Depends(get_proyeccion_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene la proyección de cumplimiento de un objetivo."""
    proyeccion = await service.calcular_proyeccion(objetivo_id)
    return proyeccion


@router.get("/exportar/csv")
def exportar_objetivos_csv(
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Exporta todos los objetivos del usuario a un archivo CSV."""
    objetivos = service.listar_objetivos()

    # Crear CSV en memoria
    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezados
    writer.writerow([
        'ID', 'Nombre', 'Descripción', 'Monto Objetivo', 'Moneda',
        'Monto Acumulado', '% Completado', 'Estado', 'Es Prioritario',
        'Fecha Límite', 'Fecha Creación'
    ])

    # Datos
    for obj in objetivos:
        porcentaje = obj.calcular_porcentaje_completado()
        monto_acumulado = obj.monto_objetivo * (porcentaje / 100)
        writer.writerow([
            obj.id,
            obj.nombre,
            obj.descripcion or '',
            float(obj.monto_objetivo),
            obj.moneda,
            float(monto_acumulado),
            float(porcentaje),
            obj.estado.value,
            'Sí' if obj.es_prioritario else 'No',
            obj.fecha_limite.strftime('%Y-%m-%d') if obj.fecha_limite else '',
            obj.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S')
        ])

    # Preparar respuesta
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=objetivos.csv"}
    )


@router.delete("/{objetivo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_objetivo(
    objetivo_id: int,
    service: ObjetivoService = Depends(get_objetivo_service),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """Elimina un objetivo."""
    service.eliminar_objetivo(objetivo_id)
    return None


import json

def _enriquecer_objetivo_response(objetivo) -> dict:
    """Helper que agrega campos calculados a la respuesta del objetivo."""
    try:
        historial = json.loads(objetivo.historial_progreso) if hasattr(objetivo, 'historial_progreso') and objetivo.historial_progreso else []
    except Exception:
        historial = []
        
    return {
        **objetivo.__dict__,
        "porcentaje_completado": objetivo.calcular_porcentaje_completado(),
        "pago_mensual_requerido": objetivo.calcular_pago_mensual_requerido(),
        "historial_progreso": historial
    }
