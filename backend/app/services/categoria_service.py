from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.core.dinero import a_centavos
from app.core.exceptions import Conflicto, NoEncontrado, ReglaDeNegocio
from app.models import Categoria, Movimiento, Programado, TipoMovimiento
from app.schemas.categorias import CategoriaIn, CategoriaUpdate

CATEGORIAS_INICIALES: list[tuple[str, str, str, TipoMovimiento]] = [
    ("Súper", "🛒", "#1BAF7A", TipoMovimiento.GASTO),
    ("Casa", "🏠", "#2A78D6", TipoMovimiento.GASTO),
    ("Servicios", "💡", "#EDA100", TipoMovimiento.GASTO),
    ("Transporte", "🚌", "#6250D6", TipoMovimiento.GASTO),
    ("Salud", "🩺", "#E34948", TipoMovimiento.GASTO),
    ("Salidas", "🍕", "#EB6834", TipoMovimiento.GASTO),
    ("Ropa", "👕", "#E87BA4", TipoMovimiento.GASTO),
    ("Suscripciones", "📺", "#008300", TipoMovimiento.GASTO),
    ("Regalos", "🎁", "#B0478A", TipoMovimiento.GASTO),
    ("Otros", "📦", "#7A7F8A", TipoMovimiento.GASTO),
    ("Sueldo", "💼", "#008300", TipoMovimiento.INGRESO),
    ("Extra", "✨", "#2A78D6", TipoMovimiento.INGRESO),
]


def sembrar_categorias(db: Session) -> None:
    """Crea las categorías iniciales si la base está vacía."""
    if db.scalar(select(func.count(Categoria.id))):
        return
    db.add_all(
        Categoria(nombre=nombre, icono=icono, color=color, tipo=tipo, orden=orden)
        for orden, (nombre, icono, color, tipo) in enumerate(CATEGORIAS_INICIALES)
    )
    db.commit()


class CategoriaService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(self, incluir_archivadas: bool = False) -> list[Categoria]:
        consulta = select(Categoria).order_by(Categoria.tipo, Categoria.orden, Categoria.id)
        if not incluir_archivadas:
            consulta = consulta.where(Categoria.activa)
        return list(self.db.scalars(consulta))

    def obtener(self, categoria_id: int) -> Categoria:
        categoria = self.db.get(Categoria, categoria_id)
        if categoria is None:
            raise NoEncontrado("La categoría no existe")
        return categoria

    def para_movimiento(self, categoria_id: int, tipo: TipoMovimiento) -> Categoria:
        """La categoría, validando que sea del mismo tipo (gasto/ingreso) y que no esté archivada."""
        categoria = self.obtener(categoria_id)
        if categoria.tipo != tipo:
            raise ReglaDeNegocio(f"«{categoria.nombre}» es una categoría de {categoria.tipo.value}s")
        if not categoria.activa:
            raise ReglaDeNegocio(f"«{categoria.nombre}» está archivada")
        return categoria

    def crear(self, datos: CategoriaIn) -> Categoria:
        ultimo_orden = self.db.scalar(select(func.max(Categoria.orden))) or 0
        categoria = Categoria(
            nombre=datos.nombre.strip(), icono=datos.icono, color=datos.color, tipo=datos.tipo,
            presupuesto_centavos=a_centavos(datos.presupuesto) if datos.presupuesto is not None else None,
            orden=ultimo_orden + 1,
        )
        self.db.add(categoria)
        self.db.commit()
        return categoria

    def actualizar(self, categoria_id: int, datos: CategoriaUpdate) -> Categoria:
        categoria = self.obtener(categoria_id)
        cambios = datos.model_dump(exclude_unset=True)
        if "presupuesto" in cambios:
            presupuesto = cambios.pop("presupuesto")
            categoria.presupuesto_centavos = a_centavos(presupuesto) if presupuesto is not None else None
        for campo, valor in cambios.items():
            if valor is not None:
                setattr(categoria, campo, valor)
        self.db.commit()
        return categoria

    def eliminar(self, categoria_id: int) -> None:
        categoria = self.obtener(categoria_id)
        en_uso = self.db.scalar(
            select(
                exists().where(Movimiento.categoria_id == categoria_id)
                | exists().where(Programado.categoria_id == categoria_id)
            )
        )
        if en_uso:
            raise Conflicto("La categoría tiene movimientos o pagos programados: archivala en lugar de borrarla")
        self.db.delete(categoria)
        self.db.commit()
