"""
Government oversight models - training, alerts, thresholds
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
import uuid


class TrainingCourse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    course_id: str = Field(default_factory=lambda: f"course_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    region: str
    cost: float
    duration_hours: int
    is_compulsory: bool = False
    category: str
    status: str = "active"
    ari_boost: int = 5
    ari_penalty_for_skip: int = 0
    deadline_days: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CourseEnrollment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    enrollment_id: str = Field(default_factory=lambda: f"enroll_{uuid.uuid4().hex[:12]}")
    course_id: str
    user_id: str
    status: str = "enrolled"
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    progress_percent: int = 0
    payment_status: str = "pending"
    amount_paid: float = 0


class CourseEnrollmentExtended(BaseModel):
    model_config = ConfigDict(extra="ignore")
    enrollment_id: str = Field(default_factory=lambda: f"enroll_{uuid.uuid4().hex[:12]}")
    course_id: str
    user_id: str
    status: str = "enrolled"
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    progress_percent: int = 0
    quiz_scores: list = []
    certificate_id: Optional[str] = None
    payment_status: str = "pending"
    amount_paid: float = 0


class RevenueRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    revenue_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    type: str
    amount: float
    user_id: Optional[str] = None
    dealer_id: Optional[str] = None
    region: str
    reference_id: Optional[str] = None
    description: str
    status: str = "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemberAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    alert_id: str = Field(default_factory=lambda: f"alert_{uuid.uuid4().hex[:12]}")
    user_id: str
    alert_type: str
    severity: str
    title: str
    description: str
    trigger_reason: str
    threshold_type: Optional[str] = None
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    status: str = "active"
    auto_action_taken: Optional[str] = None
    intervention_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None


class AlertThreshold(BaseModel):
    model_config = ConfigDict(extra="ignore")
    threshold_id: str = Field(default_factory=lambda: f"thresh_{uuid.uuid4().hex[:12]}")
    name: str
    metric: str
    operator: str
    value: float
    warning_value: Optional[float] = None
    severity: str
    auto_action: Optional[str] = None
    notification_message: Optional[str] = None
    is_active: bool = True
    region: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RiskPrediction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    prediction_id: str = Field(default_factory=lambda: f"pred_{uuid.uuid4().hex[:12]}")
    user_id: str
    current_risk_score: float
    predicted_risk_score: float
    risk_trajectory: str
    confidence: float
    risk_factors: list = []
    recommendations: list = []
    predicted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))


class PreventiveWarning(BaseModel):
    model_config = ConfigDict(extra="ignore")
    warning_id: str = Field(default_factory=lambda: f"pwarn_{uuid.uuid4().hex[:12]}")
    user_id: str
    warning_type: str
    current_value: float
    threshold_value: float
    days_to_threshold: Optional[int] = None
    message: str
    action_required: str
    status: str = "pending"
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged_at: Optional[datetime] = None
