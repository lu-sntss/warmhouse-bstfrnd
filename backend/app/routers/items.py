# -*- coding: utf-8 -*-
"""Rotas de itens (cadastro)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import ItemCreate, ItemOut
from ..crud import list_items_with_counts, create_item, update_item, delete_item

router = APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model=list[ItemOut])
def list_items(db: Session = Depends(get_db)):
    """Lista itens com contagem/disponibilidade."""
    return list_items_with_counts(db)

@router.post("", status_code=201)
def add_item(payload: ItemCreate, db: Session = Depends(get_db)):
    """Cria novo item (uso admin simples)."""
    try:
        return create_item(db, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{item_id}")
def edit_item(item_id: int, payload: ItemCreate, db: Session = Depends(get_db)):
    """Atualiza um item existente."""
    try:
        return update_item(db, item_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{item_id}", status_code=204)
def remove_item(item_id: int, db: Session = Depends(get_db)):
    """Exclui um item e confirmações relacionadas."""
    try:
        delete_item(db, item_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
