from tests.conftest import registrar


def test_registro_abierto_hasta_dos_cuentas(cliente):
    assert cliente.get("/api/auth/estado").json() == {"registro_abierto": True}
    registrar(cliente, "ana@casa.com")
    registrar(cliente, "beto@casa.com", "Beto")

    assert cliente.get("/api/auth/estado").json() == {"registro_abierto": False}
    tercera = cliente.post(
        "/api/auth/registro", json={"nombre": "Caro", "email": "caro@casa.com", "password": "secreta1"}
    )
    assert tercera.status_code == 422


def test_email_repetido_da_conflicto(cliente):
    registrar(cliente, "ana@casa.com")
    repetido = cliente.post("/api/auth/registro", json={"nombre": "Ana", "email": "ANA@casa.com", "password": "otra123"})
    assert repetido.status_code == 409


def test_login_y_rutas_privadas(cliente):
    registrar(cliente)
    assert cliente.get("/api/categorias").status_code == 401

    mal = cliente.post("/api/auth/login", json={"email": "ana@casa.com", "password": "incorrecta"})
    assert mal.status_code == 401

    sesion = cliente.post("/api/auth/login", json={"email": "ana@casa.com", "password": "secreta1"}).json()
    headers = {"Authorization": f"Bearer {sesion['token']}"}
    assert cliente.get("/api/auth/yo", headers=headers).json()["nombre"] == "Ana"
    assert cliente.get("/api/categorias", headers=headers).status_code == 200
