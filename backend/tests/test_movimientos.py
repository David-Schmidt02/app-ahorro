from tests.conftest import COTIZACION_VENTA, categoria_id


def test_gasto_en_pesos(api):
    super_id = categoria_id(api, "Súper")
    creado = api.post(
        "/api/movimientos",
        json={"tipo": "gasto", "monto": 15300.5, "categoria_id": super_id, "fecha": "2026-10-03", "descripcion": " Coto "},
    )
    assert creado.status_code == 201
    cuerpo = creado.json()
    assert cuerpo["monto_ars"] == 15300.5
    assert cuerpo["descripcion"] == "Coto"
    assert cuerpo["creado_por"] == "Ana"
    assert cuerpo["categoria"]["nombre"] == "Súper"


def test_gasto_en_dolares_usa_blue_o_la_cotizacion_dada(api):
    otros = categoria_id(api, "Otros")
    auto = api.post(
        "/api/movimientos", json={"tipo": "gasto", "monto": 10, "moneda": "USD", "categoria_id": otros, "fecha": "2026-10-03"}
    ).json()
    assert auto["cotizacion"] == COTIZACION_VENTA
    assert auto["monto_ars"] == 10 * COTIZACION_VENTA

    manual = api.post(
        "/api/movimientos",
        json={"tipo": "gasto", "monto": 10, "moneda": "USD", "cotizacion": 1000, "categoria_id": otros, "fecha": "2026-10-03"},
    ).json()
    assert manual["monto_ars"] == 10000


def test_categoria_debe_coincidir_con_el_tipo(api):
    sueldo = categoria_id(api, "Sueldo")
    respuesta = api.post("/api/movimientos", json={"tipo": "gasto", "monto": 1, "categoria_id": sueldo, "fecha": "2026-10-03"})
    assert respuesta.status_code == 422
    assert "ingresos" in respuesta.json()["detail"]


def test_editar_recalcula_y_listar_filtra_por_mes(api):
    salidas = categoria_id(api, "Salidas")
    m = api.post("/api/movimientos", json={"tipo": "gasto", "monto": 100, "categoria_id": salidas, "fecha": "2026-10-31"}).json()
    api.post("/api/movimientos", json={"tipo": "gasto", "monto": 50, "categoria_id": salidas, "fecha": "2026-11-01"})

    editado = api.patch(f"/api/movimientos/{m['id']}", json={"monto": 20, "moneda": "USD"}).json()
    assert editado["monto_ars"] == 20 * COTIZACION_VENTA

    octubre = api.get("/api/movimientos", params={"mes": "2026-10"}).json()
    assert [x["id"] for x in octubre] == [m["id"]]

    assert api.delete(f"/api/movimientos/{m['id']}").status_code == 204
    assert api.get("/api/movimientos", params={"mes": "2026-10"}).json() == []


def test_monto_invalido(api):
    respuesta = api.post("/api/movimientos", json={"tipo": "gasto", "monto": 0, "categoria_id": 1, "fecha": "2026-10-03"})
    assert respuesta.status_code == 422
    assert respuesta.json()["detail"].startswith("monto:")
