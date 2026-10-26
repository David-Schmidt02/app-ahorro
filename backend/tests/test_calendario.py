from datetime import UTC, datetime, timedelta

from app.database import SessionLocal
from app.models import Cotizacion


def test_eventos_anuales_y_unicos(api):
    api.post("/api/eventos", json={"titulo": "Aniversario", "tipo": "aniversario", "fecha": "2024-02-29", "anual": True})
    api.post("/api/eventos", json={"titulo": "Cena", "tipo": "salida", "fecha": "2026-02-14", "hora": "21:30"})

    febrero = api.get("/api/calendario", params={"mes": "2026-02"}).json()["eventos"]
    assert [(e["titulo"], e["dia"]) for e in febrero] == [("Cena", "2026-02-14"), ("Aniversario", "2026-02-28")]

    # Antes de la fecha original no aparece, y el evento único no se repite
    assert api.get("/api/calendario", params={"mes": "2023-02"}).json()["eventos"] == []
    assert [e["titulo"] for e in api.get("/api/calendario", params={"mes": "2027-02"}).json()["eventos"]] == ["Aniversario"]


def test_editar_y_borrar_evento(api):
    evento = api.post("/api/eventos", json={"titulo": "Turno", "tipo": "recordatorio", "fecha": "2026-10-10"}).json()
    editado = api.put(f"/api/eventos/{evento['id']}", json={"titulo": "Turno médico", "tipo": "recordatorio", "fecha": "2026-10-11"})
    assert editado.json()["fecha"] == "2026-10-11"
    assert api.delete(f"/api/eventos/{evento['id']}").status_code == 204


def test_cotizacion_cacheada_y_respaldo(api, cotizacion_falsa):
    assert api.get("/api/cotizacion").json()["venta"] == 1200
    api.get("/api/cotizacion")
    assert cotizacion_falsa.llamadas == 1

    # Vencida y con la API caída: devuelve la última conocida
    with SessionLocal() as db:
        db.query(Cotizacion).update({"obtenida_en": datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1)})
        db.commit()
    cotizacion_falsa.caida = True
    assert api.get("/api/cotizacion").json()["venta"] == 1200


def test_sin_cotizacion_y_api_caida(api, cotizacion_falsa):
    cotizacion_falsa.caida = True
    assert api.get("/api/cotizacion").status_code == 503
