from icalendar import Calendar

from app.services import calendario_externo_service
from tests.conftest import categoria_id

ICS_GOOGLE = b"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
UID:cumple-mama@google.com
DTSTART;VALUE=DATE:19600214
DTEND;VALUE=DATE:19600215
RRULE:FREQ=YEARLY
SUMMARY:Cumple de mam\xc3\xa1
END:VEVENT
BEGIN:VEVENT
UID:dentista@google.com
DTSTART:20261103T133000Z
DTEND:20261103T143000Z
SUMMARY:Dentista
END:VEVENT
END:VCALENDAR
"""


def _agregar_google(api, ics_falso) -> dict:
    ics_falso.contenido = ICS_GOOGLE
    respuesta = api.post(
        "/api/calendarios-externos",
        json={"nombre": "Google de Ana", "url": "webcal://calendar.google.com/calendar/ical/secreto/basic.ics"},
    )
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


def test_calendario_externo_suma_sus_eventos_al_mes(api, ics_falso):
    google = _agregar_google(api, ics_falso)
    assert google["origen"] == "calendar.google.com"
    assert "secreto" not in str(api.get("/api/calendarios-externos").json())

    febrero = api.get("/api/calendario", params={"mes": "2027-02"}).json()
    assert [(e["titulo"], e["dia"]) for e in febrero["externos"]] == [("Cumple de mamá", "2027-02-14")]

    noviembre = api.get("/api/calendario", params={"mes": "2026-11"}).json()["externos"]
    # 13:30 UTC son las 10:30 en Buenos Aires
    assert [(e["titulo"], e["hora"], e["calendario"]) for e in noviembre] == [("Dentista", "10:30", "Google de Ana")]

    proximos = api.get("/api/proximos", params={"desde": "2026-11-01", "dias": 7}).json()
    assert [e["titulo"] for e in proximos["externos"]] == ["Dentista"]

    api.delete(f"/api/calendarios-externos/{google['id']}")
    assert api.get("/api/calendario", params={"mes": "2026-11"}).json()["externos"] == []


def test_direccion_que_no_es_un_calendario(api, ics_falso):
    ics_falso.contenido = b"<html>no es un calendario</html>"
    respuesta = api.post("/api/calendarios-externos", json={"nombre": "Roto", "url": "https://ejemplo.com/cal.ics"})
    assert respuesta.status_code == 422
    sin_https = api.post("/api/calendarios-externos", json={"nombre": "Roto", "url": "http://ejemplo.com/cal.ics"})
    assert sin_https.status_code == 422


def test_si_el_calendario_externo_no_responde_el_mes_se_ve_igual(api, ics_falso):
    _agregar_google(api, ics_falso)
    calendario_externo_service._cache.clear()
    ics_falso.caido = True
    mes = api.get("/api/calendario", params={"mes": "2026-11"})
    assert mes.status_code == 200
    assert mes.json()["externos_con_error"] == ["Google de Ana"]


def test_ics_de_la_app_con_vencimientos_y_eventos(api):
    api.post(
        "/api/programados",
        json={"nombre": "Alquiler", "tipo": "gasto", "categoria_id": categoria_id(api, "Casa"),
              "monto": 650000, "frecuencia": "mensual", "dia": 10},
    )
    api.post("/api/eventos", json={"titulo": "Aniversario", "tipo": "aniversario", "fecha": "2020-03-08", "anual": True})
    ruta = api.get("/api/calendario/suscripcion").json()["ruta"]

    sin_sesion = api.get(ruta, headers={"Authorization": ""})
    assert sin_sesion.status_code == 200
    assert sin_sesion.headers["content-type"].startswith("text/calendar")
    eventos = Calendar.from_ical(sin_sesion.content).walk("VEVENT")
    titulos = [str(e["SUMMARY"]) for e in eventos]
    assert "Vence: Alquiler ($ 650.000)" in titulos
    assert "Aniversario" in titulos
    alquiler = next(e for e in eventos if "Alquiler" in str(e["SUMMARY"]))
    assert alquiler.walk("VALARM")

    assert api.get("/api/calendario.ics", params={"clave": "otra"}).status_code == 401
