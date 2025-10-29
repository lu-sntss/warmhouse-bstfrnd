# -*- coding: utf-8 -*-
"""Funções CRUD isoladas da camada HTTP."""

from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from .models import Item, Guest
from .schemas import ItemCreate, ItemOut, RSVPOut

def ensure_seed(db: Session) -> None:
    if db.query(Item).count() > 0:
        return
    seed = [
        ("Pratos descartáveis", 5, None),
        ("Copos descartáveis", 5, None),
        ("Guardanapos", 5, None),
        ("Refri 2L", 6, "Coca/Guaraná"),
        ("Suco 1L", 6, None),
        ("Carvão (5kg)", 3, None),
        ("Carne/Churrasco (kg)", None, "Qualquer corte 😉"),
        ("Cerveja lata", 48, None),
        ("Gelo (saco)", 6, None),
        ("Sobremesa", None, "Bolo, pudim, brigadeiro…"),
    ]
    for name, max_qty, note in seed:
        db.add(Item(name=name, max_qty=max_qty, note=note))
    db.commit()

def list_items_with_counts(db: Session) -> List[ItemOut]:
    G = aliased(Guest)
    rows = (
        db.query(
            Item.id, Item.name, Item.max_qty, Item.note,
            func.count(G.id).label("reserved_count"),
        )
        .outerjoin(G, G.item_id == Item.id)
        .group_by(Item.id)
        .order_by(Item.name.asc())
        .all()
    )
    result: List[ItemOut] = []
    for r in rows:
        reserved = int(r.reserved_count or 0)
        available = None if r.max_qty is None else max(0, r.max_qty - reserved)
        result.append(ItemOut(
            id=r.id, name=r.name, max_qty=r.max_qty, note=r.note,
            reserved_count=reserved, available=available
        ))
    return result

def create_item(db: Session, payload: ItemCreate) -> Item:
    item = Item(name=payload.name.strip(), max_qty=payload.max_qty, note=payload.note)
    db.add(item); db.commit(); db.refresh(item)
    return item

def update_item(db: Session, item_id: int, payload: ItemCreate) -> Item:
    item = db.get(Item, item_id)
    if not item:
        raise ValueError("Item não encontrado.")
    item.name = payload.name.strip()
    item.max_qty = payload.max_qty
    item.note = payload.note
    db.commit(); db.refresh(item)
    return item

def delete_item(db: Session, item_id: int) -> None:
    item = db.get(Item, item_id)
    if not item:
        raise ValueError("Item não encontrado.")
    db.delete(item); db.commit()

def upsert_rsvp(db: Session, name: str, item_id: int) -> RSVPOut:
    """Cria/atualiza RSVP respeitando limite do item.

    Args:
        name: Nome do convidado.
        item_id: Identificador do item escolhido.

    Returns:
        RSVPOut com dados consolidados.

    Raises:
        ValueError: em casos de item inexistente ou esgotado.
    """
    name = name.strip()
    item = db.get(Item, item_id)
    if not item:
        raise ValueError("Item não encontrado.")

    # Disponibilidade (considera troca de item)
    reserved = db.query(func.count(Guest.id)).filter(Guest.item_id == item.id).scalar() or 0
    existing = db.query(Guest).filter(Guest.name == name).one_or_none()
    if item.max_qty is not None:
        if not existing or (existing and existing.item_id != item.id):
            if reserved >= item.max_qty:
                raise ValueError("Item esgotado.")

    if existing:
        existing.item_id = item.id
        db.commit()
        db.refresh(existing)
        g = existing
    else:
        g = Guest(name=name, item_id=item.id)
        db.add(g)
        db.commit()
        db.refresh(g)

    return RSVPOut(
        id=g.id, name=g.name, item_id=g.item_id,
        item_name=item.name, created_at=g.created_at
    )

def list_guests(db: Session) -> List[RSVPOut]:
    """Lista confirmações."""
    rows = (
        db.query(Guest.id, Guest.name, Guest.item_id, Guest.created_at, Item.name.label("item_name"))
        .join(Item, Item.id == Guest.item_id)
        .order_by(Guest.created_at.desc())
        .all()
    )
    return [
        RSVPOut(
            id=r.id, name=r.name, item_id=r.item_id,
            item_name=r.item_name, created_at=r.created_at
        )
        for r in rows
    ]

def delete_rsvp(db: Session, guest_id: int) -> None:
    """Remove uma confirmação."""
    g = db.get(Guest, guest_id)
    if not g:
        raise ValueError("Confirmação não encontrada.")
    db.delete(g)
    db.commit()
