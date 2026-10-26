from tests.conftest import COTIZACION_VENTA, categoria_id


def _alquiler(api, **extra) -> dict:
    datos = {
        "nombre": "Alquiler", "tipo": "gasto", "categoria_id": categoria_id(api, "Casa"),
        "monto": 450000, "frecuencia": "mensual", "dia": 31, "desde": "2026-01",
    } | extra
    respuesta = api.post("/api/programados", json=datos)
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


def _vencimientos(api, mes: str) -> list[dict]:
    return api.get("/api/programados/vencimientos", params={"mes": mes}).json()


def test_mensual_vence_el_ultimo_dia_si_el_mes_es_corto(api):
    _alquiler(api)
    assert _vencimientos(api, "2026-02")[0]["fecha"] == "2026-02-28"
    assert _vencimientos(api, "2026-10")[0]["fecha"] == "2026-10-31"
    assert _vencimientos(api, "2025-12") == []


def test_pagar_registra_el_movimiento_y_no_se_paga_dos_veces(api):
    alquiler = _alquiler(api)
    pago = api.post(f"/api/programados/{alquiler['id']}/pagar", json={"mes": "2026-10", "monto": 460000, "fecha": "2026-09-29"})
    assert pago.status_code == 201
    assert pago.json()["programado_id"] == alquiler["id"]

    octubre = _vencimientos(api, "2026-10")[0]
    assert octubre["pagado"] is True
    assert octubre["monto_ars"] == 460000
    # Pagado por adelantado en septiembre: septiembre sigue pendiente
    assert _vencimientos(api, "2026-09")[0]["pagado"] is False

    repetido = api.post(f"/api/programados/{alquiler['id']}/pagar", json={"mes": "2026-10"})
    assert repetido.status_code == 409

    api.delete(f"/api/movimientos/{pago.json()['id']}")
    assert _vencimientos(api, "2026-10")[0]["pagado"] is False


def test_unico_solo_aparece_en_su_mes(api):
    seguro = api.post(
        "/api/programados",
        json={"nombre": "Seguro del auto", "tipo": "gasto", "categoria_id": categoria_id(api, "Transporte"),
              "monto": 300, "moneda": "USD", "frecuencia": "unica", "fecha": "2026-12-15"},
    ).json()
    assert _vencimientos(api, "2026-11") == []
    diciembre = _vencimientos(api, "2026-12")[0]
    assert diciembre["monto_ars"] == 300 * COTIZACION_VENTA

    fuera_de_mes = api.post(f"/api/programados/{seguro['id']}/pagar", json={"mes": "2026-11"})
    assert fuera_de_mes.status_code == 422


def test_dar_de_baja_con_hasta(api):
    alquiler = _alquiler(api)
    api.patch(f"/api/programados/{alquiler['id']}", json={"hasta": "2026-10"})
    assert len(_vencimientos(api, "2026-10")) == 1
    assert _vencimientos(api, "2026-11") == []


def test_mensual_sin_dia_es_invalido(api):
    respuesta = api.post(
        "/api/programados",
        json={"nombre": "Luz", "tipo": "gasto", "categoria_id": categoria_id(api, "Servicios"), "monto": 1, "frecuencia": "mensual"},
    )
    assert respuesta.status_code == 422
    assert "día" in respuesta.json()["detail"]


def test_borrar_programado_conserva_los_pagos(api):
    alquiler = _alquiler(api)
    pago = api.post(f"/api/programados/{alquiler['id']}/pagar", json={"mes": "2026-10"}).json()
    assert api.delete(f"/api/programados/{alquiler['id']}").status_code == 204
    movimientos = api.get("/api/movimientos", params={"mes": "2026-10"}).json()
    assert [(m["id"], m["programado_id"]) for m in movimientos] == [(pago["id"], None)]


def test_compra_en_cuotas_termina_sola_y_numera_cada_cuota(api):
    heladera = _alquiler(api, nombre="Heladera", dia=10, desde="2026-11", cuotas=3, monto=150000)
    assert heladera["cuotas"] == 3
    assert heladera["hasta"] == "2027-01"

    diciembre = _vencimientos(api, "2026-12")[0]
    assert (diciembre["cuota"], diciembre["cuotas"]) == (2, 3)
    assert _vencimientos(api, "2027-01")[0]["cuota"] == 3
    assert _vencimientos(api, "2027-02") == []
    assert _vencimientos(api, "2026-10") == []


def test_solo_los_pagos_mensuales_van_en_cuotas(api):
    cobro = api.post(
        "/api/programados",
        json={"nombre": "Sueldo", "tipo": "ingreso", "categoria_id": categoria_id(api, "Sueldo"),
              "monto": 1000, "frecuencia": "mensual", "dia": 5, "cuotas": 3},
    )
    assert cobro.status_code == 422
