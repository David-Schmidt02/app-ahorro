from datetime import UTC, datetime, timedelta

from app.database import SessionLocal
from app.models import Cotizacion
from tests.conftest import categoria_id


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


def test_proximos_cruza_el_mes_y_omite_lo_pagado(api):
    casa = categoria_id(api, "Casa")
    alquiler = api.post(
        "/api/programados",
        json={"nombre": "Alquiler", "tipo": "gasto", "categoria_id": casa, "monto": 1, "frecuencia": "mensual", "dia": 30, "desde": "2026-10"},
    ).json()
    api.post(
        "/api/programados",
        json={"nombre": "Expensas", "tipo": "gasto", "categoria_id": casa, "monto": 1, "frecuencia": "mensual", "dia": 2, "desde": "2026-10"},
    )
    api.post("/api/eventos", json={"titulo": "Cumple", "tipo": "cumpleanos", "fecha": "1990-11-01", "anual": True})
    api.post("/api/eventos", json={"titulo": "Lejos", "tipo": "otro", "fecha": "2026-11-20"})

    r = api.get("/api/proximos", params={"desde": "2026-10-28", "dias": 7}).json()
    assert r["hasta"] == "2026-11-03"
    assert [(v["nombre"], v["fecha"]) for v in r["vencimientos"]] == [("Alquiler", "2026-10-30"), ("Expensas", "2026-11-02")]
    assert [(e["titulo"], e["dia"]) for e in r["eventos"]] == [("Cumple", "2026-11-01")]

    api.post(f"/api/programados/{alquiler['id']}/pagar", json={"mes": "2026-10"})
    r = api.get("/api/proximos", params={"desde": "2026-10-28"}).json()
    assert [v["nombre"] for v in r["vencimientos"]] == ["Expensas"]


def test_icono_de_categoria_es_un_nombre(api):
    ok = api.post("/api/categorias", json={"nombre": "Mascotas", "icono": "paw-print", "color": "#2A78D6", "tipo": "gasto"})
    assert ok.status_code == 201
    mal = api.post("/api/categorias", json={"nombre": "X", "icono": "🐶", "color": "#2A78D6", "tipo": "gasto"})
    assert mal.status_code == 422
