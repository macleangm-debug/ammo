"""
Members Routes (Citizens & Training)
Endpoints for citizen profiles, firearms registration, fees, and training courses.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from utils.database import db, serialize_doc
from utils.helpers import require_auth, create_audit_log
from models import CitizenProfile

router = APIRouter(tags=["Members"])


# ============== CITIZEN PROFILE ENDPOINTS ==============

@router.get("/citizen/profile")
async def get_citizen_profile(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's license profile"""
    profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        return None
    return serialize_doc(profile)


@router.post("/citizen/profile")
async def create_citizen_profile(request: Request, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Create or update citizen profile"""
    body = await request.json()
    
    existing = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if existing:
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


@router.get("/citizen/transactions")
async def get_citizen_transactions(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's transaction history"""
    transactions = await db.transactions.find(
        {"citizen_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [serialize_doc(t) for t in transactions]


# ============== FIREARMS REGISTRATION ==============

class FirearmCreate(BaseModel):
    serial_number: str
    make: str
    model: str
    caliber: str
    firearm_type: str = "handgun"
    purchase_date: Optional[str] = None
    purchase_dealer_id: Optional[str] = None


@router.get("/citizen/firearms")
async def get_citizen_firearms(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's registered firearms"""
    firearms = await db.registered_firearms.find(
        {"user_id": user["user_id"], "status": {"$ne": "transferred"}},
        {"_id": 0}
    ).sort("registration_date", -1).to_list(100)
    return {"firearms": [serialize_doc(f) for f in firearms]}


@router.post("/citizen/firearms")
async def register_firearm(firearm_data: FirearmCreate, user: dict = Depends(require_auth(["citizen"]))):
    """Register a new firearm to the citizen's account"""
    existing = await db.registered_firearms.find_one({"serial_number": firearm_data.serial_number, "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="Firearm with this serial number is already registered")
    
    firearm_id = f"FA_{uuid.uuid4().hex[:12]}"
    firearm = {
        "firearm_id": firearm_id,
        "user_id": user["user_id"],
        "serial_number": firearm_data.serial_number,
        "make": firearm_data.make,
        "model": firearm_data.model,
        "caliber": firearm_data.caliber,
        "firearm_type": firearm_data.firearm_type,
        "purchase_date": firearm_data.purchase_date or datetime.now(timezone.utc).isoformat(),
        "purchase_dealer_id": firearm_data.purchase_dealer_id,
        "registration_date": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "annual_fee_due": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        "annual_fee_amount": 50.00
    }
    
    await db.registered_firearms.insert_one(firearm)
    await create_audit_log("firearm_registered", user["user_id"], "citizen", details={"firearm_id": firearm_id})
    
    return {"message": "Firearm registered successfully", "firearm_id": firearm_id, "firearm": serialize_doc(firearm)}


@router.get("/citizen/firearms/{firearm_id}")
async def get_firearm_details(firearm_id: str, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get details of a specific firearm"""
    query = {"firearm_id": firearm_id}
    if user["role"] != "admin":
        query["user_id"] = user["user_id"]
    
    firearm = await db.registered_firearms.find_one(query, {"_id": 0})
    if not firearm:
        raise HTTPException(status_code=404, detail="Firearm not found")
    return serialize_doc(firearm)


@router.put("/citizen/firearms/{firearm_id}")
async def update_firearm(firearm_id: str, request: Request, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Update firearm details"""
    body = await request.json()
    
    query = {"firearm_id": firearm_id}
    if user["role"] != "admin":
        query["user_id"] = user["user_id"]
    
    firearm = await db.registered_firearms.find_one(query, {"_id": 0})
    if not firearm:
        raise HTTPException(status_code=404, detail="Firearm not found")
    
    allowed_updates = ["make", "model", "caliber", "firearm_type", "status"]
    update_data = {k: v for k, v in body.items() if k in allowed_updates}
    
    if update_data:
        await db.registered_firearms.update_one(query, {"$set": update_data})
        await create_audit_log("firearm_updated", user["user_id"], user["role"], details={"firearm_id": firearm_id, "updates": list(update_data.keys())})
    
    updated = await db.registered_firearms.find_one(query, {"_id": 0})
    return serialize_doc(updated)


# ============== FEES & PAYMENTS ==============

@router.get("/citizen/fees-summary")
async def get_fees_summary(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get summary of annual fees for the citizen"""
    profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    firearms = await db.registered_firearms.find(
        {"user_id": user["user_id"], "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    member_fee = 150.00
    firearm_fees = sum(f.get("annual_fee_amount", 50.00) for f in firearms)
    late_fees = 0
    
    for f in firearms:
        if f.get("annual_fee_due"):
            due_date = datetime.fromisoformat(f["annual_fee_due"].replace("Z", "+00:00"))
            if due_date < datetime.now(timezone.utc):
                days_late = (datetime.now(timezone.utc) - due_date).days
                late_fees += min(days_late * 1.0, 50.0)
    
    total = member_fee + firearm_fees + late_fees
    
    return {
        "member_fee": member_fee,
        "firearm_fees": firearm_fees,
        "firearms_count": len(firearms),
        "late_fees": late_fees,
        "total_due": total,
        "license_expiry": profile.get("license_expiry") if profile else None,
        "firearms": [serialize_doc(f) for f in firearms]
    }


@router.post("/citizen/pay-fees")
async def pay_fees(request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Process fee payment"""
    body = await request.json()
    amount = body.get("amount", 0)
    payment_method = body.get("payment_method", "card")
    
    payment_id = f"PAY_{uuid.uuid4().hex[:12]}"
    payment = {
        "payment_id": payment_id,
        "user_id": user["user_id"],
        "amount": amount,
        "payment_method": payment_method,
        "status": "completed",
        "payment_date": datetime.now(timezone.utc).isoformat(),
        "receipt_number": f"REC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    }
    
    await db.payments.insert_one(payment)
    
    firearms = await db.registered_firearms.find(
        {"user_id": user["user_id"], "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    for f in firearms:
        new_due_date = datetime.now(timezone.utc) + timedelta(days=365)
        await db.registered_firearms.update_one(
            {"firearm_id": f["firearm_id"]},
            {"$set": {"annual_fee_due": new_due_date.isoformat()}}
        )
    
    new_expiry = datetime.now(timezone.utc) + timedelta(days=365)
    await db.citizen_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"license_expiry": new_expiry.isoformat()}}
    )
    
    await create_audit_log("payment_processed", user["user_id"], "citizen", details={"payment_id": payment_id, "amount": amount})
    
    return {
        "message": "Payment processed successfully",
        "payment_id": payment_id,
        "receipt_number": payment["receipt_number"],
        "new_license_expiry": new_expiry.isoformat()
    }


# ============== NOTIFICATIONS ==============

@router.get("/citizen/notifications")
async def get_citizen_notifications(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(n) for n in notifications]


@router.post("/citizen/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Notification marked as read"}


# ============== LICENSE ALERTS & WARNINGS ==============

@router.get("/citizen/license-alerts")
async def get_license_alerts(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get alerts related to license status"""
    profile = await db.citizen_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    alerts = []
    
    if profile and profile.get("license_expiry"):
        expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
        days_until_expiry = (expiry - datetime.now(timezone.utc)).days
        
        if days_until_expiry < 0:
            alerts.append({"type": "expired", "message": "Your license has expired", "severity": "critical"})
        elif days_until_expiry < 30:
            alerts.append({"type": "expiring_soon", "message": f"Your license expires in {days_until_expiry} days", "severity": "warning"})
    
    firearms = await db.registered_firearms.find(
        {"user_id": user["user_id"], "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    for f in firearms:
        if f.get("annual_fee_due"):
            due_date = datetime.fromisoformat(f["annual_fee_due"].replace("Z", "+00:00"))
            if due_date < datetime.now(timezone.utc):
                alerts.append({
                    "type": "fee_overdue",
                    "message": f"Annual fee overdue for {f['make']} {f['model']}",
                    "severity": "warning",
                    "firearm_id": f["firearm_id"]
                })
    
    return {"alerts": alerts}


@router.get("/citizen/my-warnings")
async def get_my_warnings(user: dict = Depends(require_auth(["citizen"]))):
    """Get compliance warnings for the citizen"""
    warnings = await db.compliance_warnings.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"warnings": [serialize_doc(w) for w in warnings]}


@router.post("/citizen/acknowledge-warning/{warning_id}")
async def acknowledge_warning(warning_id: str, user: dict = Depends(require_auth(["citizen"]))):
    """Acknowledge a compliance warning"""
    result = await db.compliance_warnings.update_one(
        {"warning_id": warning_id, "user_id": user["user_id"]},
        {"$set": {"acknowledged": True, "acknowledged_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Warning not found")
    return {"message": "Warning acknowledged"}


# ============== REVIEWS & APPEALS ==============

@router.post("/citizen/license-renewal")
async def submit_license_renewal(request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Submit a license renewal application"""
    body = await request.json()
    
    renewal_id = f"REN_{uuid.uuid4().hex[:12]}"
    renewal = {
        "item_id": renewal_id,
        "item_type": "license_renewal",
        "user_id": user["user_id"],
        "status": "pending",
        "priority": "normal",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "notes": body.get("notes", ""),
        "documents": body.get("documents", [])
    }
    
    await db.review_items.insert_one(renewal)
    await create_audit_log("renewal_submitted", user["user_id"], "citizen", details={"renewal_id": renewal_id})
    
    return {"message": "Renewal application submitted", "renewal_id": renewal_id}


@router.post("/citizen/appeal")
async def submit_appeal(request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Submit an appeal"""
    body = await request.json()
    
    appeal_id = f"APL_{uuid.uuid4().hex[:12]}"
    appeal = {
        "item_id": appeal_id,
        "item_type": "appeal",
        "user_id": user["user_id"],
        "related_item_id": body.get("related_item_id"),
        "appeal_type": body.get("appeal_type", "general"),
        "reason": body.get("reason", ""),
        "status": "pending",
        "priority": "normal",
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.review_items.insert_one(appeal)
    await create_audit_log("appeal_submitted", user["user_id"], "citizen", details={"appeal_id": appeal_id})
    
    return {"message": "Appeal submitted", "appeal_id": appeal_id}


@router.get("/citizen/my-reviews")
async def get_my_reviews(user: dict = Depends(require_auth(["citizen"]))):
    """Get citizen's pending and completed reviews"""
    reviews = await db.review_items.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(50)
    return {"reviews": [serialize_doc(r) for r in reviews]}


# ============== DOCUMENTS ==============

@router.get("/citizen/documents")
async def get_citizen_documents(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get citizen's formal documents"""
    documents = await db.formal_documents.find(
        {"user_id": user["user_id"], "status": {"$ne": "archived"}},
        {"_id": 0}
    ).sort("issued_at", -1).to_list(50)
    return {"documents": [serialize_doc(d) for d in documents]}


@router.get("/citizen/documents/{document_id}")
async def get_document_details(document_id: str, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get details of a specific document"""
    query = {"document_id": document_id}
    if user["role"] != "admin":
        query["user_id"] = user["user_id"]
    
    document = await db.formal_documents.find_one(query, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_doc(document)


@router.post("/citizen/documents/{document_id}/archive")
async def archive_document(document_id: str, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Archive a document"""
    query = {"document_id": document_id}
    if user["role"] != "admin":
        query["user_id"] = user["user_id"]
    
    result = await db.formal_documents.update_one(
        query,
        {"$set": {"status": "archived", "archived_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document archived"}


# ============== MEMBER COURSES & TRAINING ==============

@router.get("/member/courses")
async def get_available_courses(
    category: Optional[str] = None,
    level: Optional[str] = None,
    user: dict = Depends(require_auth(["citizen", "admin"]))
):
    """Get available training courses"""
    query = {"status": "active"}
    if category:
        query["category"] = category
    if level:
        query["level"] = level
    
    courses = await db.training_courses.find(query, {"_id": 0}).to_list(100)
    return {"courses": [serialize_doc(c) for c in courses]}


@router.get("/member/courses/{course_id}")
async def get_course_details(course_id: str, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get details of a specific course"""
    course = await db.training_courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return serialize_doc(course)


@router.post("/member/courses/{course_id}/enroll")
async def enroll_in_course(course_id: str, user: dict = Depends(require_auth(["citizen"]))):
    """Enroll in a training course"""
    course = await db.training_courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    existing = await db.course_enrollments.find_one({
        "course_id": course_id,
        "user_id": user["user_id"],
        "status": {"$in": ["enrolled", "in_progress"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    enrollment_id = f"ENR_{uuid.uuid4().hex[:12]}"
    enrollment = {
        "enrollment_id": enrollment_id,
        "course_id": course_id,
        "user_id": user["user_id"],
        "status": "enrolled",
        "enrolled_at": datetime.now(timezone.utc).isoformat(),
        "progress": 0,
        "modules_completed": []
    }
    
    await db.course_enrollments.insert_one(enrollment)
    await create_audit_log("course_enrolled", user["user_id"], "citizen", details={"course_id": course_id})
    
    return {"message": "Enrolled successfully", "enrollment_id": enrollment_id}


@router.get("/member/enrollments")
async def get_my_enrollments(user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get user's course enrollments"""
    enrollments = await db.course_enrollments.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("enrolled_at", -1).to_list(50)
    return {"enrollments": [serialize_doc(e) for e in enrollments]}


@router.post("/member/enrollments/{enrollment_id}/start")
async def start_course(enrollment_id: str, user: dict = Depends(require_auth(["citizen"]))):
    """Start a course"""
    result = await db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id, "user_id": user["user_id"], "status": "enrolled"},
        {"$set": {"status": "in_progress", "started_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment not found or already started")
    return {"message": "Course started"}


@router.post("/member/enrollments/{enrollment_id}/progress")
async def update_progress(enrollment_id: str, request: Request, user: dict = Depends(require_auth(["citizen"]))):
    """Update course progress"""
    body = await request.json()
    module_id = body.get("module_id")
    
    enrollment = await db.course_enrollments.find_one(
        {"enrollment_id": enrollment_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    modules_completed = enrollment.get("modules_completed", [])
    if module_id and module_id not in modules_completed:
        modules_completed.append(module_id)
    
    progress = body.get("progress", enrollment.get("progress", 0))
    
    await db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id},
        {"$set": {"progress": progress, "modules_completed": modules_completed}}
    )
    
    return {"message": "Progress updated", "progress": progress}


@router.post("/member/enrollments/{enrollment_id}/complete")
async def complete_course(enrollment_id: str, user: dict = Depends(require_auth(["citizen"]))):
    """Mark course as completed"""
    enrollment = await db.course_enrollments.find_one(
        {"enrollment_id": enrollment_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    certificate_id = f"CERT_{uuid.uuid4().hex[:12]}"
    
    await db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "progress": 100,
            "certificate_id": certificate_id
        }}
    )
    
    await create_audit_log("course_completed", user["user_id"], "citizen", details={
        "enrollment_id": enrollment_id,
        "certificate_id": certificate_id
    })
    
    return {"message": "Course completed", "certificate_id": certificate_id}


@router.get("/member/certificates/{enrollment_id}")
async def get_certificate(enrollment_id: str, user: dict = Depends(require_auth(["citizen", "admin"]))):
    """Get certificate for a completed course"""
    enrollment = await db.course_enrollments.find_one(
        {"enrollment_id": enrollment_id, "user_id": user["user_id"], "status": "completed"},
        {"_id": 0}
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Completed enrollment not found")
    
    course = await db.training_courses.find_one({"course_id": enrollment["course_id"]}, {"_id": 0})
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    return {
        "certificate_id": enrollment.get("certificate_id"),
        "course_name": course.get("name") if course else "Unknown Course",
        "user_name": user_data.get("name") if user_data else "Unknown",
        "completed_at": enrollment.get("completed_at"),
        "enrollment_id": enrollment_id
    }
