"""
Document and certificate related models
"""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid


class DocumentTemplateType:
    WARNING_LETTER = "warning_letter"
    FORMAL_NOTICE = "formal_notice"
    ACHIEVEMENT_CERTIFICATE = "achievement_certificate"
    LICENSE_CERTIFICATE = "license_certificate"
    COMPLIANCE_CERTIFICATE = "compliance_certificate"
    TRAINING_CERTIFICATE = "training_certificate"


class DocumentTemplate(BaseModel):
    """Template for formal letters and certificates"""
    model_config = ConfigDict(extra="ignore")
    template_id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    template_type: str
    category: str = "general"
    is_standard: bool = False
    
    # Visual customization
    primary_color: str = "#3b5bdb"
    secondary_color: str = "#8b5cf6"
    logo_url: Optional[str] = None
    seal_enabled: bool = True
    watermark_enabled: bool = True
    
    # Content
    header_text: str = "AMMO - Government Portal"
    title: str
    body_template: str
    footer_text: str = "This is an official document from the AMMO Government Portal."
    signature_title: str = "Government Administrator"
    
    # Automation settings
    auto_send_on_event: Optional[str] = None
    auto_send_enabled: bool = False
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


class FormalDocument(BaseModel):
    """Issued formal letter or certificate"""
    model_config = ConfigDict(extra="ignore")
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    template_id: str
    template_name: str
    document_type: str
    category: str = "general"
    
    # Recipient
    recipient_id: str
    recipient_name: str
    recipient_email: Optional[str] = None
    recipient_role: str = "citizen"
    
    # Document content
    title: str
    body_content: str
    
    # Visual settings
    primary_color: str = "#3b5bdb"
    secondary_color: str = "#8b5cf6"
    logo_url: Optional[str] = None
    seal_enabled: bool = True
    watermark_enabled: bool = True
    header_text: str = "AMMO - Government Portal"
    footer_text: str = ""
    signature_title: str = "Government Administrator"
    
    # Status
    status: str = "sent"
    read_at: Optional[datetime] = None
    
    # Metadata
    issued_by: str
    issued_by_name: str
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Related data
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    
    # Priority
    priority: str = "normal"
