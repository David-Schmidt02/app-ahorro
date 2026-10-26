from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegistroIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str


class SesionOut(BaseModel):
    token: str
    usuario: UsuarioOut


class EstadoRegistroOut(BaseModel):
    registro_abierto: bool
