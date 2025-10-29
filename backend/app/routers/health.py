# -*- coding: utf-8 -*-
from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
def health() -> dict:
    """Retorna status simples da API.

    Returns:
        Dict com 'status': 'ok'.
    """
    return {"status": "ok"}
