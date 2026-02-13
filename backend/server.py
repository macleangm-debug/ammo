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
