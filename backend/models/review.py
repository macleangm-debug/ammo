"""
Review and application system models
"""
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
import uuid


class ReviewItemType:
    LICENSE_APPLICATION = "license_application"
    LICENSE_RENEWAL = "license_renewal"
    DEALER_CERTIFICATION = "dealer_certification"
    FLAGGED_TRANSACTION = "flagged_transaction"
    COMPLIANCE_VIOLATION = "compliance_violation"
    APPEAL = "appeal"


class ReviewItem(BaseModel):
    """Generic review item that can track any type of review"""
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    item_type: str
    status: str = "pending"
    priority: str = "normal"
    submitted_by: Optional[str] = None
    submitter_name: Optional[str] = None
    submitter_email: Optional[str] = None
    assigned_to: Optional[str] = None
    data: dict = {}
    notes: list = []
    decision_reason: Optional[str] = None
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    region: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LicenseApplication(BaseModel):
    """Application for a new firearm/ammunition license"""
    model_config = ConfigDict(extra="ignore")
    application_id: str = Field(default_factory=lambda: f"app_{uuid.uuid4().hex[:12]}")
    applicant_name: str
    applicant_email: str
    applicant_phone: Optional[str] = None
    applicant_address: str
    license_type: str
    purpose: str
    date_of_birth: str
    id_type: str
    id_number: str
    has_previous_license: bool = False
    previous_license_number: Optional[str] = None
    has_criminal_record: bool = False
    criminal_record_details: Optional[str] = None
    training_completed: bool = False
    training_certificate_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    additional_notes: Optional[str] = None
    region: str
    status: str = "pending"
    review_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DealerCertification(BaseModel):
    """Application for dealer certification"""
    model_config = ConfigDict(extra="ignore")
    certification_id: str = Field(default_factory=lambda: f"cert_{uuid.uuid4().hex[:12]}")
    business_name: str
    owner_name: str
    owner_email: str
    owner_phone: str
    business_address: str
    business_type: str
    tax_id: str
    business_license_number: str
    years_in_business: int = 0
    has_physical_location: bool = True
    security_measures: list = []
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    background_check_consent: bool = False
    compliance_agreement: bool = False
    region: str
    status: str = "pending"
    review_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReportedViolation(BaseModel):
    """Report of a compliance violation"""
    model_config = ConfigDict(extra="ignore")
    violation_id: str = Field(default_factory=lambda: f"viol_{uuid.uuid4().hex[:12]}")
    violation_type: str
    description: str
    location: Optional[str] = None
    date_observed: Optional[str] = None
    reported_by_id: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    reporter_phone: Optional[str] = None
    subject_type: str = "unknown"
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    evidence_links: list = []
    evidence_description: Optional[str] = None
    severity: str = "medium"
    region: Optional[str] = None
    status: str = "pending"
    review_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LicenseRenewal(BaseModel):
    """License renewal request"""
    model_config = ConfigDict(extra="ignore")
    renewal_id: str = Field(default_factory=lambda: f"renew_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_name: str
    user_email: str
    current_license_number: str
    license_type: str
    expiry_date: str
    reason_for_renewal: str = "standard"
    address_changed: bool = False
    new_address: Optional[str] = None
    training_current: bool = True
    recent_training_certificate: Optional[str] = None
    any_incidents: bool = False
    incident_details: Optional[str] = None
    region: str
    status: str = "pending"
    review_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Appeal(BaseModel):
    """Appeal of a previous decision"""
    model_config = ConfigDict(extra="ignore")
    appeal_id: str = Field(default_factory=lambda: f"appeal_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_name: str
    user_email: str
    original_decision_type: str
    original_decision_id: str
    original_decision_date: str
    grounds_for_appeal: str
    supporting_evidence: Optional[str] = None
    evidence_links: list = []
    requested_outcome: str
    region: Optional[str] = None
    status: str = "pending"
    review_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
