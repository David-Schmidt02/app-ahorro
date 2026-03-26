"""Script de utilidad: elimina todos los usuarios y crea el usuario de test."""
import sys
sys.path.insert(0, '.')

from src.database import SessionLocal, UsuarioORM, ObjetivoORM, MovimientoORM, GastoORM, create_tables
import bcrypt
from datetime import datetime

create_tables()
db = SessionLocal()

db.query(GastoORM).delete()
db.query(MovimientoORM).delete()
db.query(ObjetivoORM).delete()
db.query(UsuarioORM).delete()
db.commit()
print("Todos los usuarios eliminados.")

pw = 'test1234'
pw_hash = bcrypt.hashpw(pw.encode('utf-8')[:72], bcrypt.gensalt()).decode('utf-8')
user = UsuarioORM(
    nombre='David',
    email='test@test.com',
    password_hash=pw_hash,
    fecha_creacion=datetime.now()
)
db.add(user)
db.commit()
db.refresh(user)
print(f"Usuario creado: id={user.id}, email=test@test.com, pass=test1234")
db.close()
