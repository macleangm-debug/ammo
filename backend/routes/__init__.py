"""
Backend Routes - Modular API endpoints
"""
from .auth import router as auth_router
from .partners import router as partners_router
from .flagging import router as flagging_router

__all__ = [
    'auth_router',
    'partners_router', 
    'flagging_router'
]
