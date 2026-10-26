from tests.conftest import COTIZACION_VENTA, categoria_id


def _mov(api, tipo: str, categoria: str, monto: float, fecha: str = "2026-10-05") -> None:
    respuesta = api.post(
        "/api/movimientos", json={"tipo": tipo, "monto": monto, "categoria_id": categoria_id(api, categoria), "fecha": fecha}
    )
    assert respuesta.status_code == 201, respuesta.text


def test_resumen_del_mes(api):
    _mov(api, "ingreso", "Sueldo", 1_000_000)
    _mov(api, "gasto", "Súper", 200_000)
    _mov(api, "gasto", "Súper", 50_000)
    _mov(api, "gasto", "Salidas", 30_000, "2026-09-20")
    api.patch(f"/api/categorias/{categoria_id(api, 'Súper')}", json={"presupuesto": 300_000})
    api.post(
        "/api/programados",
        json={"nombre": "Expensas", "tipo": "gasto", "categoria_id": categoria_id(api, "Casa"),
              "monto": 120_000, "frecuencia": "mensual", "dia": 10, "desde": "2026-10"},
    )
    api.post(
        "/api/programados",
        json={"nombre": "Aguinaldo", "tipo": "ingreso", "categoria_id": categoria_id(api, "Extra"),
              "monto": 100, "moneda": "USD", "frecuencia": "unica", "fecha": "2026-10-30"},
    )
    api.put("/api/preferencias", json={"objetivo": 500, "objetivo_moneda": "USD"})

    r = api.get("/api/resumen", params={"mes": "2026-10"}).json()

    assert r["ingresos"] == 1_000_000
    assert r["gastos"] == 250_000
    assert r["ahorro"] == 750_000
    assert r["pendiente_gastos"] == 120_000
    assert r["pendiente_ingresos"] == 100 * COTIZACION_VENTA
    assert r["proyeccion"] == 750_000 + 100 * COTIZACION_VENTA - 120_000
    assert r["objetivo_ars"] == 500 * COTIZACION_VENTA
    assert r["gastos_mes_anterior"] == 30_000

    por_nombre = {c["categoria"]["nombre"]: c for c in r["categorias"]}
    assert por_nombre["Súper"] == {**por_nombre["Súper"], "gastado": 250_000, "presupuesto": 300_000}
    assert por_nombre["Casa"]["pendiente"] == 120_000
    assert "Salidas" not in por_nombre
    assert [v["nombre"] for v in r["vencimientos"]] == ["Expensas", "Aguinaldo"]


def test_resumen_vacio(api):
    r = api.get("/api/resumen", params={"mes": "2026-10"}).json()
    assert (r["ingresos"], r["gastos"], r["objetivo"], r["categorias"]) == (0, 0, None, [])


def test_mes_invalido(api):
    assert api.get("/api/resumen", params={"mes": "2026-13"}).status_code == 422


def test_evolucion_rellena_los_meses_sin_movimientos(api):
    _mov(api, "ingreso", "Sueldo", 1_000_000, "2026-08-01")
    _mov(api, "gasto", "Súper", 400_000, "2026-08-10")
    _mov(api, "gasto", "Súper", 100_000, "2026-10-10")
    _mov(api, "gasto", "Súper", 999, "2026-11-01")
    api.put("/api/preferencias", json={"objetivo": 300_000})

    r = api.get("/api/evolucion", params={"hasta": "2026-10", "meses": 4}).json()

    assert [m["mes"] for m in r["meses"]] == ["2026-07", "2026-08", "2026-09", "2026-10"]
    assert r["meses"][1] == {"mes": "2026-08", "ingresos": 1_000_000, "gastos": 400_000, "ahorro": 600_000}
    assert r["meses"][2]["gastos"] == 0
    assert r["meses"][3]["ahorro"] == -100_000
    assert r["objetivo_ars"] == 300_000


def test_evolucion_cruza_el_anio(api):
    r = api.get("/api/evolucion", params={"hasta": "2027-01", "meses": 3}).json()
    assert [m["mes"] for m in r["meses"]] == ["2026-11", "2026-12", "2027-01"]
