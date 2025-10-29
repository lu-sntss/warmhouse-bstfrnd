# -*- coding: utf-8 -*-
"""Conexão e sessão do banco de dados (Turso libSQL ou SQLite local)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from settings import TURSO_DATABASE_URL, TURSO_AUTH_TOKEN  # lê do .env

Base = declarative_base()

def _make_engine():
    # Se as variáveis do Turso estiverem presentes, usa o banco remoto
    if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
        return create_engine(
            f"sqlite+{TURSO_DATABASE_URL}?secure=true",
            connect_args={"auth_token": TURSO_AUTH_TOKEN},
            pool_pre_ping=True,
            future=True,
        )
    # Fallback para DEV local (arquivo .db)
    return create_engine(
        "sqlite:///./housewarming.db",
        connect_args={"check_same_thread": False},
        future=True,
    )

engine = _make_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
    future=True,
)

def get_db() -> Session:
    """Fornece uma sessão de banco para dependências do FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
