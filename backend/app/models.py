# -*- coding: utf-8 -*-
"""Modelos SQLAlchemy."""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship

from .db import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    max_qty = Column(Integer, nullable=True)  # None = ilimitado
    note = Column(Text, nullable=True)        # ← observação opcional

    guests = relationship("Guest", back_populates="item", cascade="all,delete")

class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    item = relationship("Item", back_populates="guests")
