from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import random
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM Key for risk analysis
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI(title="AMMO - Accountable Munitions & Mobility Oversight")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== PYDANTIC MODELS ==============

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "citizen"  # citizen, dealer, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str

class CitizenProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str = Field(default_factory=lambda: f"profile_{uuid.uuid4().hex[:12]}")
    user_id: str
    license_number: str
    license_type: str  # firearm, ammunition, both
    license_status: str = "active"  # active, expired, suspended, revoked
    license_expiry: datetime
    compliance_score: int = 100
    total_purchases: int = 0
    address: Optional[str] = None
    phone: Optional[str] = None
    biometric_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DealerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    dealer_id: str = Field(default_factory=lambda: f"dealer_{uuid.uuid4().hex[:12]}")
    user_id: str
    business_name: str
    license_number: str
    license_status: str = "active"
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    compliance_score: int = 100
    total_transactions: int = 0
    hardware_cert_valid: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    citizen_id: str
    dealer_id: str
    item_type: str  # firearm, ammunition
    item_category: str
    quantity: int
    status: str = "pending"  # pending, approved, rejected, review_required
    risk_score: int = 0
    risk_level: str = "green"  # green, amber, red
    risk_factors: List[str] = []
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    ai_analysis: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class TransactionCreate(BaseModel):
    citizen_license: str
    item_type: str
    item_category: str
    quantity: int
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None

class TransactionApproval(BaseModel):
    approved: bool
    distress_trigger: bool = False

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:12]}")
    action: str
    actor_id: str
    actor_role: str
    target_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    message: str
    type: str  # verification_request, approved, rejected, alert, system
    transaction_id: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Challenge(BaseModel):
    question: str
    expected_answer: str

# ============== GOVERNMENT OVERSIGHT MODELS ==============

class TrainingCourse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    course_id: str = Field(default_factory=lambda: f"course_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    region: str  # northeast, southeast, midwest, southwest, west, national
    cost: float
    duration_hours: int
    is_compulsory: bool = False
    category: str  # safety, legal, tactical, refresher, specialized
    status: str = "active"  # active, archived, draft
    ari_boost: int = 5  # ARI points for completion
    ari_penalty_for_skip: int = 0  # Penalty if compulsory and not completed
    deadline_days: Optional[int] = None  # Days to complete if compulsory
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CourseEnrollment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    enrollment_id: str = Field(default_factory=lambda: f"enroll_{uuid.uuid4().hex[:12]}")
    course_id: str
    user_id: str
    status: str = "enrolled"  # enrolled, in_progress, completed, expired, failed
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    progress_percent: int = 0
    payment_status: str = "pending"  # pending, paid, waived
    amount_paid: float = 0

class RevenueRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    revenue_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    type: str  # course_fee, membership_fee, license_fee, certification_fee, renewal_fee, penalty_fee
    amount: float
    user_id: Optional[str] = None
    dealer_id: Optional[str] = None
    region: str
    reference_id: Optional[str] = None  # course_id, license_id, etc.
    description: str
    status: str = "completed"  # pending, completed, refunded
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemberAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    alert_id: str = Field(default_factory=lambda: f"alert_{uuid.uuid4().hex[:12]}")
    user_id: str
    alert_type: str  # red_flag, warning, intervention, license_blocked
    severity: str  # low, medium, high, critical
    title: str
    description: str
    trigger_reason: str  # threshold_breach, compulsory_training_missed, compliance_drop, suspicious_activity
    threshold_type: Optional[str] = None  # purchase_frequency, risk_score, compliance_score
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    status: str = "active"  # active, acknowledged, resolved, escalated
    auto_action_taken: Optional[str] = None  # license_suspended, transaction_blocked, warning_sent
    intervention_notes: Optional[str] = None
    assigned_to: Optional[str] = None  # admin user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

class AlertThreshold(BaseModel):
    model_config = ConfigDict(extra="ignore")
    threshold_id: str = Field(default_factory=lambda: f"thresh_{uuid.uuid4().hex[:12]}")
    name: str
    metric: str  # purchase_count_30d, risk_score_avg, compliance_score, training_overdue_days
    operator: str  # gt, lt, gte, lte, eq
    value: float
    warning_value: Optional[float] = None  # Pre-warning threshold (e.g., warn at 60 before critical at 50)
    severity: str  # low, medium, high, critical
    auto_action: Optional[str] = None  # warn, block_license, flag_review, notify_admin, send_preventive_warning
    notification_message: Optional[str] = None  # Custom message for notifications
    is_active: bool = True
    region: Optional[str] = None  # null = all regions
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RiskPrediction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    prediction_id: str = Field(default_factory=lambda: f"pred_{uuid.uuid4().hex[:12]}")
    user_id: str
    current_risk_score: float
    predicted_risk_score: float  # Predicted score in 30 days
    risk_trajectory: str  # improving, stable, declining, critical_decline
    confidence: float  # 0-100
    risk_factors: list = []  # List of contributing factors
    recommendations: list = []  # Suggested interventions
    predicted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))

class PreventiveWarning(BaseModel):
    model_config = ConfigDict(extra="ignore")
    warning_id: str = Field(default_factory=lambda: f"pwarn_{uuid.uuid4().hex[:12]}")
    user_id: str
    warning_type: str  # approaching_threshold, compliance_declining, training_due, license_expiring
    current_value: float
    threshold_value: float
    days_to_threshold: Optional[int] = None  # Estimated days until threshold breach
    message: str
    action_required: str  # complete_training, improve_compliance, renew_license
    status: str = "pending"  # pending, acknowledged, action_taken, expired
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged_at: Optional[datetime] = None

# ============== MARKETPLACE MODELS ==============

class MarketplaceProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    dealer_id: str
    name: str
    description: str
    category: str  # firearm, ammunition, accessory, safety_equipment, storage, training_material
    subcategory: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    quantity_available: int = 0
    min_order_quantity: int = 1
    max_order_quantity: Optional[int] = None
    images: list = []  # List of image URLs
    specifications: dict = {}  # Product specs
    requires_license: bool = True  # Requires valid firearm license
    license_types_allowed: list = []  # specific license types required
    region_restrictions: list = []  # Regions where this cannot be sold
    status: str = "active"  # active, draft, out_of_stock, discontinued
    featured: bool = False
    views: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MarketplaceOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    buyer_id: str  # citizen user_id
    dealer_id: str
    items: list = []  # List of {product_id, quantity, price_at_purchase}
    subtotal: float
    tax: float = 0
    total: float
    status: str = "pending"  # pending, confirmed, processing, shipped, delivered, cancelled, refunded
    payment_status: str = "pending"  # pending, paid, failed, refunded
    payment_method: Optional[str] = None
    shipping_address: Optional[dict] = None
    tracking_number: Optional[str] = None
    license_verified: bool = False
    verification_transaction_id: Optional[str] = None  # Link to verification transaction
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MarketplaceReview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"review_{uuid.uuid4().hex[:12]}")
    product_id: str
    buyer_id: str
    order_id: str
    rating: int  # 1-5
    title: Optional[str] = None
    comment: Optional[str] = None
    verified_purchase: bool = True
    helpful_votes: int = 0
    status: str = "active"  # active, hidden, flagged
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CourseEnrollmentExtended(BaseModel):
    model_config = ConfigDict(extra="ignore")
    enrollment_id: str = Field(default_factory=lambda: f"enroll_{uuid.uuid4().hex[:12]}")
    course_id: str
    user_id: str
    status: str = "enrolled"  # enrolled, in_progress, completed, expired, failed
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    progress_percent: int = 0
    quiz_scores: list = []  # List of quiz attempt scores
    certificate_id: Optional[str] = None
    payment_status: str = "pending"  # pending, paid, waived
    amount_paid: float = 0

# Region definitions
REGIONS = ["northeast", "southeast", "midwest", "southwest", "west"]

# ============== HELPER FUNCTIONS ==============

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document for JSON serialization"""
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != '_id'}
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result

async def create_audit_log(action: str, actor_id: str, actor_role: str, target_id: str = None, details: dict = None, ip: str = None):
    """Create immutable audit log entry"""
    log = AuditLog(
        action=action,
        actor_id=actor_id,
        actor_role=actor_role,
        target_id=target_id,
        details=details or {},
        ip_address=ip
    )
    doc = log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)

async def get_current_user(request: Request) -> Optional[dict]:
    """Get current user from session token"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

def require_auth(roles: List[str] = None):
    """Dependency to require authentication"""
    async def dependency(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        if roles and user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency

# ============== RISK ENGINE ==============

RISK_WEIGHTS = {
    "frequency_spike": 0.20,
    "quantity_anomaly": 0.20,
    "location_mismatch": 0.15,
    "expiring_license": 0.10,
    "compliance_history": 0.15,
    "time_anomaly": 0.10,
    "dealer_risk": 0.10
}

async def calculate_risk_score(citizen_id: str, dealer_id: str, quantity: int, item_type: str, gps_lat: float = None, gps_lng: float = None) -> dict:
    """Calculate risk score using weighted factors and AI analysis"""
    risk_factors = []
    base_score = 0
    
    # Get citizen profile
    citizen = await db.citizen_profiles.find_one({"profile_id": citizen_id}, {"_id": 0})
    if not citizen:
        citizen = await db.citizen_profiles.find_one({"user_id": citizen_id}, {"_id": 0})
    
    # Get dealer profile
    dealer = await db.dealer_profiles.find_one({"dealer_id": dealer_id}, {"_id": 0})
    if not dealer:
        dealer = await db.dealer_profiles.find_one({"user_id": dealer_id}, {"_id": 0})
    
    # Get recent transactions (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_txns = await db.transactions.find({
        "citizen_id": citizen_id,
        "created_at": {"$gte": thirty_days_ago}
    }, {"_id": 0}).to_list(100)
    
    # 1. Frequency spike check
    if len(recent_txns) > 5:
        base_score += 30 * RISK_WEIGHTS["frequency_spike"]
        risk_factors.append("High purchase frequency detected")
    elif len(recent_txns) > 3:
        base_score += 15 * RISK_WEIGHTS["frequency_spike"]
        risk_factors.append("Moderate purchase frequency")
    
    # 2. Quantity anomaly
    if quantity > 100:
        base_score += 40 * RISK_WEIGHTS["quantity_anomaly"]
        risk_factors.append("Unusually high quantity")
    elif quantity > 50:
        base_score += 20 * RISK_WEIGHTS["quantity_anomaly"]
        risk_factors.append("Above-average quantity")
    
    # 3. License expiry check
    if citizen:
        expiry = citizen.get("license_expiry")
        if expiry:
            if isinstance(expiry, str):
                expiry = datetime.fromisoformat(expiry)
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            days_to_expiry = (expiry - datetime.now(timezone.utc)).days
            if days_to_expiry < 30:
                base_score += 30 * RISK_WEIGHTS["expiring_license"]
                risk_factors.append("License expiring soon")
            elif days_to_expiry < 90:
                base_score += 15 * RISK_WEIGHTS["expiring_license"]
    
    # 4. Compliance history
    if citizen and citizen.get("compliance_score", 100) < 70:
        base_score += 30 * RISK_WEIGHTS["compliance_history"]
        risk_factors.append("Low compliance score")
    
    # 5. Time-of-day anomaly
    current_hour = datetime.now(timezone.utc).hour
    if current_hour < 6 or current_hour > 22:
        base_score += 20 * RISK_WEIGHTS["time_anomaly"]
        risk_factors.append("Unusual transaction time")
    
    # 6. Dealer risk profile
    if dealer and dealer.get("compliance_score", 100) < 80:
        base_score += 25 * RISK_WEIGHTS["dealer_risk"]
        risk_factors.append("Dealer has compliance issues")
    
    # Normalize score to 0-100
    risk_score = min(100, max(0, int(base_score)))
    
    # Determine risk level
    if risk_score >= 70:
        risk_level = "red"
    elif risk_score >= 40:
        risk_level = "amber"
    else:
        risk_level = "green"
    
    # AI Analysis using GPT-5.2
    ai_analysis = None
    if EMERGENT_LLM_KEY and risk_score >= 30:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"risk_{uuid.uuid4().hex[:8]}",
                system_message="You are a risk analyst for a national firearm verification system. Analyze transaction patterns and provide brief, actionable security recommendations. Be concise."
            ).with_model("openai", "gpt-5.2")
            
            analysis_prompt = f"""Analyze this transaction:
- Item: {item_type}, Quantity: {quantity}
- Risk Factors: {', '.join(risk_factors) if risk_factors else 'None'}
- Base Score: {risk_score}/100
- Recent transactions (30 days): {len(recent_txns)}
- Citizen compliance: {citizen.get('compliance_score', 'N/A') if citizen else 'N/A'}

Provide a 2-sentence risk assessment and recommendation."""

            user_msg = UserMessage(text=analysis_prompt)
            ai_analysis = await chat.send_message(user_msg)
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            ai_analysis = "AI analysis unavailable"
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "ai_analysis": ai_analysis
    }

def generate_challenge() -> Challenge:
    """Generate random security challenge"""
    challenges = [
        Challenge(question="What is your license type?", expected_answer="firearm"),
        Challenge(question="Confirm: You are making this purchase voluntarily?", expected_answer="yes"),
        Challenge(question="Enter the last 4 digits of your license:", expected_answer="verify"),
    ]
    return random.choice(challenges)

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token via Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session_data = auth_response.json()
    
    email = session_data.get("email")
    name = session_data.get("name")
    picture = session_data.get("picture")
    session_token = session_data.get("session_token")
    
    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "citizen",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # Get user with role
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    await create_audit_log("user_login", user_id, user.get("role", "citizen"), details={"email": email})
    
    return serialize_doc(user)

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return serialize_doc(user)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/set-role")
async def set_user_role(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Admin endpoint to set user role"""
    body = await request.json()
    target_user_id = body.get("user_id")
    new_role = body.get("role")
    
    if new_role not in ["citizen", "dealer", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"user_id": target_user_id},
        {"$set": {"role": new_role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await create_audit_log("role_change", user["user_id"], "admin", target_user_id, {"new_role": new_role})
    
    return {"message": "Role updated"}

# ============== CITIZEN ENDPOINTS ==============

@api_router.get("/citizen/profile")
async def get_citizen_profile(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's license profile"""
    profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        return None
    return serialize_doc(profile)

@api_router.post("/citizen/profile")
async def create_citizen_profile(request: Request, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Create or update citizen profile"""
    body = await request.json()
    
    existing = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if existing:
        # Update existing profile
        update_data = {
            "license_number": body.get("license_number", existing.get("license_number")),
            "license_type": body.get("license_type", existing.get("license_type")),
            "address": body.get("address", existing.get("address")),
            "phone": body.get("phone", existing.get("phone")),
        }
        await db.citizen_profiles.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
        profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    else:
        # Create new profile
        expiry = datetime.now(timezone.utc) + timedelta(days=365)
        profile = CitizenProfile(
            user_id=user["user_id"],
            license_number=body.get("license_number", f"LIC-{uuid.uuid4().hex[:8].upper()}"),
            license_type=body.get("license_type", "firearm"),
            license_expiry=expiry,
            address=body.get("address"),
            phone=body.get("phone")
        )
        doc = profile.model_dump()
        doc['license_expiry'] = doc['license_expiry'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.citizen_profiles.insert_one(doc)
        profile = doc
    
    await create_audit_log("profile_update", user["user_id"], "citizen")
    return serialize_doc(profile)

@api_router.get("/citizen/transactions")
async def get_citizen_transactions(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's transaction history"""
    transactions = await db.transactions.find(
        {"citizen_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [serialize_doc(t) for t in transactions]

@api_router.get("/citizen/notifications")
async def get_citizen_notifications(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [serialize_doc(n) for n in notifications]

@api_router.post("/citizen/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@api_router.post("/citizen/verify/{transaction_id}")
async def citizen_verify_transaction(transaction_id: str, approval: TransactionApproval, request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Citizen approves or rejects a verification request"""
    txn = await db.transactions.find_one(
        {"transaction_id": transaction_id, "citizen_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    )
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")
    
    # Handle distress trigger
    if approval.distress_trigger:
        # Silent alert - mark transaction and notify authorities
        await db.transactions.update_one(
            {"transaction_id": transaction_id},
            {"$set": {
                "status": "rejected",
                "risk_level": "red",
                "risk_factors": txn.get("risk_factors", []) + ["DISTRESS_SIGNAL_TRIGGERED"],
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        # Create alert for admins
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": "admin_broadcast",
            "title": "DISTRESS SIGNAL",
            "message": f"Distress signal triggered by citizen during transaction {transaction_id}",
            "type": "alert",
            "transaction_id": transaction_id,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await create_audit_log("distress_triggered", user["user_id"], "citizen", transaction_id)
        return {"status": "rejected", "message": "Transaction cancelled"}
    
    if approval.approved:
        new_status = "approved" if txn.get("risk_level") == "green" else "review_required"
    else:
        new_status = "rejected"
    
    await db.transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "status": new_status,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update citizen stats
    if new_status == "approved":
        await db.citizen_profiles.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"total_purchases": 1}}
        )
    
    await create_audit_log(
        f"transaction_{new_status}",
        user["user_id"],
        "citizen",
        transaction_id
    )
    
    return {"status": new_status, "transaction_id": transaction_id}

# ============== DEALER ENDPOINTS ==============

@api_router.get("/dealer/profile")
async def get_dealer_profile(user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get dealer's profile"""
    profile = await db.dealer_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        return None
    return serialize_doc(profile)

@api_router.post("/dealer/profile")
async def create_dealer_profile(request: Request, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Create or update dealer profile"""
    body = await request.json()
    
    existing = await db.dealer_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if existing:
        update_data = {
            "business_name": body.get("business_name", existing.get("business_name")),
            "license_number": body.get("license_number", existing.get("license_number")),
            "gps_lat": body.get("gps_lat", existing.get("gps_lat")),
            "gps_lng": body.get("gps_lng", existing.get("gps_lng")),
        }
        await db.dealer_profiles.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
        profile = await db.dealer_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    else:
        profile = DealerProfile(
            user_id=user["user_id"],
            business_name=body.get("business_name", "New Dealer"),
            license_number=body.get("license_number", f"DLR-{uuid.uuid4().hex[:8].upper()}"),
            gps_lat=body.get("gps_lat"),
            gps_lng=body.get("gps_lng")
        )
        doc = profile.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.dealer_profiles.insert_one(doc)
        profile = doc
    
    await create_audit_log("dealer_profile_update", user["user_id"], "dealer")
    return serialize_doc(profile)

@api_router.post("/dealer/initiate-transaction")
async def initiate_transaction(txn_data: TransactionCreate, request: Request, user: dict = Depends(require_auth(["dealer"]))):
    """Dealer initiates a verification request"""
    # Find citizen by license number
    citizen_profile = await db.citizen_profiles.find_one(
        {"license_number": txn_data.citizen_license},
        {"_id": 0}
    )
    
    if not citizen_profile:
        raise HTTPException(status_code=404, detail="Citizen license not found")
    
    # Check license status
    if citizen_profile.get("license_status") != "active":
        raise HTTPException(status_code=400, detail="Citizen license is not active")
    
    # Calculate risk score
    risk_result = await calculate_risk_score(
        citizen_profile["user_id"],
        user["user_id"],
        txn_data.quantity,
        txn_data.item_type,
        txn_data.gps_lat,
        txn_data.gps_lng
    )
    
    # Create transaction
    transaction = Transaction(
        citizen_id=citizen_profile["user_id"],
        dealer_id=user["user_id"],
        item_type=txn_data.item_type,
        item_category=txn_data.item_category,
        quantity=txn_data.quantity,
        status="pending",
        risk_score=risk_result["risk_score"],
        risk_level=risk_result["risk_level"],
        risk_factors=risk_result["risk_factors"],
        ai_analysis=risk_result["ai_analysis"],
        gps_lat=txn_data.gps_lat,
        gps_lng=txn_data.gps_lng
    )
    
    doc = transaction.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.transactions.insert_one(doc)
    
    # Create notification for citizen
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": citizen_profile["user_id"],
        "title": "Verification Request",
        "message": f"A dealer is requesting verification for {txn_data.quantity} {txn_data.item_type}",
        "type": "verification_request",
        "transaction_id": transaction.transaction_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Update dealer stats
    await db.dealer_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"total_transactions": 1}}
    )
    
    await create_audit_log(
        "transaction_initiated",
        user["user_id"],
        "dealer",
        transaction.transaction_id,
        {"citizen_license": txn_data.citizen_license, "item_type": txn_data.item_type}
    )
    
    return {
        "transaction_id": transaction.transaction_id,
        "status": "pending",
        "risk_level": risk_result["risk_level"],
        "risk_score": risk_result["risk_score"],
        "message": "Verification request sent to citizen"
    }

@api_router.get("/dealer/transactions")
async def get_dealer_transactions(user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get dealer's transaction history"""
    transactions = await db.transactions.find(
        {"dealer_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [serialize_doc(t) for t in transactions]

@api_router.get("/dealer/transaction/{transaction_id}")
async def get_transaction_status(transaction_id: str, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get specific transaction status"""
    txn = await db.transactions.find_one(
        {"transaction_id": transaction_id},
        {"_id": 0}
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return serialize_doc(txn)

# ============== ADMIN/GOVERNMENT ENDPOINTS ==============

@api_router.get("/admin/dashboard-stats")
async def get_dashboard_stats(user: dict = Depends(require_auth(["admin"]))):
    """Get dashboard statistics for government oversight"""
    # Total counts
    total_citizens = await db.citizen_profiles.count_documents({})
    total_dealers = await db.dealer_profiles.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    
    # Today's stats
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_transactions = await db.transactions.count_documents({"created_at": {"$gte": today_start}})
    
    # Risk distribution
    high_risk = await db.transactions.count_documents({"risk_level": "red"})
    medium_risk = await db.transactions.count_documents({"risk_level": "amber"})
    low_risk = await db.transactions.count_documents({"risk_level": "green"})
    
    # Pending reviews
    pending_reviews = await db.transactions.count_documents({"status": "review_required"})
    
    # Distress signals
    distress_count = await db.transactions.count_documents({"risk_factors": "DISTRESS_SIGNAL_TRIGGERED"})
    
    return {
        "total_citizens": total_citizens,
        "total_dealers": total_dealers,
        "total_transactions": total_transactions,
        "today_transactions": today_transactions,
        "risk_distribution": {
            "high": high_risk,
            "medium": medium_risk,
            "low": low_risk
        },
        "pending_reviews": pending_reviews,
        "distress_alerts": distress_count
    }

@api_router.get("/admin/transactions")
async def get_all_transactions(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get all transactions with filters"""
    query = {}
    if status:
        query["status"] = status
    if risk_level:
        query["risk_level"] = risk_level
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [serialize_doc(t) for t in transactions]

@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    limit: int = 100,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get audit logs"""
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return [serialize_doc(l) for l in logs]

@api_router.get("/admin/citizens")
async def get_all_citizens(user: dict = Depends(require_auth(["admin"]))):
    """Get all citizen profiles"""
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(1000)
    return [serialize_doc(p) for p in profiles]

@api_router.get("/admin/dealers")
async def get_all_dealers(user: dict = Depends(require_auth(["admin"]))):
    """Get all dealer profiles"""
    profiles = await db.dealer_profiles.find({}, {"_id": 0}).to_list(1000)
    return [serialize_doc(p) for p in profiles]

@api_router.post("/admin/review-transaction/{transaction_id}")
async def review_transaction(
    transaction_id: str,
    request: Request,
    user: dict = Depends(require_auth(["admin"]))
):
    """Admin reviews and decides on a flagged transaction"""
    body = await request.json()
    decision = body.get("decision")  # approved, rejected
    notes = body.get("notes", "")
    
    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid decision")
    
    txn = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    await db.transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "status": decision,
            "admin_notes": notes,
            "reviewed_by": user["user_id"],
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify citizen
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": txn["citizen_id"],
        "title": f"Transaction {decision.title()}",
        "message": f"Your transaction {transaction_id} has been {decision} after review.",
        "type": decision,
        "transaction_id": transaction_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await create_audit_log(
        f"admin_review_{decision}",
        user["user_id"],
        "admin",
        transaction_id,
        {"notes": notes}
    )
    
    return {"message": f"Transaction {decision}", "transaction_id": transaction_id}

@api_router.get("/admin/alerts")
async def get_alerts(user: dict = Depends(require_auth(["admin"]))):
    """Get system alerts including distress signals"""
    alerts = await db.notifications.find(
        {"user_id": "admin_broadcast"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [serialize_doc(a) for a in alerts]

# ============== PUBLIC ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "AMMO - Accountable Munitions & Mobility Oversight API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============== DEMO DATA ENDPOINTS ==============

@api_router.post("/demo/login/{role}")
async def demo_login(role: str, response: Response):
    """Create a session for demo user (for testing/screenshots only)"""
    demo_users = {
        "citizen": "demo_citizen_001",
        "dealer": "demo_dealer_001",
        "admin": "demo_admin_001"
    }
    
    if role not in demo_users:
        raise HTTPException(status_code=400, detail="Invalid role. Use: citizen, dealer, admin")
    
    user_id = demo_users[role]
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found. Call /demo/setup first")
    
    # Create session token
    session_token = f"demo_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Remove existing sessions and create new one
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=3600,
        path="/"
    )
    
    return {
        "message": f"Logged in as demo {role}",
        "session_token": session_token,
        "user": serialize_doc(user)
    }

@api_router.post("/demo/setup")
async def setup_demo_data():
    """Setup demo data for testing"""
    # Create demo citizen profile
    demo_citizen_id = "demo_citizen_001"
    demo_dealer_id = "demo_dealer_001"
    
    # Check if already exists
    existing_citizen = await db.users.find_one({"user_id": demo_citizen_id})
    if not existing_citizen:
        # Create demo citizen user
        await db.users.insert_one({
            "user_id": demo_citizen_id,
            "email": "demo.citizen@aegis.gov",
            "name": "John Citizen",
            "picture": "https://images.unsplash.com/photo-1706827515530-ade374fa8178?w=150",
            "role": "citizen",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Create citizen profile
        await db.citizen_profiles.insert_one({
            "profile_id": f"profile_{uuid.uuid4().hex[:12]}",
            "user_id": demo_citizen_id,
            "license_number": "LIC-DEMO-001",
            "license_type": "firearm",
            "license_status": "active",
            "license_expiry": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),
            "compliance_score": 95,
            "total_purchases": 5,
            "address": "123 Main St, Capital City",
            "phone": "+1-555-0100",
            "biometric_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    existing_dealer = await db.users.find_one({"user_id": demo_dealer_id})
    if not existing_dealer:
        # Create demo dealer user
        await db.users.insert_one({
            "user_id": demo_dealer_id,
            "email": "demo.dealer@aegis.gov",
            "name": "Smith Arms Co.",
            "picture": "https://images.unsplash.com/photo-1659100947220-48b5d5738148?w=150",
            "role": "dealer",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Create dealer profile
        await db.dealer_profiles.insert_one({
            "dealer_id": f"dealer_{uuid.uuid4().hex[:12]}",
            "user_id": demo_dealer_id,
            "business_name": "Smith Arms Co.",
            "license_number": "DLR-DEMO-001",
            "license_status": "active",
            "gps_lat": 40.7128,
            "gps_lng": -74.0060,
            "compliance_score": 98,
            "total_transactions": 150,
            "hardware_cert_valid": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create demo admin
    demo_admin_id = "demo_admin_001"
    existing_admin = await db.users.find_one({"user_id": demo_admin_id})
    if not existing_admin:
        await db.users.insert_one({
            "user_id": demo_admin_id,
            "email": "admin@aegis.gov",
            "name": "System Administrator",
            "picture": None,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create some sample transactions
    sample_transactions = [
        {"status": "approved", "risk_level": "green", "risk_score": 15},
        {"status": "approved", "risk_level": "green", "risk_score": 22},
        {"status": "review_required", "risk_level": "amber", "risk_score": 55},
        {"status": "rejected", "risk_level": "red", "risk_score": 78},
        {"status": "pending", "risk_level": "green", "risk_score": 12},
    ]
    
    for i, txn_data in enumerate(sample_transactions):
        txn_id = f"txn_demo_{i+1:03d}"
        existing_txn = await db.transactions.find_one({"transaction_id": txn_id})
        if not existing_txn:
            await db.transactions.insert_one({
                "transaction_id": txn_id,
                "citizen_id": demo_citizen_id,
                "dealer_id": demo_dealer_id,
                "item_type": "ammunition" if i % 2 == 0 else "firearm",
                "item_category": "9mm" if i % 2 == 0 else "handgun",
                "quantity": 50 + i * 10,
                "status": txn_data["status"],
                "risk_score": txn_data["risk_score"],
                "risk_level": txn_data["risk_level"],
                "risk_factors": ["Demo transaction"] if txn_data["risk_score"] > 30 else [],
                "gps_lat": 40.7128,
                "gps_lng": -74.0060,
                "created_at": (datetime.now(timezone.utc) - timedelta(days=i)).isoformat()
            })
    
    # Create demo training courses
    demo_courses = [
        {"name": "Basic Firearm Safety", "description": "Fundamental safety principles for firearm handling", "region": "national", "cost": 150.00, "duration_hours": 8, "is_compulsory": True, "category": "safety", "ari_boost": 10, "ari_penalty_for_skip": 15, "deadline_days": 30},
        {"name": "Legal Compliance Training", "description": "Understanding federal and state firearm laws", "region": "national", "cost": 200.00, "duration_hours": 12, "is_compulsory": True, "category": "legal", "ari_boost": 15, "ari_penalty_for_skip": 20, "deadline_days": 45},
        {"name": "Advanced Tactical Training", "description": "Advanced handling and situational awareness", "region": "northeast", "cost": 350.00, "duration_hours": 16, "is_compulsory": False, "category": "tactical", "ari_boost": 20},
        {"name": "Safe Storage Best Practices", "description": "Proper storage and securing of firearms", "region": "southeast", "cost": 100.00, "duration_hours": 4, "is_compulsory": True, "category": "safety", "ari_boost": 8, "ari_penalty_for_skip": 10, "deadline_days": 30},
        {"name": "Annual Refresher Course", "description": "Yearly refresher on safety and legal updates", "region": "national", "cost": 75.00, "duration_hours": 4, "is_compulsory": True, "category": "refresher", "ari_boost": 5, "ari_penalty_for_skip": 8, "deadline_days": 365},
        {"name": "Concealed Carry Certification", "description": "State-certified concealed carry training", "region": "midwest", "cost": 250.00, "duration_hours": 10, "is_compulsory": False, "category": "specialized", "ari_boost": 12},
        {"name": "Home Defense Training", "description": "Home security and defense techniques", "region": "southwest", "cost": 175.00, "duration_hours": 6, "is_compulsory": False, "category": "tactical", "ari_boost": 8},
        {"name": "First Aid for Firearm Owners", "description": "Emergency medical training for accidents", "region": "west", "cost": 125.00, "duration_hours": 8, "is_compulsory": False, "category": "safety", "ari_boost": 10},
    ]
    
    for course_data in demo_courses:
        course_id = f"course_{course_data['name'].lower().replace(' ', '_')[:20]}"
        existing_course = await db.training_courses.find_one({"course_id": course_id})
        if not existing_course:
            await db.training_courses.insert_one({
                "course_id": course_id,
                **course_data,
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Create demo revenue records
    revenue_types = ["course_fee", "license_fee", "membership_fee", "renewal_fee", "certification_fee"]
    for i in range(50):
        rev_id = f"rev_demo_{i+1:03d}"
        existing_rev = await db.revenue_records.find_one({"revenue_id": rev_id})
        if not existing_rev:
            rev_type = random.choice(revenue_types)
            region = random.choice(REGIONS)
            amount = random.uniform(50, 500) if rev_type != "penalty_fee" else random.uniform(100, 1000)
            await db.revenue_records.insert_one({
                "revenue_id": rev_id,
                "type": rev_type,
                "amount": round(amount, 2),
                "region": region,
                "description": f"Demo {rev_type.replace('_', ' ')} for {region}",
                "status": "completed",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(0, 90))).isoformat()
            })
    
    # Create additional demo citizens for analytics
    demo_citizens = [
        {"id": "citizen_002", "name": "Jane Smith", "region": "northeast", "ari": 78, "license_status": "active"},
        {"id": "citizen_003", "name": "Robert Johnson", "region": "southeast", "ari": 45, "license_status": "active"},
        {"id": "citizen_004", "name": "Emily Davis", "region": "midwest", "ari": 92, "license_status": "active"},
        {"id": "citizen_005", "name": "Michael Brown", "region": "southwest", "ari": 35, "license_status": "suspended"},
        {"id": "citizen_006", "name": "Sarah Wilson", "region": "west", "ari": 88, "license_status": "active"},
        {"id": "citizen_007", "name": "David Lee", "region": "northeast", "ari": 62, "license_status": "active"},
        {"id": "citizen_008", "name": "Jennifer Taylor", "region": "southeast", "ari": 71, "license_status": "active"},
        {"id": "citizen_009", "name": "Chris Anderson", "region": "midwest", "ari": 25, "license_status": "blocked"},
        {"id": "citizen_010", "name": "Amanda Martinez", "region": "southwest", "ari": 85, "license_status": "active"},
    ]
    
    for citizen in demo_citizens:
        existing = await db.users.find_one({"user_id": citizen["id"]})
        if not existing:
            await db.users.insert_one({
                "user_id": citizen["id"],
                "email": f"{citizen['name'].lower().replace(' ', '.')}@demo.gov",
                "name": citizen["name"],
                "role": "citizen",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            await db.citizen_profiles.insert_one({
                "profile_id": f"profile_{citizen['id']}",
                "user_id": citizen["id"],
                "license_number": f"LIC-{citizen['id'].upper()}",
                "license_type": "firearm",
                "license_status": citizen["license_status"],
                "license_expiry": (datetime.now(timezone.utc) + timedelta(days=random.randint(30, 365))).isoformat(),
                "compliance_score": citizen["ari"],
                "region": citizen["region"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            await db.responsibility_profile.insert_one({
                "user_id": citizen["id"],
                "ari_score": citizen["ari"],
                "training_hours": random.randint(0, 30),
                "safe_storage_verified": random.choice([True, False]),
                "violations": 0 if citizen["ari"] > 50 else random.randint(1, 3),
                "community_points": random.randint(0, 60)
            })
    
    # Create additional demo dealers
    demo_dealers = [
        {"id": "dealer_002", "name": "Northeast Arms", "region": "northeast", "transactions": 230},
        {"id": "dealer_003", "name": "Southern Defense Supply", "region": "southeast", "transactions": 450},
        {"id": "dealer_004", "name": "Midwest Firearms", "region": "midwest", "transactions": 180},
        {"id": "dealer_005", "name": "Southwest Arms Depot", "region": "southwest", "transactions": 320},
    ]
    
    for dealer in demo_dealers:
        existing = await db.users.find_one({"user_id": dealer["id"]})
        if not existing:
            await db.users.insert_one({
                "user_id": dealer["id"],
                "email": f"{dealer['name'].lower().replace(' ', '.')}@dealer.gov",
                "name": dealer["name"],
                "role": "dealer",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            await db.dealer_profiles.insert_one({
                "dealer_id": dealer["id"],
                "user_id": dealer["id"],
                "business_name": dealer["name"],
                "license_number": f"DLR-{dealer['id'].upper()}",
                "license_status": "active",
                "region": dealer["region"],
                "compliance_score": random.randint(75, 100),
                "total_transactions": dealer["transactions"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Create demo alerts
    demo_alerts = [
        {"user_id": "citizen_005", "type": "red_flag", "severity": "high", "title": "Compliance Score Drop", "reason": "compliance_drop"},
        {"user_id": "citizen_009", "type": "intervention", "severity": "critical", "title": "License Blocked - Multiple Violations", "reason": "suspicious_activity"},
        {"user_id": "citizen_003", "type": "warning", "severity": "medium", "title": "Compulsory Training Overdue", "reason": "compulsory_training_missed"},
    ]
    
    for i, alert_data in enumerate(demo_alerts):
        alert_id = f"alert_demo_{i+1:03d}"
        existing_alert = await db.member_alerts.find_one({"alert_id": alert_id})
        if not existing_alert:
            await db.member_alerts.insert_one({
                "alert_id": alert_id,
                "user_id": alert_data["user_id"],
                "alert_type": alert_data["type"],
                "severity": alert_data["severity"],
                "title": alert_data["title"],
                "description": f"Automated alert triggered for user {alert_data['user_id']}",
                "trigger_reason": alert_data["reason"],
                "status": "active",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))).isoformat()
            })
    
    # Create demo alert thresholds
    demo_thresholds = [
        {"name": "High Purchase Frequency", "metric": "purchase_count_30d", "operator": "gt", "value": 10, "severity": "medium", "auto_action": "flag_review"},
        {"name": "Low Compliance Score", "metric": "compliance_score", "operator": "lt", "value": 40, "severity": "high", "auto_action": "warn"},
        {"name": "Critical Compliance Drop", "metric": "compliance_score", "operator": "lt", "value": 25, "severity": "critical", "auto_action": "block_license"},
    ]
    
    for thresh in demo_thresholds:
        thresh_id = f"thresh_{thresh['metric']}_{thresh['operator']}"
        existing = await db.alert_thresholds.find_one({"threshold_id": thresh_id})
        if not existing:
            await db.alert_thresholds.insert_one({
                "threshold_id": thresh_id,
                **thresh,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Create demo marketplace products
    demo_products = [
        {"name": "SafeGuard Pro Biometric Safe", "category": "storage", "price": 599.99, "description": "Premium biometric gun safe with quick access", "dealer_id": "demo_dealer_001", "quantity_available": 25, "featured": True},
        {"name": "TactiClean Cleaning Kit", "category": "accessory", "price": 49.99, "description": "Complete cleaning kit for all calibers", "dealer_id": "demo_dealer_001", "quantity_available": 100},
        {"name": "9mm Training Rounds (50ct)", "category": "ammunition", "price": 24.99, "description": "Practice rounds for range training", "dealer_id": "dealer_002", "quantity_available": 500},
        {"name": "Electronic Hearing Protection", "category": "safety_equipment", "price": 149.99, "description": "Active noise-canceling ear protection", "dealer_id": "dealer_003", "quantity_available": 50, "featured": True},
        {"name": "Concealed Carry Holster", "category": "accessory", "price": 79.99, "description": "Premium leather IWB holster", "dealer_id": "dealer_002", "quantity_available": 75},
        {"name": "Range Bag Deluxe", "category": "accessory", "price": 89.99, "description": "Large capacity range bag with multiple compartments", "dealer_id": "demo_dealer_001", "quantity_available": 40},
        {"name": "Gun Lock Cable Set (3)", "category": "safety_equipment", "price": 19.99, "description": "TSA-approved cable locks", "dealer_id": "dealer_004", "quantity_available": 200},
        {"name": "Advanced Safety Manual", "category": "training_material", "price": 29.99, "description": "Comprehensive firearm safety guide", "dealer_id": "dealer_003", "quantity_available": 150},
    ]
    
    for prod_data in demo_products:
        prod_id = f"prod_{prod_data['name'].lower().replace(' ', '_')[:20]}"
        existing_prod = await db.marketplace_products.find_one({"product_id": prod_id})
        if not existing_prod:
            await db.marketplace_products.insert_one({
                "product_id": prod_id,
                **prod_data,
                "status": "active",
                "images": [],
                "specifications": {},
                "requires_license": prod_data["category"] in ["firearm", "ammunition"],
                "views": random.randint(10, 200),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
    
    return {"message": "Demo data created", "citizen_license": "LIC-DEMO-001"}

# ============== AMMO RESPONSIBILITY ENGINE ==============
# Focus: Compliance, Training, Safety - NEVER purchase volume

# AMMO Responsibility Index (ARI) Factors
ARI_FACTORS = {
    "license_renewal": {"weight": 0.20, "description": "On-time license renewal"},
    "training_hours": {"weight": 0.25, "description": "Safety training participation"},
    "safe_storage": {"weight": 0.20, "description": "Safe storage verification"},
    "violation_free": {"weight": 0.20, "description": "No violation record"},
    "community_participation": {"weight": 0.15, "description": "Community engagement"}
}

# Tier System (Responsibility-Based)
TIER_DEFINITIONS = {
    "sentinel": {
        "name": "Sentinel",
        "min_ari": 0,
        "max_ari": 59,
        "color": "green",
        "icon": "shield",
        "benefits": ["Licensed & Compliant", "Standard Verification"],
        "description": "Entry tier - Licensed and compliant owner"
    },
    "guardian": {
        "name": "Guardian",
        "min_ari": 60,
        "max_ari": 84,
        "color": "blue",
        "icon": "shield-check",
        "benefits": ["Faster Verification", "Training Discounts", "Recognition Badge"],
        "description": "Advanced training completed, perfect renewal record"
    },
    "elite_custodian": {
        "name": "Elite Custodian",
        "min_ari": 85,
        "max_ari": 100,
        "color": "purple",
        "icon": "crown",
        "benefits": ["Priority Service", "Insurance Discounts", "Community Mentor Status", "Renewal Fee Reduction"],
        "description": "Long-term compliance excellence, community leader"
    }
}

# Responsibility Badges (Non-Aggressive, Safety-Focused)
RESPONSIBILITY_BADGES = {
    "clean_record_1yr": {
        "name": "1-Year Clean Record",
        "description": "Maintained violation-free status for 1 year",
        "icon": "award",
        "ari_boost": 5,
        "category": "compliance"
    },
    "clean_record_5yr": {
        "name": "5-Year Clean Record",
        "description": "Maintained violation-free status for 5 years",
        "icon": "trophy",
        "ari_boost": 15,
        "category": "compliance"
    },
    "safety_certified": {
        "name": "Safety Certified",
        "description": "Completed basic safety training course",
        "icon": "graduation-cap",
        "ari_boost": 10,
        "category": "training"
    },
    "advanced_safety": {
        "name": "Advanced Safety Certified",
        "description": "Completed advanced safety training program",
        "icon": "medal",
        "ari_boost": 15,
        "category": "training"
    },
    "range_certified": {
        "name": "Range Safety Certified",
        "description": "Certified in range safety protocols",
        "icon": "target",
        "ari_boost": 10,
        "category": "training"
    },
    "secure_storage": {
        "name": "Secure Storage Verified",
        "description": "Safe storage compliance verified",
        "icon": "lock",
        "ari_boost": 10,
        "category": "safety"
    },
    "zero_incident": {
        "name": "Zero Incident Milestone",
        "description": "No safety incidents on record",
        "icon": "check-circle",
        "ari_boost": 10,
        "category": "safety"
    },
    "community_protector": {
        "name": "Community Protector",
        "description": "Active community safety participant",
        "icon": "users",
        "ari_boost": 10,
        "category": "community"
    },
    "mentor_certified": {
        "name": "Certified Mentor",
        "description": "Approved to mentor new members",
        "icon": "heart-handshake",
        "ari_boost": 15,
        "category": "community"
    },
    "renewal_punctual": {
        "name": "Punctual Renewal",
        "description": "Renewed license on time for 3 consecutive years",
        "icon": "clock",
        "ari_boost": 10,
        "category": "compliance"
    },
    "emergency_ready": {
        "name": "Emergency Ready",
        "description": "Emergency contact and protocols updated",
        "icon": "alert-circle",
        "ari_boost": 5,
        "category": "safety"
    },
    "education_champion": {
        "name": "Education Champion",
        "description": "Completed all educational modules",
        "icon": "book-open",
        "ari_boost": 10,
        "category": "training"
    }
}

# Monthly Responsibility Challenges
MONTHLY_CHALLENGES = [
    {"id": "refresher_course", "name": "Complete Refresher Course", "description": "Take a safety refresher course", "ari_boost": 3, "category": "training"},
    {"id": "update_contacts", "name": "Update Emergency Contact", "description": "Verify emergency contact information", "ari_boost": 2, "category": "safety"},
    {"id": "storage_audit", "name": "Confirm Safe Storage", "description": "Complete safe storage self-audit", "ari_boost": 3, "category": "safety"},
    {"id": "community_workshop", "name": "Attend Safety Workshop", "description": "Participate in community safety event", "ari_boost": 5, "category": "community"},
    {"id": "mentor_session", "name": "Mentor a New Member", "description": "Guide a new member through onboarding", "ari_boost": 5, "category": "community"},
    {"id": "education_module", "name": "Complete Education Module", "description": "Finish a safety education module", "ari_boost": 3, "category": "training"},
]

def get_tier_from_ari(ari_score: int) -> dict:
    """Get tier based on ARI score"""
    for tier_id, tier in TIER_DEFINITIONS.items():
        if tier["min_ari"] <= ari_score <= tier["max_ari"]:
            return {"tier_id": tier_id, **tier}
    return {"tier_id": "sentinel", **TIER_DEFINITIONS["sentinel"]}

async def calculate_ari_score(user_id: str) -> dict:
    """Calculate AMMO Responsibility Index (ARI) score"""
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    responsibility_data = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    
    if not profile:
        return {"ari_score": 0, "factors": {}, "tier": get_tier_from_ari(0)}
    
    factors = {}
    total_score = 0
    
    # 1. License Renewal (20%) - Based on renewal history
    renewal_score = 100 if profile.get("license_status") == "active" else 0
    if responsibility_data:
        on_time_renewals = responsibility_data.get("on_time_renewals", 0)
        total_renewals = responsibility_data.get("total_renewals", 1)
        if total_renewals > 0:
            renewal_score = min(100, (on_time_renewals / total_renewals) * 100)
    factors["license_renewal"] = {"score": renewal_score, "weighted": renewal_score * ARI_FACTORS["license_renewal"]["weight"]}
    total_score += factors["license_renewal"]["weighted"]
    
    # 2. Training Hours (25%) - Based on completed training
    training_hours = responsibility_data.get("training_hours", 0) if responsibility_data else 0
    training_score = min(100, (training_hours / 20) * 100)  # 20 hours = 100%
    factors["training_hours"] = {"score": training_score, "hours": training_hours, "weighted": training_score * ARI_FACTORS["training_hours"]["weight"]}
    total_score += factors["training_hours"]["weighted"]
    
    # 3. Safe Storage (20%) - Based on verification status
    storage_verified = responsibility_data.get("safe_storage_verified", False) if responsibility_data else False
    storage_score = 100 if storage_verified else 0
    factors["safe_storage"] = {"score": storage_score, "verified": storage_verified, "weighted": storage_score * ARI_FACTORS["safe_storage"]["weight"]}
    total_score += factors["safe_storage"]["weighted"]
    
    # 4. Violation-Free (20%) - Based on violation history
    violations = responsibility_data.get("violations", 0) if responsibility_data else 0
    violation_score = 100 if violations == 0 else max(0, 100 - (violations * 25))
    factors["violation_free"] = {"score": violation_score, "violations": violations, "weighted": violation_score * ARI_FACTORS["violation_free"]["weight"]}
    total_score += factors["violation_free"]["weighted"]
    
    # 5. Community Participation (15%) - Based on community engagement
    community_points = responsibility_data.get("community_points", 0) if responsibility_data else 0
    community_score = min(100, (community_points / 50) * 100)  # 50 points = 100%
    factors["community_participation"] = {"score": community_score, "points": community_points, "weighted": community_score * ARI_FACTORS["community_participation"]["weight"]}
    total_score += factors["community_participation"]["weighted"]
    
    ari_score = round(total_score)
    tier = get_tier_from_ari(ari_score)
    
    return {
        "ari_score": ari_score,
        "factors": factors,
        "tier": tier
    }

@api_router.get("/citizen/responsibility")
async def get_responsibility_profile(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's AMMO Responsibility Profile including ARI score, tier, badges, and progress"""
    user_id = user["user_id"]
    
    # Calculate ARI score
    ari_data = await calculate_ari_score(user_id)
    
    # Get responsibility profile
    resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    
    if not resp_profile:
        # Initialize responsibility profile
        resp_profile = {
            "user_id": user_id,
            "badges": [],
            "training_hours": 0,
            "training_modules_completed": [],
            "safe_storage_verified": False,
            "safe_storage_last_audit": None,
            "violations": 0,
            "community_points": 0,
            "mentees_helped": 0,
            "challenges_completed": [],
            "compliance_streak_days": 0,
            "on_time_renewals": 0,
            "total_renewals": 0,
            "emergency_contact_updated": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.responsibility_profile.insert_one(resp_profile)
    
    # Get earned badges with details
    earned_badges = []
    for badge_id in resp_profile.get("badges", []):
        if badge_id in RESPONSIBILITY_BADGES:
            earned_badges.append({
                "badge_id": badge_id,
                **RESPONSIBILITY_BADGES[badge_id],
                "earned": True
            })
    
    # Get available badges
    available_badges = []
    for badge_id, badge in RESPONSIBILITY_BADGES.items():
        if badge_id not in resp_profile.get("badges", []):
            available_badges.append({
                "badge_id": badge_id,
                **badge,
                "earned": False
            })
    
    # Get current month's challenges
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    completed_challenges = [c for c in resp_profile.get("challenges_completed", []) if c.get("month") == current_month]
    
    active_challenges = []
    for challenge in MONTHLY_CHALLENGES:
        is_completed = any(c.get("id") == challenge["id"] for c in completed_challenges)
        active_challenges.append({
            **challenge,
            "completed": is_completed
        })
    
    return {
        "ari_score": ari_data["ari_score"],
        "ari_factors": ari_data["factors"],
        "tier": ari_data["tier"],
        "badges_earned": earned_badges,
        "badges_available": available_badges,
        "training": {
            "hours": resp_profile.get("training_hours", 0),
            "modules_completed": resp_profile.get("training_modules_completed", []),
            "target_hours": 20
        },
        "safe_storage": {
            "verified": resp_profile.get("safe_storage_verified", False),
            "last_audit": resp_profile.get("safe_storage_last_audit")
        },
        "community": {
            "points": resp_profile.get("community_points", 0),
            "mentees_helped": resp_profile.get("mentees_helped", 0)
        },
        "compliance_streak": resp_profile.get("compliance_streak_days", 0),
        "monthly_challenges": active_challenges,
        "challenges_completed_this_month": len(completed_challenges)
    }

@api_router.post("/citizen/complete-challenge")
async def complete_challenge(request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Complete a monthly responsibility challenge"""
    body = await request.json()
    challenge_id = body.get("challenge_id")
    
    # Find challenge
    challenge = next((c for c in MONTHLY_CHALLENGES if c["id"] == challenge_id), None)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    user_id = user["user_id"]
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Check if already completed this month
    resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    if resp_profile:
        completed = resp_profile.get("challenges_completed", [])
        if any(c.get("id") == challenge_id and c.get("month") == current_month for c in completed):
            return {"message": "Challenge already completed this month", "already_completed": True}
    
    # Complete challenge
    completion_record = {
        "id": challenge_id,
        "month": current_month,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update profile based on challenge type
    update_ops = {
        "$push": {"challenges_completed": completion_record}
    }
    
    if challenge["category"] == "training":
        update_ops["$inc"] = {"training_hours": 1}
    elif challenge["category"] == "community":
        update_ops["$inc"] = {"community_points": challenge["ari_boost"]}
    elif challenge["category"] == "safety" and challenge_id == "storage_audit":
        update_ops["$set"] = {"safe_storage_last_audit": datetime.now(timezone.utc).isoformat()}
    
    await db.responsibility_profile.update_one(
        {"user_id": user_id},
        update_ops,
        upsert=True
    )
    
    await create_audit_log("challenge_completed", user_id, "citizen", details={"challenge": challenge_id})
    
    return {
        "message": f"Challenge '{challenge['name']}' completed!",
        "ari_boost": challenge["ari_boost"],
        "challenge": challenge
    }

@api_router.post("/citizen/verify-safe-storage")
async def verify_safe_storage(user: dict = Depends(require_auth(["citizen"]))):
    """Verify safe storage compliance"""
    user_id = user["user_id"]
    
    await db.responsibility_profile.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "safe_storage_verified": True,
                "safe_storage_last_audit": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Check if badge should be awarded
    resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    badges = resp_profile.get("badges", []) if resp_profile else []
    
    new_badge = None
    if "secure_storage" not in badges:
        await db.responsibility_profile.update_one(
            {"user_id": user_id},
            {"$push": {"badges": "secure_storage"}}
        )
        new_badge = RESPONSIBILITY_BADGES["secure_storage"]
    
    await create_audit_log("safe_storage_verified", user_id, "citizen")
    
    return {
        "message": "Safe storage verified successfully",
        "new_badge": new_badge
    }

@api_router.post("/citizen/log-training")
async def log_training_hours(request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Log completed training hours"""
    body = await request.json()
    hours = body.get("hours", 0)
    module_id = body.get("module_id")
    module_name = body.get("module_name", "General Training")
    
    if hours <= 0 or hours > 8:
        raise HTTPException(status_code=400, detail="Hours must be between 1 and 8")
    
    user_id = user["user_id"]
    
    update_ops = {
        "$inc": {"training_hours": hours}
    }
    
    if module_id:
        module_record = {
            "id": module_id,
            "name": module_name,
            "hours": hours,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        update_ops["$push"] = {"training_modules_completed": module_record}
    
    await db.responsibility_profile.update_one(
        {"user_id": user_id},
        update_ops,
        upsert=True
    )
    
    # Check for training badges
    resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    total_hours = resp_profile.get("training_hours", 0) if resp_profile else hours
    badges = resp_profile.get("badges", []) if resp_profile else []
    
    new_badges = []
    if total_hours >= 5 and "safety_certified" not in badges:
        new_badges.append("safety_certified")
    if total_hours >= 15 and "advanced_safety" not in badges:
        new_badges.append("advanced_safety")
    if total_hours >= 20 and "education_champion" not in badges:
        new_badges.append("education_champion")
    
    if new_badges:
        await db.responsibility_profile.update_one(
            {"user_id": user_id},
            {"$push": {"badges": {"$each": new_badges}}}
        )
    
    await create_audit_log("training_logged", user_id, "citizen", details={"hours": hours, "module": module_name})
    
    return {
        "message": f"Logged {hours} training hours",
        "total_hours": total_hours,
        "new_badges": [RESPONSIBILITY_BADGES[b] for b in new_badges] if new_badges else []
    }

@api_router.get("/admin/training-leaderboard")
async def get_training_leaderboard(limit: int = 20, user: dict = Depends(require_auth(["admin"]))):
    """Get training leaderboard - ranked by training hours and safety metrics, NOT purchases"""
    profiles = await db.responsibility_profile.find(
        {},
        {"_id": 0, "user_id": 1, "training_hours": 1, "badges": 1, "community_points": 1, "safe_storage_verified": 1}
    ).sort("training_hours", -1).limit(limit).to_list(limit)
    
    leaderboard = []
    for idx, profile in enumerate(profiles):
        user_data = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "name": 1})
        ari_data = await calculate_ari_score(profile["user_id"])
        
        leaderboard.append({
            "rank": idx + 1,
            "user_id": profile["user_id"],
            "name": user_data.get("name", "Anonymous") if user_data else "Anonymous",
            "training_hours": profile.get("training_hours", 0),
            "badges_count": len(profile.get("badges", [])),
            "ari_score": ari_data["ari_score"],
            "tier": ari_data["tier"]["name"],
            "safe_storage_verified": profile.get("safe_storage_verified", False)
        })
    
    return {
        "leaderboard": leaderboard,
        "ranked_by": "Training hours and safety compliance",
        "note": "This leaderboard rewards responsible behavior, not purchase volume"
    }

# Keep old gamification endpoint for backwards compatibility but redirect to new system
BADGE_DEFINITIONS = RESPONSIBILITY_BADGES  # Alias for compatibility

LEVEL_THRESHOLDS = [
    {"level": 1, "name": "Sentinel", "min_points": 0, "max_points": 59},
    {"level": 2, "name": "Guardian", "min_points": 60, "max_points": 84},
    {"level": 3, "name": "Elite Custodian", "min_points": 85, "max_points": 100},
]

def get_level_from_points(points: int) -> dict:
    # Map ARI score to tier
    tier = get_tier_from_ari(points)
    return {"level": list(TIER_DEFINITIONS.keys()).index(tier["tier_id"]) + 1, "name": tier["name"], "min_points": tier["min_ari"], "max_points": tier["max_ari"]}

@api_router.get("/citizen/gamification")
async def get_gamification_stats(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's responsibility stats - redirects to new ARI system"""
    user_id = user["user_id"]
    
    # Calculate ARI score
    ari_data = await calculate_ari_score(user_id)
    
    # Get responsibility profile
    resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    
    if not resp_profile:
        resp_profile = {
            "user_id": user_id,
            "badges": [],
            "training_hours": 0,
            "compliance_streak_days": 0
        }
    
    # Get earned badges with details
    earned_badges = []
    for badge_id in resp_profile.get("badges", []):
        if badge_id in RESPONSIBILITY_BADGES:
            earned_badges.append({
                "badge_id": badge_id,
                **RESPONSIBILITY_BADGES[badge_id],
                "earned": True
            })
    
    # Get available badges
    available_badges = []
    for badge_id, badge in RESPONSIBILITY_BADGES.items():
        if badge_id not in resp_profile.get("badges", []):
            available_badges.append({
                "badge_id": badge_id,
                **badge,
                "earned": False
            })
    
    tier = ari_data["tier"]
    
    return {
        "points": ari_data["ari_score"],
        "level": {
            "level": list(TIER_DEFINITIONS.keys()).index(tier["tier_id"]) + 1,
            "name": tier["name"],
            "min_points": tier["min_ari"],
            "max_points": tier["max_ari"]
        },
        "badges_earned": earned_badges,
        "badges_available": available_badges,
        "current_streak": resp_profile.get("compliance_streak_days", 0),
        "longest_streak": resp_profile.get("compliance_streak_days", 0),
        "total_transactions": 0,  # Deprecated - not tracking purchases for gamification
        "new_badges": [],
        "ari_score": ari_data["ari_score"],
        "tier": tier,
        "training_hours": resp_profile.get("training_hours", 0),
        "note": "AMMO rewards responsible behavior, not purchase volume"
    }

@api_router.post("/citizen/check-in")
async def daily_check_in(user: dict = Depends(require_auth(["citizen"]))):
    """Daily compliance check-in to maintain streak"""
    user_id = user["user_id"]
    today = datetime.now(timezone.utc).date().isoformat()
    
    resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    
    if not resp_profile:
        resp_profile = {
            "user_id": user_id,
            "compliance_streak_days": 0,
            "last_checkin_date": None
        }
    
    last_date = resp_profile.get("last_checkin_date")
    current_streak = resp_profile.get("compliance_streak_days", 0)
    
    if last_date == today:
        return {"message": "Already checked in today", "streak": current_streak}
    
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    
    if last_date == yesterday:
        current_streak += 1
    else:
        current_streak = 1
    
    await db.responsibility_profile.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "last_checkin_date": today,
                "compliance_streak_days": current_streak
            }
        },
        upsert=True
    )
    
    await create_audit_log("daily_checkin", user_id, "citizen", details={"streak": current_streak})
    
    return {
        "message": "Compliance check-in successful!",
        "streak": current_streak,
        "note": "Maintain your streak to boost your ARI score"
    }

# ============== HEATMAP DATA ENDPOINTS ==============

@api_router.get("/admin/heatmap/geographic")
async def get_geographic_heatmap(user: dict = Depends(require_auth(["admin"]))):
    """Get geographic heatmap data for risk visualization"""
    transactions = await db.transactions.find(
        {"gps_lat": {"$exists": True}, "gps_lng": {"$exists": True}},
        {"_id": 0, "gps_lat": 1, "gps_lng": 1, "risk_level": 1, "risk_score": 1, "status": 1, "created_at": 1}
    ).to_list(500)
    
    # Aggregate by approximate location (rounded to 2 decimal places)
    location_data = {}
    for txn in transactions:
        lat = round(txn.get("gps_lat", 0), 2)
        lng = round(txn.get("gps_lng", 0), 2)
        key = f"{lat},{lng}"
        
        if key not in location_data:
            location_data[key] = {
                "lat": lat,
                "lng": lng,
                "total": 0,
                "high_risk": 0,
                "medium_risk": 0,
                "low_risk": 0,
                "avg_risk_score": 0,
                "risk_scores": []
            }
        
        location_data[key]["total"] += 1
        location_data[key]["risk_scores"].append(txn.get("risk_score", 0))
        
        risk_level = txn.get("risk_level", "green")
        if risk_level == "red":
            location_data[key]["high_risk"] += 1
        elif risk_level == "amber":
            location_data[key]["medium_risk"] += 1
        else:
            location_data[key]["low_risk"] += 1
    
    # Calculate averages
    result = []
    for key, data in location_data.items():
        data["avg_risk_score"] = sum(data["risk_scores"]) / len(data["risk_scores"]) if data["risk_scores"] else 0
        del data["risk_scores"]
        result.append(data)
    
    return result

@api_router.get("/admin/heatmap/temporal")
async def get_temporal_heatmap(user: dict = Depends(require_auth(["admin"]))):
    """Get time-based heatmap data showing patterns by hour and day"""
    transactions = await db.transactions.find({}, {"_id": 0, "created_at": 1, "risk_level": 1, "risk_score": 1}).to_list(1000)
    
    # Initialize 7x24 grid (days x hours)
    heatmap = [[{"count": 0, "risk_sum": 0, "high_risk": 0} for _ in range(24)] for _ in range(7)]
    
    for txn in transactions:
        created_at = txn.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            day = created_at.weekday()  # 0=Monday, 6=Sunday
            hour = created_at.hour
            
            heatmap[day][hour]["count"] += 1
            heatmap[day][hour]["risk_sum"] += txn.get("risk_score", 0)
            if txn.get("risk_level") == "red":
                heatmap[day][hour]["high_risk"] += 1
    
    # Format for frontend
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    result = []
    
    for day_idx, day_data in enumerate(heatmap):
        for hour, cell in enumerate(day_data):
            avg_risk = cell["risk_sum"] / cell["count"] if cell["count"] > 0 else 0
            result.append({
                "day": days[day_idx],
                "day_index": day_idx,
                "hour": hour,
                "hour_label": f"{hour:02d}:00",
                "count": cell["count"],
                "avg_risk": round(avg_risk, 1),
                "high_risk_count": cell["high_risk"],
                "intensity": min(100, cell["count"] * 10)  # Normalize for visualization
            })
    
    return result

# ============== LICENSE EXPIRY ALERTS ==============

@api_router.get("/citizen/license-alerts")
async def get_license_alerts(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get license expiry alerts and renewal reminders"""
    profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not profile:
        return {"alerts": [], "status": "no_profile"}
    
    alerts = []
    expiry = profile.get("license_expiry")
    
    if expiry:
        if isinstance(expiry, str):
            expiry = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        
        days_until_expiry = (expiry - datetime.now(timezone.utc)).days
        
        if days_until_expiry < 0:
            alerts.append({
                "type": "expired",
                "severity": "critical",
                "title": "License Expired",
                "message": f"Your license expired {abs(days_until_expiry)} days ago. Renew immediately to continue using AEGIS.",
                "action": "renew_now",
                "days": days_until_expiry
            })
        elif days_until_expiry <= 7:
            alerts.append({
                "type": "expiring_soon",
                "severity": "urgent",
                "title": "License Expiring Soon",
                "message": f"Your license expires in {days_until_expiry} days. Renew now to avoid service interruption.",
                "action": "renew_soon",
                "days": days_until_expiry
            })
        elif days_until_expiry <= 30:
            alerts.append({
                "type": "expiring",
                "severity": "warning",
                "title": "License Renewal Reminder",
                "message": f"Your license expires in {days_until_expiry} days. Consider renewing early for bonus points!",
                "action": "renew_early",
                "days": days_until_expiry
            })
        elif days_until_expiry <= 90:
            alerts.append({
                "type": "reminder",
                "severity": "info",
                "title": "Upcoming Renewal",
                "message": f"Your license expires in {days_until_expiry} days. Renew early to earn the 'Proactive' badge!",
                "action": "plan_renewal",
                "days": days_until_expiry
            })
    
    # Check compliance score alerts
    compliance_score = profile.get("compliance_score", 100)
    if compliance_score < 70:
        alerts.append({
            "type": "compliance",
            "severity": "warning",
            "title": "Low Compliance Score",
            "message": f"Your compliance score is {compliance_score}%. Improve it to maintain full access.",
            "action": "improve_compliance",
            "score": compliance_score
        })
    
    return {
        "alerts": alerts,
        "license_expiry": profile.get("license_expiry"),
        "compliance_score": compliance_score,
        "days_until_expiry": days_until_expiry if expiry else None
    }

@api_router.get("/admin/expiring-licenses")
async def get_expiring_licenses(days: int = 30, user: dict = Depends(require_auth(["admin"]))):
    """Get all licenses expiring within specified days"""
    cutoff_date = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    
    expiring = await db.citizen_profiles.find(
        {"license_expiry": {"$lte": cutoff_date}},
        {"_id": 0}
    ).to_list(1000)
    
    # Categorize by urgency
    expired = []
    critical = []  # < 7 days
    warning = []   # 7-30 days
    
    for profile in expiring:
        expiry = profile.get("license_expiry")
        if expiry:
            if isinstance(expiry, str):
                expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
            else:
                expiry_dt = expiry
            if expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
            
            days_left = (expiry_dt - datetime.now(timezone.utc)).days
            profile["days_until_expiry"] = days_left
            
            if days_left < 0:
                expired.append(serialize_doc(profile))
            elif days_left <= 7:
                critical.append(serialize_doc(profile))
            else:
                warning.append(serialize_doc(profile))
    
    return {
        "expired": expired,
        "critical": critical,
        "warning": warning,
        "total": len(expiring)
    }

# ============== GOVERNMENT ANALYTICS & OVERSIGHT ==============

@api_router.get("/government/analytics/revenue")
async def get_revenue_analytics(user: dict = Depends(require_auth(["admin"]))):
    """Get comprehensive revenue analytics by type and region"""
    # Aggregate revenue by type
    revenue_by_type = {}
    revenue_by_region = {}
    revenue_trends = []
    
    # Get all revenue records
    revenues = await db.revenue_records.find({}, {"_id": 0}).to_list(10000)
    
    for rev in revenues:
        rev_type = rev.get("type", "other")
        region = rev.get("region", "unknown")
        amount = rev.get("amount", 0)
        
        revenue_by_type[rev_type] = revenue_by_type.get(rev_type, 0) + amount
        revenue_by_region[region] = revenue_by_region.get(region, 0) + amount
    
    # Get monthly trends (last 12 months)
    for i in range(12):
        month_start = datetime.now(timezone.utc).replace(day=1) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=30)
        month_revenues = [r for r in revenues if month_start.isoformat() <= r.get("created_at", "") < month_end.isoformat()]
        revenue_trends.insert(0, {
            "month": month_start.strftime("%b"),
            "total": sum(r.get("amount", 0) for r in month_revenues),
            "course_fees": sum(r.get("amount", 0) for r in month_revenues if r.get("type") == "course_fee"),
            "license_fees": sum(r.get("amount", 0) for r in month_revenues if r.get("type") in ["license_fee", "renewal_fee"]),
            "membership_fees": sum(r.get("amount", 0) for r in month_revenues if r.get("type") == "membership_fee"),
        })
    
    total_revenue = sum(revenue_by_type.values())
    
    return {
        "total_revenue": total_revenue,
        "by_type": revenue_by_type,
        "by_region": revenue_by_region,
        "trends": revenue_trends[-6:],  # Last 6 months
        "type_breakdown": [
            {"name": "Course Fees", "value": revenue_by_type.get("course_fee", 0), "color": "hsl(160, 84%, 39%)"},
            {"name": "License Fees", "value": revenue_by_type.get("license_fee", 0) + revenue_by_type.get("renewal_fee", 0), "color": "hsl(217, 91%, 60%)"},
            {"name": "Membership Fees", "value": revenue_by_type.get("membership_fee", 0), "color": "hsl(262, 83%, 58%)"},
            {"name": "Certification Fees", "value": revenue_by_type.get("certification_fee", 0), "color": "hsl(47, 96%, 53%)"},
            {"name": "Penalty Fees", "value": revenue_by_type.get("penalty_fee", 0), "color": "hsl(0, 84%, 60%)"},
        ]
    }

@api_router.get("/government/analytics/training")
async def get_training_analytics(user: dict = Depends(require_auth(["admin"]))):
    """Get training compliance and participation analytics"""
    # Get all courses
    courses = await db.training_courses.find({"status": "active"}, {"_id": 0}).to_list(1000)
    enrollments = await db.course_enrollments.find({}, {"_id": 0}).to_list(10000)
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    total_citizens = len(citizens)
    compulsory_courses = [c for c in courses if c.get("is_compulsory")]
    
    # Calculate compliance rates
    compliance_by_region = {}
    for region in REGIONS:
        region_citizens = [c for c in citizens if c.get("region", "northeast").lower() == region]
        region_enrollments = [e for e in enrollments if e.get("status") == "completed"]
        
        if len(region_citizens) > 0:
            # For each compulsory course, check how many have completed
            completed_count = 0
            for course in compulsory_courses:
                course_completions = [e for e in region_enrollments if e.get("course_id") == course.get("course_id")]
                completed_count += len(course_completions)
            
            total_required = len(region_citizens) * len(compulsory_courses) if compulsory_courses else 1
            compliance_rate = min(100, (completed_count / total_required) * 100) if total_required > 0 else 100
        else:
            compliance_rate = 100
            
        compliance_by_region[region] = round(compliance_rate, 1)
    
    # Enrollment stats
    total_enrollments = len(enrollments)
    completed_enrollments = len([e for e in enrollments if e.get("status") == "completed"])
    in_progress_enrollments = len([e for e in enrollments if e.get("status") in ["enrolled", "in_progress"]])
    overdue_enrollments = len([e for e in enrollments if e.get("status") == "expired"])
    
    # Course popularity
    course_stats = []
    for course in courses:
        course_enrollments = [e for e in enrollments if e.get("course_id") == course.get("course_id")]
        course_stats.append({
            "course_id": course.get("course_id"),
            "name": course.get("name"),
            "region": course.get("region"),
            "is_compulsory": course.get("is_compulsory"),
            "enrollments": len(course_enrollments),
            "completions": len([e for e in course_enrollments if e.get("status") == "completed"]),
            "revenue": sum(e.get("amount_paid", 0) for e in course_enrollments)
        })
    
    return {
        "total_courses": len(courses),
        "compulsory_courses": len(compulsory_courses),
        "total_enrollments": total_enrollments,
        "completed": completed_enrollments,
        "in_progress": in_progress_enrollments,
        "overdue": overdue_enrollments,
        "completion_rate": round((completed_enrollments / total_enrollments * 100) if total_enrollments > 0 else 0, 1),
        "compliance_by_region": compliance_by_region,
        "course_stats": sorted(course_stats, key=lambda x: x["enrollments"], reverse=True)[:10]
    }

@api_router.get("/government/analytics/dealers")
async def get_dealer_analytics(user: dict = Depends(require_auth(["admin"]))):
    """Get dealer activity and compliance analytics"""
    dealers = await db.dealer_profiles.find({}, {"_id": 0}).to_list(1000)
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    # Dealer activity ranking
    dealer_stats = []
    for dealer in dealers:
        dealer_id = dealer.get("dealer_id") or dealer.get("user_id")
        dealer_txns = [t for t in transactions if t.get("dealer_id") == dealer_id]
        
        # Count firearms vs ammunition
        firearm_count = sum(t.get("quantity", 0) for t in dealer_txns if t.get("item_type") == "firearm")
        ammo_count = sum(t.get("quantity", 0) for t in dealer_txns if t.get("item_type") == "ammunition")
        
        # Calculate average risk
        avg_risk = sum(t.get("risk_score", 0) for t in dealer_txns) / len(dealer_txns) if dealer_txns else 0
        
        dealer_stats.append({
            "dealer_id": dealer_id,
            "business_name": dealer.get("business_name", "Unknown"),
            "region": dealer.get("region", "northeast"),
            "total_transactions": len(dealer_txns),
            "firearm_sales": firearm_count,
            "ammunition_sales": ammo_count,
            "avg_risk_score": round(avg_risk, 1),
            "compliance_score": dealer.get("compliance_score", 100),
            "license_status": dealer.get("license_status", "active")
        })
    
    # Regional distribution
    dealer_by_region = {}
    for region in REGIONS:
        dealer_by_region[region] = len([d for d in dealer_stats if d.get("region", "").lower() == region])
    
    # Top dealers by volume
    top_by_volume = sorted(dealer_stats, key=lambda x: x["total_transactions"], reverse=True)[:10]
    
    # High risk dealers (avg risk > 40 or compliance < 80)
    flagged_dealers = [d for d in dealer_stats if d["avg_risk_score"] > 40 or d["compliance_score"] < 80]
    
    return {
        "total_dealers": len(dealers),
        "active_dealers": len([d for d in dealers if d.get("license_status") == "active"]),
        "by_region": dealer_by_region,
        "top_by_volume": top_by_volume,
        "flagged_dealers": flagged_dealers,
        "total_firearm_sales": sum(d["firearm_sales"] for d in dealer_stats),
        "total_ammunition_sales": sum(d["ammunition_sales"] for d in dealer_stats)
    }

@api_router.get("/government/analytics/compliance")
async def get_compliance_analytics(user: dict = Depends(require_auth(["admin"]))):
    """Get citizen compliance and ARI distribution analytics"""
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    responsibility_profiles = await db.responsibility_profile.find({}, {"_id": 0}).to_list(10000)
    
    # ARI score distribution
    ari_distribution = {"sentinel": 0, "guardian": 0, "elite_custodian": 0}
    ari_by_region = {}
    
    for region in REGIONS:
        ari_by_region[region] = {"total": 0, "avg_ari": 0, "citizens": 0}
    
    for citizen in citizens:
        user_id = citizen.get("user_id")
        resp_profile = next((r for r in responsibility_profiles if r.get("user_id") == user_id), None)
        
        ari_score = resp_profile.get("ari_score", 40) if resp_profile else 40
        region = citizen.get("region", "northeast").lower()
        
        # Tier distribution
        if ari_score >= 85:
            ari_distribution["elite_custodian"] += 1
        elif ari_score >= 60:
            ari_distribution["guardian"] += 1
        else:
            ari_distribution["sentinel"] += 1
        
        # Regional average
        if region in ari_by_region:
            ari_by_region[region]["total"] += ari_score
            ari_by_region[region]["citizens"] += 1
    
    # Calculate averages
    for region in ari_by_region:
        if ari_by_region[region]["citizens"] > 0:
            ari_by_region[region]["avg_ari"] = round(
                ari_by_region[region]["total"] / ari_by_region[region]["citizens"], 1
            )
    
    # License renewal rates
    total_licenses = len(citizens)
    active_licenses = len([c for c in citizens if c.get("license_status") == "active"])
    expired_licenses = len([c for c in citizens if c.get("license_status") == "expired"])
    suspended_licenses = len([c for c in citizens if c.get("license_status") == "suspended"])
    
    # Expiring soon (next 30 days)
    now = datetime.now(timezone.utc)
    expiring_soon = 0
    for citizen in citizens:
        expiry = citizen.get("license_expiry")
        if expiry:
            if isinstance(expiry, str):
                try:
                    expiry = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                except:
                    continue
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            days_left = (expiry - now).days
            if 0 < days_left <= 30:
                expiring_soon += 1
    
    return {
        "total_citizens": len(citizens),
        "tier_distribution": ari_distribution,
        "ari_by_region": ari_by_region,
        "license_stats": {
            "total": total_licenses,
            "active": active_licenses,
            "expired": expired_licenses,
            "suspended": suspended_licenses,
            "expiring_soon": expiring_soon,
            "renewal_rate": round((active_licenses / total_licenses * 100) if total_licenses > 0 else 0, 1)
        }
    }

# ============== ALERT & INTERVENTION SYSTEM ==============

@api_router.get("/government/alerts/dashboard")
async def get_alerts_dashboard(
    severity: str = None,
    category: str = None,
    region: str = None,
    status: str = None,
    time_period: str = "30d",
    user: dict = Depends(require_auth(["admin"]))
):
    """Comprehensive alerts dashboard with analytics and filters"""
    
    # Get total citizen count for percentage calculations
    total_citizens = await db.citizen_profiles.count_documents({})
    total_citizens = max(total_citizens, 1)  # Prevent division by zero
    
    # Time period calculations
    now = datetime.now(timezone.utc)
    time_filters = {
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
        "all": timedelta(days=3650)
    }
    time_delta = time_filters.get(time_period, timedelta(days=30))
    period_start = (now - time_delta).isoformat()
    
    # Previous period for trend comparison
    prev_period_start = (now - time_delta * 2).isoformat()
    prev_period_end = period_start
    
    # Build query filters
    query = {}
    if severity:
        query["severity"] = severity
    if category:
        query["trigger_reason"] = category
    if status:
        query["status"] = status
    else:
        query["status"] = {"$in": ["active", "acknowledged"]}
    
    # Get all alerts for current period
    all_alerts = await db.member_alerts.find(
        {"created_at": {"$gte": period_start}, **{k: v for k, v in query.items() if k != "status"}},
        {"_id": 0}
    ).to_list(10000)
    
    # Get resolved alerts for resolution metrics
    resolved_alerts = await db.member_alerts.find(
        {"status": "resolved", "resolved_at": {"$gte": period_start}},
        {"_id": 0}
    ).to_list(10000)
    
    # Get previous period alerts for trend comparison
    prev_alerts = await db.member_alerts.find(
        {"created_at": {"$gte": prev_period_start, "$lt": prev_period_end}},
        {"_id": 0}
    ).to_list(10000)
    
    # Get active alerts with filters
    active_query = {**query}
    if "status" not in query or query["status"] == {"$in": ["active", "acknowledged"]}:
        active_query["status"] = {"$in": ["active", "acknowledged"]}
    
    active_alerts = await db.member_alerts.find(
        active_query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Filter by region if specified (need to join with citizen profiles)
    if region:
        region_users = await db.citizen_profiles.find(
            {"region": {"$regex": region, "$options": "i"}},
            {"_id": 0, "user_id": 1}
        ).to_list(10000)
        region_user_ids = {u["user_id"] for u in region_users}
        active_alerts = [a for a in active_alerts if a.get("user_id") in region_user_ids]
        all_alerts = [a for a in all_alerts if a.get("user_id") in region_user_ids]
    
    # === PERCENTAGE-BASED METRICS ===
    unique_flagged_users = len(set(a.get("user_id") for a in active_alerts))
    alert_rate_percentage = round((unique_flagged_users / total_citizens) * 100, 4)
    alert_rate_per_10k = round((unique_flagged_users / total_citizens) * 10000, 2)
    
    # === TREND ANALYSIS ===
    current_period_count = len(all_alerts)
    prev_period_count = len(prev_alerts)
    
    if prev_period_count > 0:
        trend_percentage = round(((current_period_count - prev_period_count) / prev_period_count) * 100, 1)
    else:
        trend_percentage = 100 if current_period_count > 0 else 0
    
    # Resolution velocity
    new_this_period = len(all_alerts)
    resolved_this_period = len(resolved_alerts)
    resolution_velocity = resolved_this_period - new_this_period  # Positive = resolving faster
    
    # Average resolution time (in hours)
    resolution_times = []
    for alert in resolved_alerts:
        created = alert.get("created_at")
        resolved = alert.get("resolved_at")
        if created and resolved:
            try:
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00')) if isinstance(created, str) else created
                resolved_dt = datetime.fromisoformat(resolved.replace('Z', '+00:00')) if isinstance(resolved, str) else resolved
                hours = (resolved_dt - created_dt).total_seconds() / 3600
                resolution_times.append(hours)
            except:
                pass
    avg_resolution_hours = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
    
    # === CATEGORY BREAKDOWN ===
    category_counts = {}
    for alert in active_alerts:
        cat = alert.get("trigger_reason", "other")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    total_active = len(active_alerts)
    category_breakdown = []
    category_colors = {
        "compliance_drop": "#EF4444",
        "compulsory_training_missed": "#F59E0B", 
        "suspicious_activity": "#DC2626",
        "threshold_breach": "#8B5CF6",
        "license_issue": "#3B82F6",
        "other": "#6B7280"
    }
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        category_breakdown.append({
            "category": cat.replace("_", " ").title(),
            "category_id": cat,
            "count": count,
            "percentage": round((count / total_active) * 100, 1) if total_active > 0 else 0,
            "color": category_colors.get(cat, "#6B7280")
        })
    
    # === REGIONAL HEAT MAP ===
    # Get citizens by region
    citizens_by_region = {}
    for region_name in REGIONS:
        count = await db.citizen_profiles.count_documents({"region": {"$regex": region_name, "$options": "i"}})
        citizens_by_region[region_name] = count
    
    # Get alerts by region
    alerts_by_region = {}
    for alert in active_alerts:
        user_id = alert.get("user_id")
        citizen = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0, "region": 1})
        if citizen:
            region_name = citizen.get("region", "unknown").lower()
            alerts_by_region[region_name] = alerts_by_region.get(region_name, 0) + 1
    
    regional_heat_map = []
    for region_name in REGIONS:
        region_citizens = citizens_by_region.get(region_name, 1) or 1
        region_alerts = alerts_by_region.get(region_name, 0)
        alert_rate = round((region_alerts / region_citizens) * 10000, 2)  # per 10k
        
        # Determine health status
        if alert_rate > 50:
            health = "critical"
        elif alert_rate > 20:
            health = "warning"
        elif alert_rate > 5:
            health = "elevated"
        else:
            health = "healthy"
        
        regional_heat_map.append({
            "region": region_name.title(),
            "region_id": region_name,
            "total_citizens": region_citizens,
            "active_alerts": region_alerts,
            "alert_rate_per_10k": alert_rate,
            "health_status": health
        })
    
    # === ALERT AGING & PRIORITY QUEUE ===
    priority_queue = {
        "critical_over_24h": [],
        "high_over_48h": [],
        "unacknowledged_critical": [],
        "oldest_unresolved": []
    }
    
    for alert in active_alerts:
        created = alert.get("created_at")
        if created:
            try:
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00')) if isinstance(created, str) else created
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                age_hours = (now - created_dt).total_seconds() / 3600
                alert["age_hours"] = round(age_hours, 1)
                
                severity = alert.get("severity")
                status = alert.get("status")
                
                if severity == "critical" and age_hours > 24:
                    priority_queue["critical_over_24h"].append(serialize_doc(alert))
                if severity == "high" and age_hours > 48:
                    priority_queue["high_over_48h"].append(serialize_doc(alert))
                if severity == "critical" and status == "active":
                    priority_queue["unacknowledged_critical"].append(serialize_doc(alert))
            except:
                alert["age_hours"] = 0
    
    # Oldest unresolved (top 5)
    sorted_by_age = sorted(active_alerts, key=lambda x: x.get("age_hours", 0), reverse=True)
    priority_queue["oldest_unresolved"] = [serialize_doc(a) for a in sorted_by_age[:5]]
    
    # === RISK SCORING SUMMARY ===
    # Citizens in watch status (low ARI or high risk)
    watch_citizens = await db.citizen_profiles.find(
        {"$or": [{"compliance_score": {"$lt": 50}}, {"license_status": "suspended"}]},
        {"_id": 0}
    ).to_list(1000)
    
    # Citizens approaching threshold (50-60 compliance)
    approaching_threshold = await db.citizen_profiles.count_documents(
        {"compliance_score": {"$gte": 40, "$lt": 60}}
    )
    
    # === SEVERITY BREAKDOWN ===
    by_severity = {
        "critical": len([a for a in active_alerts if a.get("severity") == "critical"]),
        "high": len([a for a in active_alerts if a.get("severity") == "high"]),
        "medium": len([a for a in active_alerts if a.get("severity") == "medium"]),
        "low": len([a for a in active_alerts if a.get("severity") == "low"])
    }
    
    # === RESOLUTION METRICS ===
    total_resolved_all_time = await db.member_alerts.count_documents({"status": "resolved"})
    total_alerts_all_time = await db.member_alerts.count_documents({})
    resolution_rate = round((total_resolved_all_time / total_alerts_all_time) * 100, 1) if total_alerts_all_time > 0 else 0
    
    return {
        "summary": {
            "total_active": total_active,
            "unique_flagged_users": unique_flagged_users,
            "total_citizens": total_citizens,
            "alert_rate_percentage": alert_rate_percentage,
            "alert_rate_per_10k": alert_rate_per_10k,
            "time_period": time_period
        },
        "trends": {
            "current_period": current_period_count,
            "previous_period": prev_period_count,
            "trend_percentage": trend_percentage,
            "trend_direction": "up" if trend_percentage > 0 else "down" if trend_percentage < 0 else "stable",
            "new_this_period": new_this_period,
            "resolved_this_period": resolved_this_period,
            "resolution_velocity": resolution_velocity,
            "avg_resolution_hours": avg_resolution_hours
        },
        "by_severity": by_severity,
        "by_category": category_breakdown,
        "regional_heat_map": sorted(regional_heat_map, key=lambda x: x["alert_rate_per_10k"], reverse=True),
        "priority_queue": {
            "critical_over_24h": len(priority_queue["critical_over_24h"]),
            "high_over_48h": len(priority_queue["high_over_48h"]),
            "unacknowledged_critical": len(priority_queue["unacknowledged_critical"]),
            "items": priority_queue
        },
        "risk_summary": {
            "citizens_in_watch": len(watch_citizens),
            "approaching_threshold": approaching_threshold,
            "watch_percentage": round((len(watch_citizens) / total_citizens) * 100, 2)
        },
        "resolution_metrics": {
            "total_resolved": total_resolved_all_time,
            "resolution_rate": resolution_rate,
            "avg_resolution_hours": avg_resolution_hours
        },
        "alerts": [serialize_doc(a) for a in active_alerts[:100]],
        "filters_applied": {
            "severity": severity,
            "category": category,
            "region": region,
            "status": status,
            "time_period": time_period
        }
    }

@api_router.get("/government/alerts/active")
async def get_active_alerts(user: dict = Depends(require_auth(["admin"]))):
    """Get all active alerts and red flags"""
    alerts = await db.member_alerts.find(
        {"status": {"$in": ["active", "acknowledged"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Categorize by severity
    critical = [a for a in alerts if a.get("severity") == "critical"]
    high = [a for a in alerts if a.get("severity") == "high"]
    medium = [a for a in alerts if a.get("severity") == "medium"]
    low = [a for a in alerts if a.get("severity") == "low"]
    
    return {
        "total_active": len(alerts),
        "by_severity": {
            "critical": len(critical),
            "high": len(high),
            "medium": len(medium),
            "low": len(low)
        },
        "alerts": [serialize_doc(a) for a in alerts[:50]],
        "critical_alerts": [serialize_doc(a) for a in critical[:10]]
    }

@api_router.post("/government/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Acknowledge an alert"""
    result = await db.member_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {"status": "acknowledged", "assigned_to": user["user_id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await create_audit_log("alert_acknowledged", user["user_id"], "admin", alert_id)
    return {"message": "Alert acknowledged"}

@api_router.post("/government/alerts/resolve/{alert_id}")
async def resolve_alert(alert_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Resolve an alert with notes"""
    body = await request.json()
    notes = body.get("notes", "")
    
    result = await db.member_alerts.update_one(
        {"alert_id": alert_id},
        {
            "$set": {
                "status": "resolved",
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": user["user_id"],
                "intervention_notes": notes
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await create_audit_log("alert_resolved", user["user_id"], "admin", alert_id, {"notes": notes})
    return {"message": "Alert resolved"}

@api_router.post("/government/alerts/intervene/{alert_id}")
async def intervene_member(alert_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Take intervention action on a member"""
    body = await request.json()
    action = body.get("action")  # block_license, suspend, warning, restrict_purchases
    notes = body.get("notes", "")
    
    alert = await db.member_alerts.find_one({"alert_id": alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    target_user_id = alert.get("user_id")
    
    # Execute intervention action
    if action == "block_license":
        await db.citizen_profiles.update_one(
            {"user_id": target_user_id},
            {"$set": {"license_status": "blocked", "blocked_reason": notes}}
        )
        # Create notification for user
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": target_user_id,
            "title": "License Blocked",
            "message": f"Your license has been blocked. Reason: {notes}. Please contact authorities.",
            "type": "alert",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    elif action == "suspend":
        await db.citizen_profiles.update_one(
            {"user_id": target_user_id},
            {"$set": {"license_status": "suspended", "suspended_reason": notes}}
        )
    elif action == "warning":
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": target_user_id,
            "title": "Official Warning",
            "message": notes,
            "type": "alert",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Update alert with action taken
    await db.member_alerts.update_one(
        {"alert_id": alert_id},
        {
            "$set": {
                "status": "resolved",
                "auto_action_taken": action,
                "intervention_notes": notes,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": user["user_id"]
            }
        }
    )
    
    await create_audit_log("intervention_executed", user["user_id"], "admin", target_user_id, {
        "alert_id": alert_id,
        "action": action,
        "notes": notes
    })
    
    return {"message": f"Intervention '{action}' executed successfully"}

@api_router.get("/government/alerts/thresholds")
async def get_alert_thresholds(user: dict = Depends(require_auth(["admin"]))):
    """Get configured alert thresholds"""
    thresholds = await db.alert_thresholds.find({}, {"_id": 0}).to_list(100)
    return {"thresholds": thresholds}

@api_router.post("/government/alerts/thresholds")
async def create_alert_threshold(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new alert threshold"""
    body = await request.json()
    threshold = AlertThreshold(**body)
    await db.alert_thresholds.insert_one(threshold.model_dump())
    
    await create_audit_log("threshold_created", user["user_id"], "admin", threshold.threshold_id)
    return {"message": "Threshold created", "threshold_id": threshold.threshold_id}

async def check_and_trigger_alerts():
    """Background task to check thresholds and trigger alerts"""
    thresholds = await db.alert_thresholds.find({"is_active": True}, {"_id": 0}).to_list(100)
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    for citizen in citizens:
        user_id = citizen.get("user_id")
        
        for threshold in thresholds:
            metric = threshold.get("metric")
            operator = threshold.get("operator")
            value = threshold.get("value")
            
            # Get actual metric value
            actual_value = 0
            if metric == "compliance_score":
                actual_value = citizen.get("compliance_score", 100)
            elif metric == "purchase_count_30d":
                thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
                txn_count = await db.transactions.count_documents({
                    "citizen_id": user_id,
                    "created_at": {"$gte": thirty_days_ago}
                })
                actual_value = txn_count
            
            # Check if threshold is breached
            breached = False
            if operator == "gt" and actual_value > value:
                breached = True
            elif operator == "lt" and actual_value < value:
                breached = True
            elif operator == "gte" and actual_value >= value:
                breached = True
            elif operator == "lte" and actual_value <= value:
                breached = True
            
            if breached:
                # Check if alert already exists
                existing = await db.member_alerts.find_one({
                    "user_id": user_id,
                    "threshold_type": metric,
                    "status": {"$in": ["active", "acknowledged"]}
                })
                
                if not existing:
                    alert = MemberAlert(
                        user_id=user_id,
                        alert_type="red_flag",
                        severity=threshold.get("severity", "medium"),
                        title=f"Threshold Breach: {threshold.get('name')}",
                        description=f"User breached {metric} threshold. Actual: {actual_value}, Threshold: {value}",
                        trigger_reason="threshold_breach",
                        threshold_type=metric,
                        threshold_value=value,
                        actual_value=actual_value
                    )
                    await db.member_alerts.insert_one(alert.model_dump())

# ============== PREDICTIVE ANALYTICS & AUTOMATED THRESHOLD ALERTS ==============

async def calculate_risk_prediction(user_id: str) -> dict:
    """Calculate predictive risk score for a citizen"""
    citizen = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not citizen:
        return None
    
    resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
    transactions = await db.transactions.find({"citizen_id": user_id}, {"_id": 0}).to_list(100)
    enrollments = await db.course_enrollments.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    
    # Current metrics
    current_compliance = citizen.get("compliance_score", 50)
    current_ari = resp_profile.get("ari_score", 40) if resp_profile else 40
    training_hours = resp_profile.get("training_hours", 0) if resp_profile else 0
    violations = resp_profile.get("violations", 0) if resp_profile else 0
    
    # Calculate historical trends (last 90 days)
    risk_factors = []
    recommendations = []
    trajectory_score = 0  # Positive = improving, negative = declining
    
    # Factor 1: Transaction frequency trend
    now = datetime.now(timezone.utc)
    recent_txns = [t for t in transactions if t.get("created_at", "") >= (now - timedelta(days=30)).isoformat()]
    older_txns = [t for t in transactions if (now - timedelta(days=60)).isoformat() <= t.get("created_at", "") < (now - timedelta(days=30)).isoformat()]
    
    if len(recent_txns) > len(older_txns) * 1.5:
        risk_factors.append({
            "factor": "purchase_frequency_increase",
            "description": "Purchase frequency increased by 50%+ in last 30 days",
            "impact": -10,
            "severity": "medium"
        })
        trajectory_score -= 10
        recommendations.append("Monitor purchase patterns closely")
    elif len(recent_txns) < len(older_txns) * 0.7:
        trajectory_score += 5  # Stable/decreasing is positive
    
    # Factor 2: Training completion
    completed_trainings = len([e for e in enrollments if e.get("status") == "completed"])
    overdue_trainings = len([e for e in enrollments if e.get("status") == "expired"])
    
    if overdue_trainings > 0:
        risk_factors.append({
            "factor": "training_overdue",
            "description": f"{overdue_trainings} training course(s) overdue",
            "impact": -15 * overdue_trainings,
            "severity": "high" if overdue_trainings > 1 else "medium"
        })
        trajectory_score -= 15 * overdue_trainings
        recommendations.append(f"Complete {overdue_trainings} overdue training course(s)")
    
    if training_hours < 10:
        risk_factors.append({
            "factor": "low_training_hours",
            "description": f"Only {training_hours} training hours logged",
            "impact": -5,
            "severity": "low"
        })
        trajectory_score -= 5
        recommendations.append("Enroll in additional safety training courses")
    
    # Factor 3: Compliance score trend
    if current_compliance < 50:
        risk_factors.append({
            "factor": "low_compliance",
            "description": f"Compliance score ({current_compliance}) below acceptable threshold",
            "impact": -20,
            "severity": "high"
        })
        trajectory_score -= 20
        recommendations.append("Take immediate steps to improve compliance score")
    elif current_compliance < 70:
        risk_factors.append({
            "factor": "moderate_compliance",
            "description": f"Compliance score ({current_compliance}) needs improvement",
            "impact": -5,
            "severity": "medium"
        })
        trajectory_score -= 5
        recommendations.append("Focus on improving compliance through training and safe practices")
    
    # Factor 4: Violations
    if violations > 0:
        risk_factors.append({
            "factor": "past_violations",
            "description": f"{violations} violation(s) on record",
            "impact": -10 * violations,
            "severity": "high" if violations > 2 else "medium"
        })
        trajectory_score -= 10 * violations
    
    # Factor 5: License expiry
    license_expiry = citizen.get("license_expiry")
    if license_expiry:
        if isinstance(license_expiry, str):
            try:
                license_expiry = datetime.fromisoformat(license_expiry.replace('Z', '+00:00'))
            except:
                license_expiry = None
        
        if license_expiry:
            if license_expiry.tzinfo is None:
                license_expiry = license_expiry.replace(tzinfo=timezone.utc)
            days_to_expiry = (license_expiry - now).days
            
            if days_to_expiry < 0:
                risk_factors.append({
                    "factor": "license_expired",
                    "description": "License has expired",
                    "impact": -30,
                    "severity": "critical"
                })
                trajectory_score -= 30
                recommendations.append("Renew license immediately")
            elif days_to_expiry < 30:
                risk_factors.append({
                    "factor": "license_expiring_soon",
                    "description": f"License expires in {days_to_expiry} days",
                    "impact": -10,
                    "severity": "medium"
                })
                trajectory_score -= 10
                recommendations.append(f"Renew license within {days_to_expiry} days")
    
    # Factor 6: Safe storage verification
    safe_storage = resp_profile.get("safe_storage_verified", False) if resp_profile else False
    if not safe_storage:
        risk_factors.append({
            "factor": "safe_storage_unverified",
            "description": "Safe storage not verified",
            "impact": -5,
            "severity": "low"
        })
        trajectory_score -= 5
        recommendations.append("Complete safe storage verification")
    
    # Calculate predicted risk score (30 days from now)
    base_risk = 100 - current_ari  # Lower ARI = higher risk
    predicted_risk = base_risk + trajectory_score
    predicted_risk = max(0, min(100, predicted_risk))  # Clamp to 0-100
    
    # Determine trajectory
    if trajectory_score >= 10:
        trajectory = "improving"
    elif trajectory_score >= 0:
        trajectory = "stable"
    elif trajectory_score >= -15:
        trajectory = "declining"
    else:
        trajectory = "critical_decline"
    
    # Calculate confidence based on data availability
    data_points = len(transactions) + len(enrollments) + (1 if resp_profile else 0)
    confidence = min(95, 50 + data_points * 2)
    
    return {
        "user_id": user_id,
        "current_risk_score": round(base_risk, 1),
        "predicted_risk_score": round(predicted_risk, 1),
        "risk_trajectory": trajectory,
        "trajectory_score": trajectory_score,
        "confidence": confidence,
        "risk_factors": risk_factors,
        "recommendations": recommendations,
        "current_metrics": {
            "compliance_score": current_compliance,
            "ari_score": current_ari,
            "training_hours": training_hours,
            "violations": violations,
            "recent_transactions": len(recent_txns)
        }
    }

@api_router.get("/government/predictive/citizen/{user_id}")
async def get_citizen_risk_prediction(user_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Get predictive risk analysis for a specific citizen"""
    prediction = await calculate_risk_prediction(user_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Citizen not found")
    
    # Store prediction
    pred_record = RiskPrediction(
        user_id=user_id,
        current_risk_score=prediction["current_risk_score"],
        predicted_risk_score=prediction["predicted_risk_score"],
        risk_trajectory=prediction["risk_trajectory"],
        confidence=prediction["confidence"],
        risk_factors=prediction["risk_factors"],
        recommendations=prediction["recommendations"]
    )
    await db.risk_predictions.insert_one(pred_record.model_dump())
    
    return prediction

@api_router.get("/government/predictive/dashboard")
async def get_predictive_analytics_dashboard(user: dict = Depends(require_auth(["admin"]))):
    """Get comprehensive predictive analytics dashboard"""
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    # Analyze all citizens
    predictions = []
    trajectory_counts = {"improving": 0, "stable": 0, "declining": 0, "critical_decline": 0}
    high_risk_citizens = []
    approaching_threshold = []
    risk_distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    
    for citizen in citizens:
        user_id = citizen.get("user_id")
        pred = await calculate_risk_prediction(user_id)
        if pred:
            predictions.append(pred)
            trajectory_counts[pred["risk_trajectory"]] = trajectory_counts.get(pred["risk_trajectory"], 0) + 1
            
            # Categorize by risk level
            risk_score = pred["predicted_risk_score"]
            if risk_score >= 70:
                risk_distribution["critical"] += 1
                high_risk_citizens.append({
                    "user_id": user_id,
                    "name": citizen.get("name", "Unknown"),
                    "risk_score": risk_score,
                    "trajectory": pred["risk_trajectory"],
                    "top_factors": pred["risk_factors"][:3]
                })
            elif risk_score >= 50:
                risk_distribution["high"] += 1
                if pred["risk_trajectory"] in ["declining", "critical_decline"]:
                    approaching_threshold.append({
                        "user_id": user_id,
                        "name": citizen.get("name", "Unknown"),
                        "current_score": pred["current_risk_score"],
                        "predicted_score": risk_score,
                        "trajectory": pred["risk_trajectory"],
                        "days_to_critical": int((70 - risk_score) / abs(pred["trajectory_score"] / 30)) if pred["trajectory_score"] < 0 else None
                    })
            elif risk_score >= 30:
                risk_distribution["medium"] += 1
            else:
                risk_distribution["low"] += 1
    
    # Common risk factors
    all_factors = []
    for pred in predictions:
        all_factors.extend([f["factor"] for f in pred.get("risk_factors", [])])
    
    factor_counts = {}
    for factor in all_factors:
        factor_counts[factor] = factor_counts.get(factor, 0) + 1
    
    common_factors = sorted(factor_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Regional risk analysis
    regional_risk = {}
    for pred in predictions:
        citizen = next((c for c in citizens if c.get("user_id") == pred["user_id"]), None)
        if citizen:
            region = citizen.get("region", "unknown").lower()
            if region not in regional_risk:
                regional_risk[region] = {"total": 0, "high_risk": 0, "declining": 0, "avg_score": 0}
            regional_risk[region]["total"] += 1
            regional_risk[region]["avg_score"] += pred["predicted_risk_score"]
            if pred["predicted_risk_score"] >= 50:
                regional_risk[region]["high_risk"] += 1
            if pred["risk_trajectory"] in ["declining", "critical_decline"]:
                regional_risk[region]["declining"] += 1
    
    for region in regional_risk:
        if regional_risk[region]["total"] > 0:
            regional_risk[region]["avg_score"] = round(regional_risk[region]["avg_score"] / regional_risk[region]["total"], 1)
    
    return {
        "summary": {
            "total_analyzed": len(predictions),
            "high_risk_count": risk_distribution["critical"] + risk_distribution["high"],
            "declining_count": trajectory_counts["declining"] + trajectory_counts["critical_decline"],
            "needs_intervention": len(high_risk_citizens)
        },
        "trajectory_distribution": trajectory_counts,
        "risk_distribution": risk_distribution,
        "high_risk_citizens": sorted(high_risk_citizens, key=lambda x: x["risk_score"], reverse=True)[:20],
        "approaching_threshold": sorted(approaching_threshold, key=lambda x: x.get("days_to_critical") or 999)[:15],
        "common_risk_factors": [{"factor": f[0].replace("_", " ").title(), "count": f[1], "percentage": round(f[1] / len(predictions) * 100, 1)} for f in common_factors],
        "regional_analysis": regional_risk
    }

@api_router.post("/government/predictive/run-analysis")
async def run_predictive_analysis(user: dict = Depends(require_auth(["admin"]))):
    """Run predictive analysis for all citizens and generate warnings"""
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    warnings_generated = 0
    alerts_generated = 0
    
    for citizen in citizens:
        user_id = citizen.get("user_id")
        pred = await calculate_risk_prediction(user_id)
        
        if not pred:
            continue
        
        # Check if warning needed based on trajectory
        if pred["risk_trajectory"] in ["declining", "critical_decline"]:
            # Check for existing active warning
            existing_warning = await db.preventive_warnings.find_one({
                "user_id": user_id,
                "status": "pending",
                "warning_type": "compliance_declining"
            })
            
            if not existing_warning:
                # Create preventive warning
                warning_message = "Your compliance score is trending downward. "
                if pred["risk_trajectory"] == "critical_decline":
                    warning_message += "Immediate action is recommended to avoid license restrictions."
                else:
                    warning_message += "Consider completing additional training to improve your score."
                
                warning = PreventiveWarning(
                    user_id=user_id,
                    warning_type="compliance_declining",
                    current_value=pred["current_risk_score"],
                    threshold_value=70,  # Critical threshold
                    days_to_threshold=pred.get("days_to_critical"),
                    message=warning_message,
                    action_required="improve_compliance"
                )
                await db.preventive_warnings.insert_one(warning.model_dump())
                
                # Create notification for user
                await db.notifications.insert_one({
                    "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "title": "Compliance Score Alert",
                    "message": warning_message,
                    "type": "warning",
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                warnings_generated += 1
        
        # Generate alerts for critical predictions
        if pred["predicted_risk_score"] >= 70 and pred["risk_trajectory"] == "critical_decline":
            existing_alert = await db.member_alerts.find_one({
                "user_id": user_id,
                "status": {"$in": ["active", "acknowledged"]},
                "trigger_reason": "predictive_high_risk"
            })
            
            if not existing_alert:
                alert = MemberAlert(
                    user_id=user_id,
                    alert_type="red_flag",
                    severity="high",
                    title="Predictive Risk Alert",
                    description=f"Citizen predicted to reach critical risk level. Current: {pred['current_risk_score']}, Predicted: {pred['predicted_risk_score']}. Trajectory: {pred['risk_trajectory']}",
                    trigger_reason="predictive_high_risk",
                    threshold_type="predicted_risk_score",
                    threshold_value=70,
                    actual_value=pred["predicted_risk_score"]
                )
                await db.member_alerts.insert_one(alert.model_dump())
                alerts_generated += 1
    
    await create_audit_log("predictive_analysis_run", user["user_id"], "admin", None, {
        "citizens_analyzed": len(citizens),
        "warnings_generated": warnings_generated,
        "alerts_generated": alerts_generated
    })
    
    return {
        "message": "Predictive analysis completed",
        "citizens_analyzed": len(citizens),
        "warnings_generated": warnings_generated,
        "alerts_generated": alerts_generated
    }

# ============== AUTOMATED THRESHOLD MONITORING ==============

@api_router.get("/government/thresholds")
async def get_all_thresholds(user: dict = Depends(require_auth(["admin"]))):
    """Get all configured thresholds"""
    thresholds = await db.alert_thresholds.find({}, {"_id": 0}).to_list(100)
    return {"thresholds": [serialize_doc(t) for t in thresholds]}

@api_router.post("/government/thresholds")
async def create_threshold(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new alert threshold"""
    body = await request.json()
    threshold = AlertThreshold(**body)
    await db.alert_thresholds.insert_one(threshold.model_dump())
    
    await create_audit_log("threshold_created", user["user_id"], "admin", threshold.threshold_id, body)
    return {"message": "Threshold created", "threshold_id": threshold.threshold_id}

@api_router.put("/government/thresholds/{threshold_id}")
async def update_threshold(threshold_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update an existing threshold"""
    body = await request.json()
    body.pop("threshold_id", None)
    body.pop("created_at", None)
    
    result = await db.alert_thresholds.update_one(
        {"threshold_id": threshold_id},
        {"$set": body}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Threshold not found")
    
    await create_audit_log("threshold_updated", user["user_id"], "admin", threshold_id, body)
    return {"message": "Threshold updated"}

@api_router.delete("/government/thresholds/{threshold_id}")
async def delete_threshold(threshold_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Delete a threshold"""
    result = await db.alert_thresholds.delete_one({"threshold_id": threshold_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Threshold not found")
    
    await create_audit_log("threshold_deleted", user["user_id"], "admin", threshold_id)
    return {"message": "Threshold deleted"}

@api_router.post("/government/thresholds/run-check")
async def run_threshold_check(user: dict = Depends(require_auth(["admin"]))):
    """Run threshold check for all citizens"""
    thresholds = await db.alert_thresholds.find({"is_active": True}, {"_id": 0}).to_list(100)
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    warnings_sent = 0
    alerts_created = 0
    actions_taken = 0
    
    for citizen in citizens:
        user_id = citizen.get("user_id")
        resp_profile = await db.responsibility_profile.find_one({"user_id": user_id}, {"_id": 0})
        
        for threshold in thresholds:
            metric = threshold.get("metric")
            operator = threshold.get("operator")
            critical_value = threshold.get("value")
            warning_value = threshold.get("warning_value")
            auto_action = threshold.get("auto_action")
            
            # Get actual metric value
            actual_value = 0
            if metric == "compliance_score":
                actual_value = citizen.get("compliance_score", 100)
            elif metric == "ari_score":
                actual_value = resp_profile.get("ari_score", 50) if resp_profile else 50
            elif metric == "training_hours":
                actual_value = resp_profile.get("training_hours", 0) if resp_profile else 0
            elif metric == "violations":
                actual_value = resp_profile.get("violations", 0) if resp_profile else 0
            elif metric == "purchase_count_30d":
                thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
                txn_count = await db.transactions.count_documents({
                    "citizen_id": user_id,
                    "created_at": {"$gte": thirty_days_ago}
                })
                actual_value = txn_count
            
            # Check if approaching warning threshold (preventive)
            warning_breached = False
            critical_breached = False
            
            if warning_value is not None:
                if operator in ["lt", "lte"]:
                    warning_breached = actual_value <= warning_value and actual_value > critical_value
                    critical_breached = actual_value <= critical_value
                elif operator in ["gt", "gte"]:
                    warning_breached = actual_value >= warning_value and actual_value < critical_value
                    critical_breached = actual_value >= critical_value
            else:
                if operator == "gt":
                    critical_breached = actual_value > critical_value
                elif operator == "lt":
                    critical_breached = actual_value < critical_value
                elif operator == "gte":
                    critical_breached = actual_value >= critical_value
                elif operator == "lte":
                    critical_breached = actual_value <= critical_value
            
            # Send preventive warning
            if warning_breached and auto_action == "send_preventive_warning":
                existing_warning = await db.preventive_warnings.find_one({
                    "user_id": user_id,
                    "warning_type": f"threshold_{metric}",
                    "status": "pending"
                })
                
                if not existing_warning:
                    custom_message = threshold.get("notification_message") or f"Your {metric.replace('_', ' ')} is approaching a critical threshold. Current: {actual_value}, Warning level: {warning_value}"
                    
                    warning = PreventiveWarning(
                        user_id=user_id,
                        warning_type=f"threshold_{metric}",
                        current_value=actual_value,
                        threshold_value=critical_value,
                        message=custom_message,
                        action_required="improve_metric"
                    )
                    await db.preventive_warnings.insert_one(warning.model_dump())
                    
                    # Notify user
                    await db.notifications.insert_one({
                        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                        "user_id": user_id,
                        "title": f"Warning: {threshold.get('name', 'Threshold Alert')}",
                        "message": custom_message,
                        "type": "warning",
                        "read": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    warnings_sent += 1
            
            # Take action on critical breach
            if critical_breached:
                existing_alert = await db.member_alerts.find_one({
                    "user_id": user_id,
                    "threshold_type": metric,
                    "status": {"$in": ["active", "acknowledged"]}
                })
                
                if not existing_alert:
                    alert = MemberAlert(
                        user_id=user_id,
                        alert_type="red_flag",
                        severity=threshold.get("severity", "medium"),
                        title=f"Threshold Breach: {threshold.get('name')}",
                        description=f"User breached {metric} threshold. Actual: {actual_value}, Threshold: {critical_value}",
                        trigger_reason="threshold_breach",
                        threshold_type=metric,
                        threshold_value=critical_value,
                        actual_value=actual_value
                    )
                    await db.member_alerts.insert_one(alert.model_dump())
                    alerts_created += 1
                    
                    # Execute auto action
                    if auto_action == "block_license":
                        await db.citizen_profiles.update_one(
                            {"user_id": user_id},
                            {"$set": {"license_status": "blocked", "blocked_reason": f"Automatic block: {metric} threshold breach"}}
                        )
                        actions_taken += 1
                    elif auto_action == "warn":
                        await db.notifications.insert_one({
                            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                            "user_id": user_id,
                            "title": "Critical Alert",
                            "message": f"Your {metric.replace('_', ' ')} has reached a critical level. Please take immediate action to avoid license restrictions.",
                            "type": "alert",
                            "read": False,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
                        actions_taken += 1
    
    await create_audit_log("threshold_check_run", user["user_id"], "admin", None, {
        "thresholds_checked": len(thresholds),
        "citizens_checked": len(citizens),
        "warnings_sent": warnings_sent,
        "alerts_created": alerts_created,
        "actions_taken": actions_taken
    })
    
    return {
        "message": "Threshold check completed",
        "thresholds_checked": len(thresholds),
        "citizens_checked": len(citizens),
        "warnings_sent": warnings_sent,
        "alerts_created": alerts_created,
        "auto_actions_taken": actions_taken
    }

@api_router.get("/government/preventive-warnings")
async def get_preventive_warnings(status: str = None, user: dict = Depends(require_auth(["admin"]))):
    """Get all preventive warnings"""
    query = {}
    if status:
        query["status"] = status
    
    warnings = await db.preventive_warnings.find(query, {"_id": 0}).sort("sent_at", -1).to_list(500)
    return {"warnings": [serialize_doc(w) for w in warnings]}

@api_router.get("/citizen/my-warnings")
async def get_my_warnings(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get current user's preventive warnings"""
    warnings = await db.preventive_warnings.find(
        {"user_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(50)
    
    return {"warnings": [serialize_doc(w) for w in warnings]}

@api_router.post("/citizen/acknowledge-warning/{warning_id}")
async def acknowledge_warning(warning_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Acknowledge a preventive warning"""
    result = await db.preventive_warnings.update_one(
        {"warning_id": warning_id, "user_id": user["user_id"]},
        {"$set": {"status": "acknowledged", "acknowledged_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Warning not found or not authorized")
    
    return {"message": "Warning acknowledged"}

# ============== COURSE MANAGEMENT ==============

@api_router.get("/government/courses")
async def get_all_courses(user: dict = Depends(require_auth(["admin"]))):
    """Get all training courses"""
    courses = await db.training_courses.find({}, {"_id": 0}).to_list(1000)
    return {"courses": [serialize_doc(c) for c in courses]}

@api_router.post("/government/courses")
async def create_course(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new training course"""
    body = await request.json()
    course = TrainingCourse(**body)
    
    await db.training_courses.insert_one(course.model_dump())
    
    # If compulsory, create notifications for all citizens in the region
    if course.is_compulsory:
        if course.region == "national":
            citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
        else:
            citizens = await db.citizen_profiles.find(
                {"region": {"$regex": course.region, "$options": "i"}},
                {"_id": 0}
            ).to_list(10000)
        
        notifications = []
        for citizen in citizens:
            notifications.append({
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": citizen.get("user_id"),
                "title": "New Compulsory Training Required",
                "message": f"A new compulsory course '{course.name}' is now available. Complete within {course.deadline_days or 30} days to maintain your ARI score.",
                "type": "system",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        if notifications:
            await db.notifications.insert_many(notifications)
    
    await create_audit_log("course_created", user["user_id"], "admin", course.course_id, {
        "name": course.name,
        "region": course.region,
        "is_compulsory": course.is_compulsory
    })
    
    return {"message": "Course created", "course_id": course.course_id}

@api_router.put("/government/courses/{course_id}")
async def update_course(course_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update a training course"""
    body = await request.json()
    
    # Remove fields that shouldn't be updated directly
    body.pop("course_id", None)
    body.pop("created_at", None)
    
    result = await db.training_courses.update_one(
        {"course_id": course_id},
        {"$set": body}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await create_audit_log("course_updated", user["user_id"], "admin", course_id, body)
    return {"message": "Course updated"}

@api_router.delete("/government/courses/{course_id}")
async def archive_course(course_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Archive a training course"""
    result = await db.training_courses.update_one(
        {"course_id": course_id},
        {"$set": {"status": "archived"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await create_audit_log("course_archived", user["user_id"], "admin", course_id)
    return {"message": "Course archived"}

# ============== GOVERNMENT DASHBOARD SUMMARY ==============

@api_router.get("/government/dashboard-summary")
async def get_government_dashboard_summary(user: dict = Depends(require_auth(["admin"]))):
    """Get comprehensive dashboard summary for government oversight"""
    # Counts
    total_citizens = await db.citizen_profiles.count_documents({})
    total_dealers = await db.dealer_profiles.count_documents({})
    total_courses = await db.training_courses.count_documents({"status": "active"})
    
    # Today's stats
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_transactions = await db.transactions.count_documents({"created_at": {"$gte": today_start}})
    today_enrollments = await db.course_enrollments.count_documents({"enrolled_at": {"$gte": today_start}})
    
    # Revenue summary
    revenues = await db.revenue_records.find({}, {"_id": 0}).to_list(10000)
    total_revenue = sum(r.get("amount", 0) for r in revenues)
    this_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    monthly_revenue = sum(r.get("amount", 0) for r in revenues if r.get("created_at", "") >= this_month_start)
    
    # Alerts summary
    active_alerts = await db.member_alerts.count_documents({"status": "active"})
    critical_alerts = await db.member_alerts.count_documents({"status": "active", "severity": "critical"})
    
    # Compliance summary
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    active_licenses = len([c for c in citizens if c.get("license_status") == "active"])
    
    # Training compliance
    compulsory_courses = await db.training_courses.count_documents({"is_compulsory": True, "status": "active"})
    
    return {
        "overview": {
            "total_citizens": total_citizens,
            "total_dealers": total_dealers,
            "active_licenses": active_licenses,
            "license_compliance_rate": round((active_licenses / total_citizens * 100) if total_citizens > 0 else 0, 1)
        },
        "today": {
            "transactions": today_transactions,
            "enrollments": today_enrollments
        },
        "revenue": {
            "total": total_revenue,
            "this_month": monthly_revenue
        },
        "alerts": {
            "active": active_alerts,
            "critical": critical_alerts
        },
        "training": {
            "total_courses": total_courses,
            "compulsory_courses": compulsory_courses
        }
    }

# ============== MARKETPLACE APIs ==============

PRODUCT_CATEGORIES = ["firearm", "ammunition", "accessory", "safety_equipment", "storage", "training_material"]

@api_router.get("/marketplace/products")
async def get_marketplace_products(
    category: str = None,
    search: str = None,
    min_price: float = None,
    max_price: float = None,
    dealer_id: str = None,
    featured: bool = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))
):
    """Get marketplace products (accessible by verified citizens and dealers)"""
    # Check if citizen is verified (has active license)
    if user.get("role") == "citizen":
        citizen_profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        if not citizen_profile or citizen_profile.get("license_status") != "active":
            raise HTTPException(status_code=403, detail="Active license required to access marketplace")
    
    # Build query
    query = {"status": "active"}
    
    if category:
        query["category"] = category
    if dealer_id:
        query["dealer_id"] = dealer_id
    if featured:
        query["featured"] = True
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Check region restrictions
    citizen_region = None
    if user.get("role") == "citizen":
        citizen_profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        citizen_region = citizen_profile.get("region", "").lower() if citizen_profile else None
    
    skip = (page - 1) * limit
    total = await db.marketplace_products.count_documents(query)
    products = await db.marketplace_products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Filter out region-restricted products
    if citizen_region:
        products = [p for p in products if citizen_region not in [r.lower() for r in p.get("region_restrictions", [])]]
    
    # Add dealer info
    for product in products:
        dealer = await db.dealer_profiles.find_one({"user_id": product.get("dealer_id")}, {"_id": 0})
        product["dealer_name"] = dealer.get("business_name", "Unknown") if dealer else "Unknown"
    
    return {
        "products": [serialize_doc(p) for p in products],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/marketplace/products/{product_id}")
async def get_product_details(product_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get single product details"""
    product = await db.marketplace_products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Increment view count
    await db.marketplace_products.update_one(
        {"product_id": product_id},
        {"$inc": {"views": 1}}
    )
    
    # Add dealer info
    dealer = await db.dealer_profiles.find_one({"user_id": product.get("dealer_id")}, {"_id": 0})
    product["dealer_name"] = dealer.get("business_name", "Unknown") if dealer else "Unknown"
    product["dealer_rating"] = dealer.get("rating", 4.5) if dealer else 4.5
    
    # Get reviews
    reviews = await db.marketplace_reviews.find(
        {"product_id": product_id, "status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    product["reviews"] = [serialize_doc(r) for r in reviews]
    product["avg_rating"] = sum(r.get("rating", 0) for r in reviews) / len(reviews) if reviews else 0
    
    return serialize_doc(product)

@api_router.get("/marketplace/categories")
async def get_marketplace_categories(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get product categories with counts"""
    categories = []
    for cat in PRODUCT_CATEGORIES:
        count = await db.marketplace_products.count_documents({"category": cat, "status": "active"})
        categories.append({
            "id": cat,
            "name": cat.replace("_", " ").title(),
            "count": count
        })
    return {"categories": categories}

@api_router.post("/marketplace/products")
async def create_product(request: Request, user: dict = Depends(require_auth(["dealer"]))):
    """Create a new product listing (dealers only)"""
    body = await request.json()
    body["dealer_id"] = user["user_id"]
    
    product = MarketplaceProduct(**body)
    await db.marketplace_products.insert_one(product.model_dump())
    
    await create_audit_log("product_created", user["user_id"], "dealer", product.product_id, {"name": product.name})
    return {"message": "Product created", "product_id": product.product_id}

@api_router.put("/marketplace/products/{product_id}")
async def update_product(product_id: str, request: Request, user: dict = Depends(require_auth(["dealer"]))):
    """Update a product listing"""
    # Verify ownership
    product = await db.marketplace_products.find_one({"product_id": product_id, "dealer_id": user["user_id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or not authorized")
    
    body = await request.json()
    body.pop("product_id", None)
    body.pop("dealer_id", None)
    body.pop("created_at", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.marketplace_products.update_one({"product_id": product_id}, {"$set": body})
    
    await create_audit_log("product_updated", user["user_id"], "dealer", product_id, body)
    return {"message": "Product updated"}

@api_router.delete("/marketplace/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_auth(["dealer"]))):
    """Delete/deactivate a product listing"""
    result = await db.marketplace_products.update_one(
        {"product_id": product_id, "dealer_id": user["user_id"]},
        {"$set": {"status": "discontinued"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found or not authorized")
    
    await create_audit_log("product_deleted", user["user_id"], "dealer", product_id)
    return {"message": "Product discontinued"}

@api_router.get("/marketplace/my-products")
async def get_my_products(user: dict = Depends(require_auth(["dealer"]))):
    """Get dealer's own products"""
    products = await db.marketplace_products.find(
        {"dealer_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return {"products": [serialize_doc(p) for p in products]}

# ============== MARKETPLACE ORDERS ==============

@api_router.post("/marketplace/orders")
async def create_order(request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Create a new order (citizens only)"""
    # Verify license
    citizen_profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not citizen_profile or citizen_profile.get("license_status") != "active":
        raise HTTPException(status_code=403, detail="Active license required to place orders")
    
    body = await request.json()
    items = body.get("items", [])
    
    if not items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
    
    # Validate items and calculate total
    subtotal = 0
    processed_items = []
    dealer_id = None
    
    for item in items:
        product = await db.marketplace_products.find_one({"product_id": item.get("product_id")}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.get('product_id')} not found")
        
        if product.get("status") != "active":
            raise HTTPException(status_code=400, detail=f"Product {product.get('name')} is not available")
        
        if product.get("quantity_available", 0) < item.get("quantity", 1):
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.get('name')}")
        
        # All items must be from same dealer
        if dealer_id and dealer_id != product.get("dealer_id"):
            raise HTTPException(status_code=400, detail="All items must be from the same dealer")
        dealer_id = product.get("dealer_id")
        
        price = product.get("sale_price") or product.get("price")
        quantity = item.get("quantity", 1)
        
        processed_items.append({
            "product_id": product.get("product_id"),
            "name": product.get("name"),
            "quantity": quantity,
            "price_at_purchase": price,
            "subtotal": price * quantity
        })
        subtotal += price * quantity
    
    # Calculate tax (example: 8%)
    tax = round(subtotal * 0.08, 2)
    total = subtotal + tax
    
    # Create verification transaction
    verification_txn_id = f"vtxn_{uuid.uuid4().hex[:12]}"
    
    order = MarketplaceOrder(
        buyer_id=user["user_id"],
        dealer_id=dealer_id,
        items=processed_items,
        subtotal=subtotal,
        tax=tax,
        total=total,
        shipping_address=body.get("shipping_address"),
        license_verified=True,
        verification_transaction_id=verification_txn_id
    )
    
    await db.marketplace_orders.insert_one(order.model_dump())
    
    # Update inventory
    for item in processed_items:
        await db.marketplace_products.update_one(
            {"product_id": item["product_id"]},
            {"$inc": {"quantity_available": -item["quantity"]}}
        )
    
    # Create notification for dealer
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": dealer_id,
        "title": "New Order Received",
        "message": f"New order #{order.order_id} for ${total:.2f}",
        "type": "order",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Add revenue record
    await db.revenue_records.insert_one({
        "revenue_id": f"rev_{uuid.uuid4().hex[:12]}",
        "type": "marketplace_sale",
        "amount": total,
        "dealer_id": dealer_id,
        "user_id": user["user_id"],
        "region": citizen_profile.get("region", "unknown"),
        "reference_id": order.order_id,
        "description": f"Marketplace order {order.order_id}",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await create_audit_log("order_created", user["user_id"], "citizen", order.order_id, {"total": total})
    
    return {"message": "Order created", "order_id": order.order_id, "total": total}

@api_router.get("/marketplace/my-orders")
async def get_my_orders(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get user's orders (as buyer or seller)"""
    if user.get("role") == "dealer":
        orders = await db.marketplace_orders.find(
            {"dealer_id": user["user_id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(200)
    else:
        orders = await db.marketplace_orders.find(
            {"buyer_id": user["user_id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    
    return {"orders": [serialize_doc(o) for o in orders]}

@api_router.get("/marketplace/orders/{order_id}")
async def get_order_details(order_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get order details"""
    order = await db.marketplace_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify access
    if user.get("role") == "citizen" and order.get("buyer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.get("role") == "dealer" and order.get("dealer_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Add buyer info for dealer
    if user.get("role") == "dealer":
        buyer = await db.users.find_one({"user_id": order.get("buyer_id")}, {"_id": 0})
        order["buyer_name"] = buyer.get("name", "Unknown") if buyer else "Unknown"
    
    return serialize_doc(order)

@api_router.put("/marketplace/orders/{order_id}/status")
async def update_order_status(order_id: str, request: Request, user: dict = Depends(require_auth(["dealer"]))):
    """Update order status (dealer only)"""
    body = await request.json()
    new_status = body.get("status")
    
    valid_statuses = ["confirmed", "processing", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    order = await db.marketplace_orders.find_one({"order_id": order_id, "dealer_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not authorized")
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if new_status == "shipped" and body.get("tracking_number"):
        update_data["tracking_number"] = body.get("tracking_number")
    
    await db.marketplace_orders.update_one({"order_id": order_id}, {"$set": update_data})
    
    # Notify buyer
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": order.get("buyer_id"),
        "title": f"Order {new_status.title()}",
        "message": f"Your order #{order_id} has been {new_status}",
        "type": "order",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await create_audit_log("order_status_updated", user["user_id"], "dealer", order_id, {"status": new_status})
    return {"message": f"Order status updated to {new_status}"}

@api_router.post("/marketplace/reviews")
async def create_review(request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Create a product review"""
    body = await request.json()
    
    # Verify purchase
    order = await db.marketplace_orders.find_one({
        "order_id": body.get("order_id"),
        "buyer_id": user["user_id"],
        "status": "delivered"
    })
    if not order:
        raise HTTPException(status_code=400, detail="Can only review products from delivered orders")
    
    # Check if already reviewed
    existing_review = await db.marketplace_reviews.find_one({
        "product_id": body.get("product_id"),
        "buyer_id": user["user_id"],
        "order_id": body.get("order_id")
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="Already reviewed this product")
    
    review = MarketplaceReview(
        product_id=body.get("product_id"),
        buyer_id=user["user_id"],
        order_id=body.get("order_id"),
        rating=body.get("rating"),
        title=body.get("title"),
        comment=body.get("comment")
    )
    
    await db.marketplace_reviews.insert_one(review.model_dump())
    
    return {"message": "Review submitted", "review_id": review.review_id}

# ============== COURSE ENROLLMENT ==============

@api_router.get("/courses/available")
async def get_available_courses(
    region: str = None,
    category: str = None,
    compulsory_only: bool = False,
    user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))
):
    """Get available courses for enrollment"""
    query = {"status": "active"}
    
    if category:
        query["category"] = category
    if compulsory_only:
        query["is_compulsory"] = True
    
    # Filter by region (national courses + user's region)
    citizen_region = None
    if user.get("role") == "citizen":
        citizen_profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        citizen_region = citizen_profile.get("region", "").lower() if citizen_profile else None
    
    if region:
        citizen_region = region.lower()
    
    courses = await db.training_courses.find(query, {"_id": 0}).to_list(500)
    
    # Filter by region (national + user region)
    if citizen_region:
        courses = [c for c in courses if c.get("region", "").lower() in ["national", citizen_region]]
    
    # Add enrollment status for current user
    for course in courses:
        enrollment = await db.course_enrollments.find_one({
            "course_id": course.get("course_id"),
            "user_id": user["user_id"]
        }, {"_id": 0})
        course["enrollment_status"] = enrollment.get("status") if enrollment else None
        course["enrollment_id"] = enrollment.get("enrollment_id") if enrollment else None
    
    return {"courses": [serialize_doc(c) for c in courses]}

@api_router.post("/courses/enroll/{course_id}")
async def enroll_in_course(course_id: str, user: dict = Depends(require_auth(["citizen", "dealer"]))):
    """Enroll in a course"""
    course = await db.training_courses.find_one({"course_id": course_id, "status": "active"}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if already enrolled
    existing = await db.course_enrollments.find_one({
        "course_id": course_id,
        "user_id": user["user_id"],
        "status": {"$in": ["enrolled", "in_progress"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    # Calculate deadline if compulsory
    deadline = None
    if course.get("is_compulsory") and course.get("deadline_days"):
        deadline = (datetime.now(timezone.utc) + timedelta(days=course["deadline_days"])).isoformat()
    
    enrollment = CourseEnrollment(
        course_id=course_id,
        user_id=user["user_id"],
        deadline=deadline,
        payment_status="paid" if course.get("cost", 0) == 0 else "pending",
        amount_paid=0 if course.get("cost", 0) > 0 else 0
    )
    
    await db.course_enrollments.insert_one(enrollment.model_dump())
    
    # Add revenue record if paid course
    if course.get("cost", 0) > 0:
        citizen_profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        await db.revenue_records.insert_one({
            "revenue_id": f"rev_{uuid.uuid4().hex[:12]}",
            "type": "course_fee",
            "amount": course["cost"],
            "user_id": user["user_id"],
            "region": citizen_profile.get("region", "unknown") if citizen_profile else "unknown",
            "reference_id": enrollment.enrollment_id,
            "description": f"Course enrollment: {course['name']}",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await create_audit_log("course_enrolled", user["user_id"], user["role"], course_id, {"enrollment_id": enrollment.enrollment_id})
    
    return {"message": "Enrolled successfully", "enrollment_id": enrollment.enrollment_id}

@api_router.get("/courses/my-enrollments")
async def get_my_enrollments(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get user's course enrollments"""
    enrollments = await db.course_enrollments.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("enrolled_at", -1).to_list(100)
    
    # Add course info
    for enrollment in enrollments:
        course = await db.training_courses.find_one({"course_id": enrollment.get("course_id")}, {"_id": 0})
        if course:
            enrollment["course_name"] = course.get("name")
            enrollment["course_category"] = course.get("category")
            enrollment["is_compulsory"] = course.get("is_compulsory")
            enrollment["ari_boost"] = course.get("ari_boost", 0)
    
    return {"enrollments": [serialize_doc(e) for e in enrollments]}

@api_router.put("/courses/progress/{enrollment_id}")
async def update_course_progress(enrollment_id: str, request: Request, user: dict = Depends(require_auth(["citizen", "dealer"]))):
    """Update course progress"""
    body = await request.json()
    
    enrollment = await db.course_enrollments.find_one({
        "enrollment_id": enrollment_id,
        "user_id": user["user_id"]
    }, {"_id": 0})
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    progress = body.get("progress_percent", enrollment.get("progress_percent", 0))
    update_data = {
        "progress_percent": min(100, max(0, progress))
    }
    
    # Update status based on progress
    if progress > 0 and enrollment.get("status") == "enrolled":
        update_data["status"] = "in_progress"
        update_data["started_at"] = datetime.now(timezone.utc).isoformat()
    
    if progress >= 100:
        update_data["status"] = "completed"
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["certificate_id"] = f"cert_{uuid.uuid4().hex[:12]}"
        
        # Update ARI score
        course = await db.training_courses.find_one({"course_id": enrollment.get("course_id")}, {"_id": 0})
        if course:
            ari_boost = course.get("ari_boost", 5)
            await db.responsibility_profile.update_one(
                {"user_id": user["user_id"]},
                {
                    "$inc": {"ari_score": ari_boost, "training_hours": course.get("duration_hours", 0)},
                    "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
    
    await db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id},
        {"$set": update_data}
    )
    
    return {"message": "Progress updated", "progress": update_data.get("progress_percent")}

@api_router.get("/courses/{course_id}")
async def get_course_details(course_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get course details"""
    course = await db.training_courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Add enrollment info
    enrollment = await db.course_enrollments.find_one({
        "course_id": course_id,
        "user_id": user["user_id"]
    }, {"_id": 0})
    
    course["enrollment_status"] = enrollment.get("status") if enrollment else None
    course["enrollment_id"] = enrollment.get("enrollment_id") if enrollment else None
    course["progress"] = enrollment.get("progress_percent", 0) if enrollment else 0
    
    return serialize_doc(course)

# ============== SCHEDULED TASKS ==============

@api_router.post("/admin/run-daily-analysis")
async def run_daily_analysis(user: dict = Depends(require_auth(["admin"]))):
    """Run daily predictive analysis and threshold checks (manual trigger)"""
    results = {
        "predictive_analysis": None,
        "threshold_check": None,
        "expired_enrollments": 0
    }
    
    # Run predictive analysis
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    warnings_generated = 0
    alerts_generated = 0
    
    for citizen in citizens:
        user_id = citizen.get("user_id")
        pred = await calculate_risk_prediction(user_id)
        
        if not pred:
            continue
        
        if pred["risk_trajectory"] in ["declining", "critical_decline"]:
            existing_warning = await db.preventive_warnings.find_one({
                "user_id": user_id,
                "status": "pending",
                "warning_type": "compliance_declining"
            })
            
            if not existing_warning:
                warning_message = "Your compliance score is trending downward. Consider completing additional training."
                
                warning = PreventiveWarning(
                    user_id=user_id,
                    warning_type="compliance_declining",
                    current_value=pred["current_risk_score"],
                    threshold_value=70,
                    message=warning_message,
                    action_required="improve_compliance"
                )
                await db.preventive_warnings.insert_one(warning.model_dump())
                
                await db.notifications.insert_one({
                    "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "title": "Compliance Score Alert",
                    "message": warning_message,
                    "type": "warning",
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                warnings_generated += 1
        
        if pred["predicted_risk_score"] >= 70 and pred["risk_trajectory"] == "critical_decline":
            existing_alert = await db.member_alerts.find_one({
                "user_id": user_id,
                "status": {"$in": ["active", "acknowledged"]},
                "trigger_reason": "predictive_high_risk"
            })
            
            if not existing_alert:
                alert = MemberAlert(
                    user_id=user_id,
                    alert_type="red_flag",
                    severity="high",
                    title="Predictive Risk Alert",
                    description="Citizen predicted to reach critical risk level.",
                    trigger_reason="predictive_high_risk",
                    threshold_type="predicted_risk_score",
                    threshold_value=70,
                    actual_value=pred["predicted_risk_score"]
                )
                await db.member_alerts.insert_one(alert.model_dump())
                alerts_generated += 1
    
    results["predictive_analysis"] = {
        "citizens_analyzed": len(citizens),
        "warnings_generated": warnings_generated,
        "alerts_generated": alerts_generated
    }
    
    # Check for expired enrollments
    now = datetime.now(timezone.utc).isoformat()
    expired_result = await db.course_enrollments.update_many(
        {
            "status": {"$in": ["enrolled", "in_progress"]},
            "deadline": {"$lt": now}
        },
        {"$set": {"status": "expired"}}
    )
    results["expired_enrollments"] = expired_result.modified_count
    
    # Apply ARI penalties for expired compulsory courses
    expired_enrollments = await db.course_enrollments.find(
        {"status": "expired"},
        {"_id": 0}
    ).to_list(1000)
    
    for enrollment in expired_enrollments:
        course = await db.training_courses.find_one({"course_id": enrollment.get("course_id")}, {"_id": 0})
        if course and course.get("is_compulsory") and course.get("ari_penalty_for_skip", 0) > 0:
            await db.responsibility_profile.update_one(
                {"user_id": enrollment.get("user_id")},
                {"$inc": {"ari_score": -course["ari_penalty_for_skip"]}}
            )
    
    await create_audit_log("daily_analysis_run", user["user_id"], "admin", None, results)
    
    return {"message": "Daily analysis completed", "results": results}

# ============== PUSH NOTIFICATION SUBSCRIPTIONS ==============

@api_router.post("/notifications/subscribe")
async def subscribe_push(request: Request, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Subscribe to browser push notifications"""
    body = await request.json()
    subscription = body.get("subscription")
    
    if not subscription:
        raise HTTPException(status_code=400, detail="Subscription data required")
    
    # Store subscription
    await db.push_subscriptions.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "user_id": user["user_id"],
                "subscription": subscription,
                "enabled": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Subscribed to push notifications"}

@api_router.post("/notifications/unsubscribe")
async def unsubscribe_push(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Unsubscribe from push notifications"""
    await db.push_subscriptions.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"enabled": False}}
    )
    return {"message": "Unsubscribed from push notifications"}

@api_router.get("/notifications/status")
async def get_notification_status(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get push notification subscription status"""
    subscription = await db.push_subscriptions.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    return {
        "subscribed": subscription is not None and subscription.get("enabled", False)
    }

# ============== MEMBER COURSE ENROLLMENT ==============

@api_router.get("/member/courses")
async def get_member_courses(
    category: Optional[str] = None,
    region: Optional[str] = None,
    compulsory: Optional[bool] = None,
    user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))
):
    """Get available training courses for members"""
    query = {"status": "active"}
    
    if category:
        query["category"] = category
    if compulsory is not None:
        query["is_compulsory"] = compulsory
    
    # Get user's region for regional courses
    citizen_profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    user_region = citizen_profile.get("region") if citizen_profile else None
    
    # Include national courses and region-specific courses
    if region:
        query["$or"] = [{"region": "national"}, {"region": region}]
    elif user_region:
        query["$or"] = [{"region": "national"}, {"region": user_region}]
    
    courses = await db.training_courses.find(query, {"_id": 0}).sort("is_compulsory", -1).to_list(100)
    
    # Get user's enrollments to show enrollment status
    enrollments = await db.course_enrollments.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    enrollment_map = {e["course_id"]: e for e in enrollments}
    
    # Add enrollment status to each course
    for course in courses:
        enrollment = enrollment_map.get(course["course_id"])
        course["enrollment_status"] = enrollment.get("status") if enrollment else None
        course["enrollment_id"] = enrollment.get("enrollment_id") if enrollment else None
        course["progress_percent"] = enrollment.get("progress_percent", 0) if enrollment else 0
    
    return {"courses": courses}

@api_router.get("/member/courses/{course_id}")
async def get_member_course_details(course_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get detailed course information"""
    course = await db.training_courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get user's enrollment if exists
    enrollment = await db.course_enrollments.find_one(
        {"course_id": course_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    course["enrollment"] = serialize_doc(enrollment) if enrollment else None
    
    return course

@api_router.post("/member/courses/{course_id}/enroll")
async def member_enroll_in_course(course_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Enroll in a training course"""
    course = await db.training_courses.find_one({"course_id": course_id, "status": "active"}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or not available")
    
    # Check if already enrolled
    existing = await db.course_enrollments.find_one({
        "course_id": course_id,
        "user_id": user["user_id"],
        "status": {"$in": ["enrolled", "in_progress"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    # Calculate deadline if compulsory
    deadline = None
    if course.get("deadline_days"):
        deadline = datetime.now(timezone.utc) + timedelta(days=course["deadline_days"])
    
    enrollment = CourseEnrollment(
        course_id=course_id,
        user_id=user["user_id"],
        deadline=deadline,
        payment_status="pending" if course.get("cost", 0) > 0 else "waived",
        amount_paid=0
    )
    
    doc = enrollment.model_dump()
    doc["enrolled_at"] = doc["enrolled_at"].isoformat()
    if doc.get("deadline"):
        doc["deadline"] = doc["deadline"].isoformat()
    
    await db.course_enrollments.insert_one(doc)
    
    # Create revenue record for course fee
    if course.get("cost", 0) > 0:
        citizen_profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        region = citizen_profile.get("region", "national") if citizen_profile else "national"
        
        revenue = RevenueRecord(
            type="course_fee",
            amount=course["cost"],
            user_id=user["user_id"],
            region=region,
            reference_id=enrollment.enrollment_id,
            description=f"Enrollment in {course['name']}"
        )
        rev_doc = revenue.model_dump()
        rev_doc["created_at"] = rev_doc["created_at"].isoformat()
        await db.revenue_records.insert_one(rev_doc)
    
    await create_audit_log("course_enrollment", user["user_id"], user["role"], course_id)
    
    return {
        "message": "Successfully enrolled",
        "enrollment_id": enrollment.enrollment_id,
        "course_name": course["name"],
        "deadline": deadline.isoformat() if deadline else None
    }

@api_router.get("/member/enrollments")
async def get_member_enrollments(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get all my course enrollments"""
    enrollments = await db.course_enrollments.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("enrolled_at", -1).to_list(100)
    
    # Enrich with course details
    for enrollment in enrollments:
        course = await db.training_courses.find_one(
            {"course_id": enrollment["course_id"]},
            {"_id": 0}
        )
        enrollment["course"] = serialize_doc(course) if course else None
    
    return {"enrollments": [serialize_doc(e) for e in enrollments]}

@api_router.post("/member/enrollments/{enrollment_id}/start")
async def start_course(enrollment_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Start a course (mark as in_progress)"""
    enrollment = await db.course_enrollments.find_one({
        "enrollment_id": enrollment_id,
        "user_id": user["user_id"],
        "status": "enrolled"
    })
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    await db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id},
        {
            "$set": {
                "status": "in_progress",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "progress_percent": 5
            }
        }
    )
    
    return {"message": "Course started"}

@api_router.post("/member/enrollments/{enrollment_id}/progress")
async def update_member_course_progress(enrollment_id: str, request: Request, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Update course progress"""
    body = await request.json()
    progress = body.get("progress", 0)
    
    enrollment = await db.course_enrollments.find_one({
        "enrollment_id": enrollment_id,
        "user_id": user["user_id"],
        "status": "in_progress"
    })
    if not enrollment:
        raise HTTPException(status_code=404, detail="Active enrollment not found")
    
    # Ensure progress doesn't decrease
    current_progress = enrollment.get("progress_percent", 0)
    new_progress = max(current_progress, min(100, progress))
    
    await db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id},
        {"$set": {"progress_percent": new_progress}}
    )
    
    return {"message": "Progress updated", "progress": new_progress}

@api_router.post("/member/enrollments/{enrollment_id}/complete")
async def complete_course(enrollment_id: str, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Complete a course and earn ARI boost"""
    enrollment = await db.course_enrollments.find_one({
        "enrollment_id": enrollment_id,
        "user_id": user["user_id"],
        "status": "in_progress"
    })
    if not enrollment:
        raise HTTPException(status_code=404, detail="Active enrollment not found")
    
    # Get course details
    course = await db.training_courses.find_one({"course_id": enrollment["course_id"]}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Generate certificate
    certificate_id = f"cert_{uuid.uuid4().hex[:12]}"
    
    # Update enrollment
    await db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "progress_percent": 100,
                "certificate_id": certificate_id
            }
        }
    )
    
    # Apply ARI boost
    ari_boost = course.get("ari_boost", 5)
    await db.responsibility_profile.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {"ari_score": ari_boost, "training_hours": course.get("duration_hours", 0)},
            "$push": {"completed_courses": course["course_id"]}
        },
        upsert=True
    )
    
    # Create notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "title": "Course Completed!",
        "message": f"Congratulations! You completed {course['name']} and earned +{ari_boost} ARI points.",
        "type": "achievement",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await create_audit_log("course_completed", user["user_id"], user["role"], enrollment_id, {"ari_boost": ari_boost})
    
    return {
        "message": "Course completed!",
        "certificate_id": certificate_id,
        "ari_boost": ari_boost,
        "course_name": course["name"]
    }

# ============== SMS NOTIFICATION PREPARATION (MOCKED) ==============

class SMSNotification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    sms_id: str = Field(default_factory=lambda: f"sms_{uuid.uuid4().hex[:12]}")
    user_id: str
    phone_number: str
    message: str
    status: str = "pending"  # pending, sent, delivered, failed
    provider: str = "twilio"  # twilio, local_provider
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[datetime] = None

@api_router.post("/sms/send")
async def send_sms_notification(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Send SMS notification (MOCKED - ready for local provider integration)"""
    body = await request.json()
    target_user_id = body.get("user_id")
    message = body.get("message")
    
    if not target_user_id or not message:
        raise HTTPException(status_code=400, detail="user_id and message required")
    
    # Get user's phone number
    profile = await db.citizen_profiles.find_one({"user_id": target_user_id}, {"_id": 0})
    if not profile or not profile.get("phone"):
        raise HTTPException(status_code=400, detail="User phone number not found")
    
    # Create SMS record (MOCKED)
    sms = SMSNotification(
        user_id=target_user_id,
        phone_number=profile["phone"],
        message=message
    )
    
    sms_doc = sms.model_dump()
    sms_doc["created_at"] = sms_doc["created_at"].isoformat()
    
    # MOCKED: In production, integrate with local SMS provider here
    # Example: await local_sms_provider.send(phone_number, message)
    sms_doc["status"] = "mocked_sent"
    sms_doc["sent_at"] = datetime.now(timezone.utc).isoformat()
    sms_doc["provider_response"] = "MOCKED - Ready for local provider integration"
    
    await db.sms_notifications.insert_one(sms_doc)
    
    logger.info(f"[MOCKED SMS] To: {profile['phone']}, Message: {message[:50]}...")
    
    return {
        "sms_id": sms.sms_id,
        "status": "mocked_sent",
        "message": "SMS queued (MOCKED - integrate with local provider)"
    }

@api_router.get("/sms/history")
async def get_sms_history(user: dict = Depends(require_auth(["admin"]))):
    """Get SMS notification history"""
    sms_records = await db.sms_notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"sms_notifications": [serialize_doc(s) for s in sms_records]}

@api_router.post("/sms/configure-provider")
async def configure_sms_provider(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Configure SMS provider settings (for local provider integration)"""
    body = await request.json()
    
    config = {
        "provider": body.get("provider", "local"),
        "api_endpoint": body.get("api_endpoint"),
        "api_key": body.get("api_key"),
        "sender_id": body.get("sender_id"),
        "configured_by": user["user_id"],
        "configured_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sms_config.update_one(
        {"_id": "sms_settings"},
        {"$set": config},
        upsert=True
    )
    
    return {"message": "SMS provider configured (integration pending)"}

# ============== PWA OFFLINE SYNC ==============

@api_router.post("/sync/offline-transactions")
async def sync_offline_transactions(request: Request, user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Sync transactions that were created offline"""
    body = await request.json()
    offline_transactions = body.get("transactions", [])
    
    synced = []
    failed = []
    
    for txn_data in offline_transactions:
        try:
            # Validate and process the offline transaction
            txn_id = f"txn_{uuid.uuid4().hex[:12]}"
            txn_data["transaction_id"] = txn_id
            txn_data["synced_at"] = datetime.now(timezone.utc).isoformat()
            txn_data["offline_created"] = True
            
            await db.transactions.insert_one(txn_data)
            synced.append(txn_id)
        except Exception as e:
            failed.append({"data": txn_data, "error": str(e)})
    
    return {
        "synced_count": len(synced),
        "failed_count": len(failed),
        "synced_ids": synced,
        "failed": failed
    }

@api_router.get("/sync/pending")
async def get_pending_sync_items(user: dict = Depends(require_auth(["citizen", "dealer", "admin"]))):
    """Get items pending sync for the user"""
    # Get any pending notifications
    notifications = await db.notifications.find(
        {"user_id": user["user_id"], "read": False},
        {"_id": 0}
    ).to_list(50)
    
    # Get pending transactions
    pending_txns = await db.transactions.find(
        {"$or": [{"citizen_id": user["user_id"]}, {"dealer_id": user["user_id"]}], "status": "pending"},
        {"_id": 0}
    ).to_list(20)
    
    return {
        "notifications": [serialize_doc(n) for n in notifications],
        "pending_transactions": [serialize_doc(t) for t in pending_txns]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
