# -*- coding: utf-8 -*-
"""Conexão e sessão do banco de dados (SQLite)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = "sqlite:///./housewarming.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

def get_db() -> Session:
    """Fornece uma sessão de banco para dependências do FastAPI.

    Returns:
        Session: Sessão ativa do SQLAlchemy.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
