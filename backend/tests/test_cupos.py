from datetime import date

import pytest

from app.dependencies import hoy
from app.main import app
from tests.conftest import categoria_id

# Noviembre de 2026 empieza en domingo: la primera «semana» del mes es solo el 1
CUPO = 70_000  # 10.000 por día


@pytest.fixture
def con_fecha(api):
    def fijar(dia: date) -> None:
        app.dependency_overrides[hoy] = lambda: dia

    return fijar


def _gasto(api, categoria: str, monto: float, fecha: str, **extra) -> None:
    cuerpo = {"tipo": "gasto", "monto": monto, "categoria_id": categoria_id(api, categoria), "fecha": fecha, **extra}
    respuesta = api.post("/api/movimientos", json=cuerpo)
    assert respuesta.status_code == 201, respuesta.text


def _cupo_super(api, monto: float | None = CUPO) -> dict:
    respuesta = api.patch(f"/api/categorias/{categoria_id(api, 'Súper')}", json={"cupo_semanal": monto})
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def test_lo_que_se_pasaron_se_descuenta_de_la_semana_siguiente(api, con_fecha):
    con_fecha(date(2026, 11, 11))
    _cupo_super(api)
    _gasto(api, "Súper", 10_000, "2026-11-01")
    _gasto(api, "Súper", 100_000, "2026-11-05")
    _gasto(api, "Súper", 25_000, "2026-11-10")

    r = api.get("/api/resumen", params={"mes": "2026-11"}).json()

    assert (r["cupos"]["desde"], r["cupos"]["hasta"]) == ("2026-11-09", "2026-11-15")
    [cupo] = r["cupos"]["cupos"]
    # Del 1 al 8 correspondían 80.000 y gastaron 110.000
    assert cupo == {
        **cupo, "cupo_semanal": CUPO, "cupo": 70_000, "arrastre": -30_000,
        "disponible": 40_000, "gastado": 25_000, "restante": 15_000,
    }
    # Lo que queda de esta semana más el cupo del 16 al 30
    assert r["reservado_cupos"] == 15_000 + 150_000
    assert r["proyeccion"] == r["ahorro"] - r["reservado_cupos"]


def test_lo_que_sobra_no_se_suma_para_gastar(api, con_fecha):
    con_fecha(date(2026, 11, 11))
    _cupo_super(api)
    _gasto(api, "Súper", 50_000, "2026-11-03")

    [cupo] = api.get("/api/resumen", params={"mes": "2026-11"}).json()["cupos"]["cupos"]

    # La semana pasada (2 al 8) sobraron 20.000: van al ahorro, no se suman
    assert (cupo["arrastre"], cupo["disponible"], cupo["restante"]) == (20_000, 70_000, 70_000)


def test_el_arrastre_vuelve_a_cero_cada_mes(api, con_fecha):
    con_fecha(date(2026, 12, 1))
    _cupo_super(api)
    _gasto(api, "Súper", 500_000, "2026-11-30")

    r = api.get("/api/resumen", params={"mes": "2026-12"}).json()

    # La semana del lunes 30 queda partida: en diciembre solo cuentan del 1 al 6
    assert (r["cupos"]["desde"], r["cupos"]["hasta"]) == ("2026-12-01", "2026-12-06")
    [cupo] = r["cupos"]["cupos"]
    assert (cupo["cupo"], cupo["arrastre"], cupo["restante"]) == (60_000, 0, 60_000)


def test_cupos_solo_en_el_mes_en_curso(api, con_fecha):
    con_fecha(date(2026, 11, 11))
    _cupo_super(api)

    pasado = api.get("/api/resumen", params={"mes": "2026-10"}).json()
    futuro = api.get("/api/resumen", params={"mes": "2026-12"}).json()

    assert (pasado["cupos"], pasado["reservado_cupos"]) == (None, 0)
    assert (futuro["cupos"], futuro["reservado_cupos"]) == (None, 310_000)


def test_la_torta_lleva_el_cupo_al_mes(api, con_fecha):
    con_fecha(date(2026, 11, 11))
    _cupo_super(api)

    r = api.get("/api/resumen", params={"mes": "2026-11"}).json()

    super_ = next(c for c in r["categorias"] if c["categoria"]["nombre"] == "Súper")
    assert (super_["presupuesto"], super_["cupo_semanal"]) == (300_000, CUPO)


def test_presupuesto_mensual_o_cupo_semanal(api):
    super_id = categoria_id(api, "Súper")
    assert _cupo_super(api)["cupo_semanal"] == CUPO

    assert api.patch(f"/api/categorias/{super_id}", json={"presupuesto": 100_000}).status_code == 422
    cambiada = api.patch(f"/api/categorias/{super_id}", json={"presupuesto": 100_000, "cupo_semanal": None}).json()
    assert (cambiada["presupuesto"], cambiada["cupo_semanal"]) == (100_000, None)

    sueldo = api.patch(f"/api/categorias/{categoria_id(api, 'Sueldo')}", json={"cupo_semanal": 1000})
    assert sueldo.status_code == 422


def test_crear_y_borrar_categoria_con_cupo(api, con_fecha):
    con_fecha(date(2026, 11, 11))
    nueva = api.post(
        "/api/categorias",
        json={"nombre": "Verdulería", "icono": "carrot", "color": "#1BAF7A", "tipo": "gasto", "cupo_semanal": 20_000},
    ).json()
    assert nueva["cupo_semanal"] == 20_000

    assert api.delete(f"/api/categorias/{nueva['id']}").status_code == 204
    assert api.get("/api/resumen", params={"mes": "2026-11"}).json()["cupos"] is None


def test_gasto_diario_separa_los_fijos(api):
    _gasto(api, "Súper", 8_000, "2026-11-02")
    _gasto(api, "Salidas", 12_000, "2026-11-02")
    programado = api.post(
        "/api/programados",
        json={"nombre": "Alquiler", "tipo": "gasto", "categoria_id": categoria_id(api, "Casa"),
              "monto": 500_000, "frecuencia": "mensual", "dia": 3, "desde": "2026-11"},
    ).json()
    pago = api.post(f"/api/programados/{programado['id']}/pagar", json={"mes": "2026-11", "fecha": "2026-11-03"})
    assert pago.status_code in (200, 201), pago.text

    dias = api.get("/api/diario", params={"desde": "2026-11-01", "hasta": "2026-11-04"}).json()["dias"]

    assert [d["fecha"] for d in dias] == ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]
    assert dias[1] == {"fecha": "2026-11-02", "gastos": 20_000, "fijos": 0}
    assert dias[2] == {"fecha": "2026-11-03", "gastos": 500_000, "fijos": 500_000}
    assert dias[0]["gastos"] == 0


def test_gasto_diario_limita_el_rango(api):
    assert api.get("/api/diario", params={"desde": "2026-11-01", "hasta": "2027-01-15"}).status_code == 422
    assert api.get("/api/diario", params={"desde": "2026-11-05", "hasta": "2026-11-01"}).status_code == 422


def test_cupos_semana_por_semana(api, con_fecha):
    con_fecha(date(2026, 11, 11))
    _cupo_super(api)
    api.put("/api/preferencias", json={"objetivo": 300_000})
    _gasto(api, "Súper", 10_000, "2026-11-01")
    _gasto(api, "Súper", 100_000, "2026-11-05")
    _gasto(api, "Súper", 25_000, "2026-11-10")

    r = api.get("/api/cupos", params={"mes": "2026-11"}).json()

    assert [(s["desde"], s["hasta"], s["estado"]) for s in r["semanas"]] == [
        ("2026-11-01", "2026-11-01", "pasada"),
        ("2026-11-02", "2026-11-08", "pasada"),
        ("2026-11-09", "2026-11-15", "actual"),
        ("2026-11-16", "2026-11-22", "futura"),
        ("2026-11-23", "2026-11-29", "futura"),
        ("2026-11-30", "2026-11-30", "futura"),
    ]
    [super_] = r["cupos"]
    semanas = super_["semanas"]
    assert semanas[0] == {"cupo": 10_000, "arrastre": 0, "disponible": 10_000, "gastado": 10_000, "restante": 0}
    assert semanas[1] == {"cupo": 70_000, "arrastre": 0, "disponible": 70_000, "gastado": 100_000, "restante": -30_000}
    assert semanas[2]["disponible"] == 40_000
    # Las semanas terminadas: 80.000 de cupo contra 110.000 gastados
    assert (r["aporte"], r["objetivo_ars"]) == (-30_000, 300_000)


def test_si_se_pasan_esta_semana_queda_menos_reservado(api, con_fecha):
    con_fecha(date(2026, 11, 11))
    _cupo_super(api)
    _gasto(api, "Súper", 110_000, "2026-11-10")

    r = api.get("/api/resumen", params={"mes": "2026-11"}).json()

    # Se pasaron 40.000 esta semana: del cupo del 16 al 30 (150.000) quedan 110.000
    assert r["reservado_cupos"] == 110_000


def test_lo_que_sobro_antes_no_tapa_lo_que_se_pasaron(api, con_fecha):
    # El domingo 1 sobró su séptimo de cupo, pero eso ya fue al ahorro: el exceso del 2 al 8 se descuenta entero
    con_fecha(date(2026, 11, 5))
    _cupo_super(api, 100_000)
    _gasto(api, "Súper", 100_000, "2026-11-02")
    _gasto(api, "Súper", 17_000, "2026-11-04")

    r = api.get("/api/cupos", params={"mes": "2026-11"}).json()

    primera, esta, siguiente = r["cupos"][0]["semanas"][:3]
    assert primera["restante"] == 14_286
    assert (esta["arrastre"], esta["disponible"], esta["restante"]) == (14_286, 100_000, -17_000)
    assert (siguiente["arrastre"], siguiente["disponible"]) == (-17_000, 83_000)
    assert r["aporte"] == 14_286


def test_si_se_pasan_por_mas_de_un_cupo_la_deuda_sigue(api, con_fecha):
    con_fecha(date(2026, 11, 20))
    _cupo_super(api)
    _gasto(api, "Súper", 10_000, "2026-11-01")
    _gasto(api, "Súper", 170_000, "2026-11-03")
    _gasto(api, "Súper", 5_000, "2026-11-10")

    semanas = api.get("/api/cupos", params={"mes": "2026-11"}).json()["cupos"][0]["semanas"]

    # Del 2 al 8 se pasaron 100.000: la semana del 9 no tiene nada y aún le faltan 30.000 (más los 5.000 que gastó)
    assert (semanas[2]["disponible"], semanas[2]["restante"]) == (0, -35_000)
    assert (semanas[3]["disponible"], semanas[3]["arrastre"]) == (35_000, -35_000)
