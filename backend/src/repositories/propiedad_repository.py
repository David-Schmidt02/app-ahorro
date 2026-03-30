"""Repositorio de propiedades."""
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from src.database import PropiedadORM
from src.domain.propiedad import Propiedad
from src.domain.enums import EstadoPropiedad, Moneda


class PropiedadRepository:

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, orm: PropiedadORM) -> Propiedad:
        """Convierte un ORM a una entidad de dominio."""
        return Propiedad(
            id=orm.id,
            url=orm.url,
            creado_por_id=orm.creado_por_id,
            estado=EstadoPropiedad(orm.estado),
            precio=Decimal(str(orm.precio)) if orm.precio else None,
            moneda=Moneda(orm.moneda) if orm.moneda else None,
            expensas=Decimal(str(orm.expensas)) if orm.expensas else None,
            moneda_expensas=Moneda(orm.moneda_expensas) if orm.moneda_expensas else None,
            direccion=orm.direccion,
            inmobiliaria=orm.inmobiliaria,
            contacto=orm.contacto,
            metros_cuadrados=Decimal(str(orm.metros_cuadrados)) if orm.metros_cuadrados else None,
            cuartos=orm.cuartos,
            banios=orm.banios,
            notas=orm.notas,
            en_top=orm.en_top,
            posicion_top=orm.posicion_top,
            creado_en=orm.creado_en,
        )

    def crear(self, propiedad: Propiedad) -> Propiedad:
        """Crea una nueva propiedad en la base de datos."""
        orm = PropiedadORM(
            url=propiedad.url,
            creado_por_id=propiedad.creado_por_id,
            estado=propiedad.estado.value,
            precio=propiedad.precio,
            moneda=propiedad.moneda.value if propiedad.moneda else None,
            expensas=propiedad.expensas,
            moneda_expensas=propiedad.moneda_expensas.value if propiedad.moneda_expensas else None,
            direccion=propiedad.direccion,
            inmobiliaria=propiedad.inmobiliaria,
            contacto=propiedad.contacto,
            metros_cuadrados=propiedad.metros_cuadrados,
            cuartos=propiedad.cuartos,
            banios=propiedad.banios,
            notas=propiedad.notas,
            en_top=propiedad.en_top,
            posicion_top=propiedad.posicion_top,
        )
        self.db.add(orm)
        self.db.commit()
        self.db.refresh(orm)
        return self._to_domain(orm)

    def listar_todas(self) -> List[Propiedad]:
        """Lista todas las propiedades (compartidas entre usuarios)."""
        orms = (
            self.db.query(PropiedadORM)
            .order_by(PropiedadORM.creado_en.desc())
            .all()
        )
        return [self._to_domain(o) for o in orms]

    def obtener(self, propiedad_id: int) -> Optional[Propiedad]:
        """Obtiene una propiedad por ID."""
        orm = self.db.query(PropiedadORM).filter(PropiedadORM.id == propiedad_id).first()
        return self._to_domain(orm) if orm else None

    def actualizar(self, propiedad_id: int, datos: dict) -> Optional[Propiedad]:
        """Actualiza una propiedad existente."""
        orm = self.db.query(PropiedadORM).filter(PropiedadORM.id == propiedad_id).first()
        if not orm:
            return None

        # Actualizar solo los campos que vinieron
        for key, value in datos.items():
            if value is not None:
                if key in ['moneda', 'moneda_expensas', 'estado']:
                    # Para enums, guardamos el .value
                    setattr(orm, key, value.value if hasattr(value, 'value') else value)
                else:
                    setattr(orm, key, value)

        self.db.commit()
        self.db.refresh(orm)
        return self._to_domain(orm)

    def eliminar(self, propiedad_id: int) -> bool:
        """Elimina una propiedad."""
        orm = self.db.query(PropiedadORM).filter(PropiedadORM.id == propiedad_id).first()
        if not orm:
            return False

        self.db.delete(orm)
        self.db.commit()
        return True

    def reordenar_top(self, ids_ordenados: List[int]) -> bool:
        """Reordena el Top 10 según la lista de IDs proporcionada."""
        try:
            for posicion, prop_id in enumerate(ids_ordenados, start=1):
                orm = self.db.query(PropiedadORM).filter(PropiedadORM.id == prop_id).first()
                if not orm:
                    return False
                orm.posicion_top = posicion

            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False
