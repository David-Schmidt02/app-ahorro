from datetime import date

import pytest

from app.dependencies import hoy
from app.main import app
from tests.conftest import categoria_id


@pytest.fixture
def mes_armado(api):
    """Noviembre de 2026: sueldo, alquiler pagado el 2, luz pendiente el 20, cupo del súper y presupuesto de salidas."""
    def mov(tipo, categoria, monto, fecha):
        cuerpo = {"tipo": tipo, "monto": monto, "categoria_id": categoria_id(api, categoria), "fecha": fecha}
        assert api.post("/api/movimientos", json=cuerpo).status_code == 201

    def programado(nombre, categoria, monto, dia):
        return api.post(
            "/api/programados",
            json={"nombre": nombre, "tipo": "gasto", "categoria_id": categoria_id(api, categoria),
                  "monto": monto, "frecuencia": "mensual", "dia": dia, "desde": "2026-10"},
        ).json()

    mov("ingreso", "Sueldo", 1_000_000, "2026-11-01")
    alquiler = programado("Alquiler", "Casa", 300_000, 3)
    programado("Luz", "Servicios", 30_000, 20)
    api.post(f"/api/programados/{alquiler['id']}/pagar", json={"mes": "2026-11", "fecha": "2026-11-02"})
    api.patch(f"/api/categorias/{categoria_id(api, 'Súper')}", json={"cupo_semanal": 70_000})
    api.patch(f"/api/categorias/{categoria_id(api, 'Salidas')}", json={"presupuesto": 60_000})
    mov("gasto", "Súper", 50_000, "2026-11-05")
    mov("gasto", "Salidas", 20_000, "2026-11-06")
    mov("gasto", "Ropa", 30_000, "2026-11-08")
    return api


def _plan(api, dia: date, mes: str = "2026-11") -> dict:
    app.dependency_overrides[hoy] = lambda: dia
    return api.get("/api/plan", params={"mes": mes}).json()


def test_plan_contra_lo_gastado_y_proyectado(mes_armado):
    r = _plan(mes_armado, date(2026, 11, 11))
    dias = {d["fecha"]: d for d in r["dias"]}

    # Plan: alquiler el día que se pagó, luz el 20, súper 10.000 por día, salidas 2.000 por día
    assert dias["2026-11-01"]["plan"] == 12_000
    assert dias["2026-11-02"]["plan"] == 24_000 + 300_000
    assert (r["gasto_plan"], r["ahorro_plan"]) == (690_000, 310_000)

    assert dias["2026-11-11"] == {"fecha": "2026-11-11", "plan": 11 * 12_000 + 300_000, "gastado": 400_000, "estimado": False}
    # Desde mañana: el ritmo del día a día (100.000 en 11 días, en pesos enteros) y la luz pendiente
    ritmo = 9_091
    assert dias["2026-11-12"]["estimado"] is True
    assert dias["2026-11-12"]["gastado"] == pytest.approx(400_000 + ritmo)
    assert dias["2026-11-20"]["gastado"] == pytest.approx(400_000 + 9 * ritmo + 30_000)
    assert r["gasto_proyectado"] == 400_000 + 19 * ritmo + 30_000
    assert r["ahorro_proyectado"] == pytest.approx(1_000_000 - r["gasto_proyectado"])


def test_los_primeros_dias_se_proyecta_con_el_plan(mes_armado):
    r = _plan(mes_armado, date(2026, 11, 3))
    dias = {d["fecha"]: d for d in r["dias"]}

    # Sin ritmo todavía: lo planeado sin los fijos repartido por día ((690.000 − 330.000) / 30)
    assert dias["2026-11-04"]["gastado"] - dias["2026-11-03"]["gastado"] == pytest.approx(12_000)


def test_plan_de_un_mes_pasado_y_uno_futuro(mes_armado):
    pasado = _plan(mes_armado, date(2026, 12, 15))
    assert not any(d["estimado"] for d in pasado["dias"])
    assert pasado["gasto_proyectado"] == 400_000

    futuro = _plan(mes_armado, date(2026, 10, 15))
    assert {d["gastado"] for d in futuro["dias"]} == {None}
    assert (futuro["gasto_proyectado"], futuro["ahorro_proyectado"]) == (None, None)
    assert futuro["gasto_plan"] == 690_000
