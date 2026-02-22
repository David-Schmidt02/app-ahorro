"""Schemas de Pydantic para Usuario."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UsuarioBase(BaseModel):
    """Schema base para Usuario."""
    nombre: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class UsuarioCreate(UsuarioBase):
    """Schema para crear un Usuario."""
    password: str = Field(..., min_length=6, max_length=100)


class UsuarioUpdate(BaseModel):
    """Schema para actualizar un Usuario."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)


class UsuarioResponse(UsuarioBase):
    """Schema para respuesta de Usuario."""
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    """Schema para login de usuario."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema para respuesta de token JWT."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema para datos dentro del token."""
    email: Optional[str] = None
