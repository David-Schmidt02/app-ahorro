"""Tipos compartidos entre esquemas."""
from decimal import Decimal
from typing import Annotated

from pydantic import Field

MontoPositivo = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]
MontoNoNegativo = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]
Mes = Annotated[str, Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2026-10"])]
