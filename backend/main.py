# -*- coding: utf-8 -*-
"""Main controller: monta a aplicação, middlewares e rotas."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import get_db
from app.seeds import init_db

from app.routers import health, items, guests

app = FastAPI(title="Housewarming API", version="1.0.0")

# CORS (Vite em localhost:5173)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

from settings import ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # em prod vamos pôr a URL do front
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Cria o banco e executa seed inicial."""
    for db in get_db():  # usa o generator pra abrir/fechar
        init_db(db)

# Rotas
app.include_router(health.router)
app.include_router(items.router)
app.include_router(guests.router)
