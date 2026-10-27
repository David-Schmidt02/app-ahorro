import sqlite3

from tests.conftest import categoria_id


def test_copia_de_la_base_es_un_sqlite_con_los_datos(api, tmp_path):
    api.post("/api/movimientos", json={"tipo": "gasto", "monto": 1500.5, "categoria_id": categoria_id(api, "Súper"),
                                       "fecha": "2026-10-05", "descripcion": "Verdulería"})
    respuesta = api.get("/api/respaldo/base")
    assert respuesta.status_code == 200
    assert "attachment" in respuesta.headers["content-disposition"]
    copia = tmp_path / "copia.db"
    copia.write_bytes(respuesta.content)
    with sqlite3.connect(copia) as conexion:
        assert conexion.execute("select descripcion from movimientos").fetchall() == [("Verdulería",)]


def test_movimientos_en_csv(api):
    api.post("/api/movimientos", json={"tipo": "gasto", "monto": 1500.5, "categoria_id": categoria_id(api, "Súper"),
                                       "fecha": "2026-10-05", "descripcion": "Verdulería"})
    texto = api.get("/api/respaldo/movimientos.csv").content.decode("utf-8-sig")
    encabezado, fila = texto.strip().splitlines()
    assert encabezado.startswith("fecha;tipo;categoria")
    assert fila.startswith("2026-10-05;gasto;Súper;Verdulería;1500,50;ARS;;1500,50;Ana;")


def test_respaldo_pide_sesion(cliente):
    assert cliente.get("/api/respaldo/base").status_code == 401
