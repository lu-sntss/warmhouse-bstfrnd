# -*- coding: utf-8 -*-
"""Rotas de RSVP/Convidados."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import RSVPIn, RSVPOut
from ..crud import upsert_rsvp, list_guests, delete_rsvp

router = APIRouter(tags=["guests"])

@router.get("/guests", response_model=list[RSVPOut])
def get_guests(db: Session = Depends(get_db)):
    """Lista confirmações (nome + item)."""
    return list_guests(db)

@router.post("/rsvp", response_model=RSVPOut)
def rsvp(payload: RSVPIn, db: Session = Depends(get_db)):
    """Cria/atualiza a escolha do convidado."""
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Nome não pode ser vazio.")
    try:
        return upsert_rsvp(db, payload.name, payload.item_id)
    except ValueError as e:
        msg = str(e)
        code = 404 if "não encontrado" in msg else 409 if "esgotado" in msg else 400
        raise HTTPException(status_code=code, detail=msg)

@router.delete("/rsvp/{guest_id}", status_code=204)
def remove_rsvp(guest_id: int, db: Session = Depends(get_db)):
    """Remove uma confirmação."""
    try:
        delete_rsvp(db, guest_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
