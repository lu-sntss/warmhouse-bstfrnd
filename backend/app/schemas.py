# -*- coding: utf-8 -*-
"""Esquemas Pydantic (I/O)."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ItemCreate(BaseModel):
    """Criação/edição de item.

    Args:
        name: Nome do item.
        max_qty: Quantidade máxima (None para ilimitado).
    """
    name: str = Field(min_length=1, max_length=120)
    max_qty: Optional[int] = None
    note: Optional[str] = None

class ItemOut(BaseModel):
    """Saída de item com contagem e disponibilidade."""
    id: int
    name: str
    max_qty: Optional[int] = None
    note: Optional[str] = None
    reserved_count: int
    available: Optional[int] = None

class RSVPIn(BaseModel):
    """Entrada para confirmação."""
    name: str = Field(min_length=1, max_length=120)
    item_id: int

class RSVPOut(BaseModel):
    """Saída da confirmação."""
    id: int
    name: str
    item_id: int
    item_name: str
    created_at: datetime

class GuestOut(BaseModel):
    """Listagem simples de convidados."""
    id: int
    name: str
    item_name: str
    created_at: datetime
