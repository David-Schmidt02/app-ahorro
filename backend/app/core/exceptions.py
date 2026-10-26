"""Excepciones de dominio: los servicios las lanzan sin saber nada de HTTP."""


class DomainError(Exception):
    def __init__(self, mensaje: str) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje


class NoEncontrado(DomainError):
    pass


class Conflicto(DomainError):
    pass


class NoAutorizado(DomainError):
    pass


class ReglaDeNegocio(DomainError):
    pass


class ServicioExternoNoDisponible(DomainError):
    pass
