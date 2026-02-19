"""
Backend utilities - export common functions
"""
from .database import db, client, mongo_url
from .helpers import (
    serialize_doc, create_audit_log, get_current_user, require_auth
)
