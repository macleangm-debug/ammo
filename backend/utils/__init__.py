"""
Backend utilities - export common functions
"""
from .database import db, client, serialize_doc
from .helpers import (
    create_audit_log, get_current_user, require_auth
)
