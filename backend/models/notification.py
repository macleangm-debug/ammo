"""
Notification related models
"""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid


class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    message: str
    type: str
    category: str = "general"
    priority: str = "normal"
    transaction_id: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    expires_at: Optional[datetime] = None
    sent_by: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationTrigger(BaseModel):
    """Automated notification trigger configuration"""
    model_config = ConfigDict(extra="ignore")
    trigger_id: str = Field(default_factory=lambda: f"trig_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    event_type: str
    conditions: dict = {}
    template_title: str
    template_message: str
    notification_type: str = "reminder"
    notification_category: str = "system"
    priority: str = "normal"
    target_roles: list = ["citizen"]
    enabled: bool = True
    created_by: Optional[str] = None
    last_executed_at: Optional[datetime] = None
    next_execution_at: Optional[datetime] = None
    execution_count: int = 0
    last_execution_result: Optional[dict] = None
    schedule_interval: str = "daily"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TriggerExecution(BaseModel):
    """Log of trigger executions"""
    model_config = ConfigDict(extra="ignore")
    execution_id: str = Field(default_factory=lambda: f"exec_{uuid.uuid4().hex[:12]}")
    trigger_id: str
    trigger_name: str
    event_type: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    status: str = "running"
    users_evaluated: int = 0
    users_matched: int = 0
    notifications_sent: int = 0
    error_message: Optional[str] = None
    details: dict = {}


class NotificationTemplate(BaseModel):
    """Reusable notification templates for manual sending"""
    model_config = ConfigDict(extra="ignore")
    template_id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    name: str
    title: str
    message: str
    type: str = "announcement"
    category: str = "general"
    priority: str = "normal"
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
