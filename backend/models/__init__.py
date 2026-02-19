"""
Backend models - export all models for easy importing
"""
from .user import (
    UserBase, UserResponse, CitizenProfile, DealerProfile, LoginRequest
)
from .audit import AuditLog
from .transaction import (
    Transaction, TransactionCreate, TransactionApproval, Challenge
)
from .notification import (
    Notification, NotificationTrigger, TriggerExecution, NotificationTemplate
)
from .document import (
    DocumentTemplateType, DocumentTemplate, FormalDocument
)
from .review import (
    ReviewItemType, ReviewItem, LicenseApplication, DealerCertification,
    ReportedViolation, LicenseRenewal, Appeal
)
from .government import (
    TrainingCourse, CourseEnrollment, CourseEnrollmentExtended, RevenueRecord,
    MemberAlert, AlertThreshold, RiskPrediction, PreventiveWarning
)
from .marketplace import (
    MarketplaceProduct, MarketplaceOrder, MarketplaceReview,
    InventoryItem, InventoryMovement, InventorySupplier, ReorderAlert
)

# Region definitions
REGIONS = ["northeast", "southeast", "midwest", "southwest", "west"]
