# -*- coding: utf-8 -*-
"""Criação do schema e carga inicial."""
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import Base, engine
from .crud import ensure_seed

def _ensure_note_column() -> None:
    """Adiciona coluna 'note' em items se ainda não existir (SQLite)."""
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE items ADD COLUMN note TEXT"))
        except Exception:
            # Já existe → ignora
            pass

def init_db(db: Session) -> None:
    """Cria tabelas, aplica colunas novas e realiza seed."""
    Base.metadata.create_all(engine)
    _ensure_note_column()  # ← garante a coluna
    ensure_seed(db)
