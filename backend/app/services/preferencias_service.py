from sqlalchemy.orm import Session

from app.core.dinero import a_centavos
from app.models import Preferencias
from app.schemas.preferencias import PreferenciasIn

_ID_UNICO = 1


class PreferenciasService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def obtener(self) -> Preferencias:
        preferencias = self.db.get(Preferencias, _ID_UNICO)
        if preferencias is None:
            preferencias = Preferencias(id=_ID_UNICO)
            self.db.add(preferencias)
            self.db.commit()
        return preferencias

    def guardar(self, datos: PreferenciasIn) -> Preferencias:
        preferencias = self.obtener()
        preferencias.objetivo_centavos = a_centavos(datos.objetivo) if datos.objetivo else None
        preferencias.objetivo_moneda = datos.objetivo_moneda
        self.db.commit()
        return preferencias
