"""
Government Routes
Admin endpoints for policy management, compliance, analytics, and oversight.
"""
import uuid
import io
import csv
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel

from utils.database import db, serialize_doc
from utils.helpers import require_auth, create_audit_log

router = APIRouter(prefix="/government", tags=["Government"])


# ============== FEES & COMPLIANCE OVERVIEW ==============

@router.get("/fees-overview")
async def get_fees_overview(user: dict = Depends(require_auth(["admin"]))):
    """Get overview of all fees across the platform"""
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    firearms = await db.registered_firearms.find({"status": "active"}, {"_id": 0}).to_list(10000)
    
    total_member_fees = len(citizens) * 150.00
    total_firearm_fees = sum(f.get("annual_fee_amount", 50.00) for f in firearms)
    
    overdue_count = 0
    late_fees = 0
    now = datetime.now(timezone.utc)
    
    for f in firearms:
        if f.get("annual_fee_due"):
            try:
                due_date = datetime.fromisoformat(f["annual_fee_due"].replace("Z", "+00:00"))
                if due_date < now:
                    overdue_count += 1
                    days_late = (now - due_date).days
                    late_fees += min(days_late * 1.0, 50.0)
            except:
                pass
    
    return {
        "total_citizens": len(citizens),
        "total_firearms": len(firearms),
        "total_member_fees": total_member_fees,
        "total_firearm_fees": total_firearm_fees,
        "overdue_count": overdue_count,
        "estimated_late_fees": late_fees,
        "total_expected_revenue": total_member_fees + total_firearm_fees + late_fees
    }


@router.get("/firearms-registry")
async def get_firearms_registry(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get list of all registered firearms"""
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"serial_number": {"$regex": search, "$options": "i"}},
            {"make": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.registered_firearms.count_documents(query)
    firearms = await db.registered_firearms.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return {
        "firearms": [serialize_doc(f) for f in firearms],
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/compliance-status")
async def get_compliance_status(user: dict = Depends(require_auth(["admin"]))):
    """Get overall compliance status"""
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    compliant = 0
    warning = 0
    suspended = 0
    expired = 0
    now = datetime.now(timezone.utc)
    
    for c in citizens:
        status = c.get("license_status", "active")
        if status == "suspended":
            suspended += 1
        elif c.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(c["license_expiry"].replace("Z", "+00:00"))
                if expiry < now:
                    expired += 1
                elif (expiry - now).days < 30:
                    warning += 1
                else:
                    compliant += 1
            except:
                compliant += 1
        else:
            compliant += 1
    
    total = len(citizens)
    compliance_rate = (compliant / total * 100) if total > 0 else 0
    
    return {
        "total_citizens": total,
        "compliant": compliant,
        "warning": warning,
        "suspended": suspended,
        "expired": expired,
        "compliance_rate": round(compliance_rate, 1)
    }


# ============== POLICY MANAGEMENT ==============

@router.get("/policies")
async def get_policies(user: dict = Depends(require_auth(["admin"]))):
    """Get current policy configuration"""
    policy = await db.policies.find_one({}, {"_id": 0})
    if not policy:
        policy = {
            "policy_id": "default_policy",
            "fees": {"member_annual": 150, "firearm_annual": 50, "late_fee_per_day": 1, "max_late_fee": 50},
            "escalation": {"grace_period_days": 30, "warning_threshold_days": 60, "suspension_threshold_days": 90},
            "training": {"required_hours": 20, "renewal_period_months": 12}
        }
        await db.policies.insert_one(policy)
    return serialize_doc(policy)


@router.put("/policies")
async def update_policies(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update policy configuration"""
    body = await request.json()
    
    await db.policies.update_one(
        {},
        {"$set": {
            **body,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "updated_by": user["user_id"]
        }},
        upsert=True
    )
    
    await create_audit_log("policy_updated", user["user_id"], "admin", details=body)
    
    policy = await db.policies.find_one({}, {"_id": 0})
    return serialize_doc(policy)


@router.post("/policies/apply-preset")
async def apply_policy_preset(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Apply a preset policy configuration"""
    body = await request.json()
    preset_name = body.get("preset_name")
    
    presets = {
        "strict": {
            "fees": {"member_annual": 200, "firearm_annual": 75, "late_fee_per_day": 2, "max_late_fee": 100},
            "escalation": {"grace_period_days": 14, "warning_threshold_days": 30, "suspension_threshold_days": 45},
            "training": {"required_hours": 30, "renewal_period_months": 6}
        },
        "moderate": {
            "fees": {"member_annual": 150, "firearm_annual": 50, "late_fee_per_day": 1, "max_late_fee": 50},
            "escalation": {"grace_period_days": 30, "warning_threshold_days": 60, "suspension_threshold_days": 90},
            "training": {"required_hours": 20, "renewal_period_months": 12}
        },
        "lenient": {
            "fees": {"member_annual": 100, "firearm_annual": 25, "late_fee_per_day": 0.5, "max_late_fee": 25},
            "escalation": {"grace_period_days": 60, "warning_threshold_days": 90, "suspension_threshold_days": 180},
            "training": {"required_hours": 10, "renewal_period_months": 24}
        }
    }
    
    if preset_name not in presets:
        raise HTTPException(status_code=400, detail=f"Unknown preset: {preset_name}")
    
    preset = presets[preset_name]
    await db.policies.update_one(
        {},
        {"$set": {
            **preset,
            "preset_name": preset_name,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "updated_by": user["user_id"]
        }},
        upsert=True
    )
    
    await create_audit_log("policy_preset_applied", user["user_id"], "admin", details={"preset": preset_name})
    
    return {"message": f"Applied {preset_name} preset", "policy": preset}


@router.get("/policies/presets")
async def get_policy_presets(user: dict = Depends(require_auth(["admin"]))):
    """Get available policy presets"""
    return {
        "presets": ["strict", "moderate", "lenient"],
        "descriptions": {
            "strict": "Higher fees, shorter grace periods, more training required",
            "moderate": "Balanced approach with standard fees and timelines",
            "lenient": "Lower fees, longer grace periods, minimal training"
        }
    }


# ============== ACCREDITED HOSPITALS ==============

@router.get("/accredited-hospitals")
async def get_accredited_hospitals(user: dict = Depends(require_auth(["admin"]))):
    """Get list of accredited mental health facilities"""
    hospitals = await db.accredited_hospitals.find({}, {"_id": 0}).to_list(100)
    return {"hospitals": [serialize_doc(h) for h in hospitals]}


@router.post("/accredited-hospitals")
async def add_accredited_hospital(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Add a new accredited hospital"""
    body = await request.json()
    
    hospital = {
        "hospital_id": f"HOSP_{uuid.uuid4().hex[:12]}",
        "name": body.get("name"),
        "address": body.get("address"),
        "contact_email": body.get("contact_email"),
        "contact_phone": body.get("contact_phone"),
        "accreditation_date": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "added_by": user["user_id"]
    }
    
    await db.accredited_hospitals.insert_one(hospital)
    return {"message": "Hospital added", "hospital": serialize_doc(hospital)}


@router.put("/accredited-hospitals/{hospital_id}")
async def update_accredited_hospital(hospital_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update an accredited hospital"""
    body = await request.json()
    
    result = await db.accredited_hospitals.update_one(
        {"hospital_id": hospital_id},
        {"$set": body}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    hospital = await db.accredited_hospitals.find_one({"hospital_id": hospital_id}, {"_id": 0})
    return serialize_doc(hospital)


@router.delete("/accredited-hospitals/{hospital_id}")
async def delete_accredited_hospital(hospital_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Remove an accredited hospital"""
    result = await db.accredited_hospitals.delete_one({"hospital_id": hospital_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return {"message": "Hospital removed"}


# ============== ANALYTICS ==============

@router.get("/analytics/revenue")
async def get_revenue_analytics(
    period: str = "month",
    user: dict = Depends(require_auth(["admin"]))
):
    """Get revenue analytics"""
    payments = await db.payments.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)
    
    period_payments = []
    for p in payments:
        try:
            payment_date = datetime.fromisoformat(p.get("payment_date", "").replace("Z", "+00:00"))
            if payment_date >= start_date:
                period_payments.append(p)
        except:
            pass
    
    total_revenue = sum(p.get("amount", 0) for p in period_payments)
    
    # Group by day for chart data
    daily_revenue = {}
    for p in period_payments:
        try:
            date_str = p.get("payment_date", "")[:10]
            daily_revenue[date_str] = daily_revenue.get(date_str, 0) + p.get("amount", 0)
        except:
            pass
    
    chart_data = [{"date": k, "revenue": v} for k, v in sorted(daily_revenue.items())]
    
    return {
        "period": period,
        "total_revenue": total_revenue,
        "payment_count": len(period_payments),
        "average_payment": total_revenue / len(period_payments) if period_payments else 0,
        "chart_data": chart_data
    }


@router.get("/analytics/training")
async def get_training_analytics(user: dict = Depends(require_auth(["admin"]))):
    """Get training analytics"""
    enrollments = await db.course_enrollments.find({}, {"_id": 0}).to_list(10000)
    courses = await db.training_courses.find({}, {"_id": 0}).to_list(100)
    
    completed = sum(1 for e in enrollments if e.get("status") == "completed")
    in_progress = sum(1 for e in enrollments if e.get("status") == "in_progress")
    enrolled = sum(1 for e in enrollments if e.get("status") == "enrolled")
    
    # Course popularity
    course_stats = {}
    for e in enrollments:
        course_id = e.get("course_id")
        if course_id:
            if course_id not in course_stats:
                course_stats[course_id] = {"enrollments": 0, "completions": 0}
            course_stats[course_id]["enrollments"] += 1
            if e.get("status") == "completed":
                course_stats[course_id]["completions"] += 1
    
    return {
        "total_enrollments": len(enrollments),
        "completed": completed,
        "in_progress": in_progress,
        "enrolled": enrolled,
        "completion_rate": (completed / len(enrollments) * 100) if enrollments else 0,
        "total_courses": len(courses),
        "course_stats": course_stats
    }


@router.get("/analytics/dealers")
async def get_dealer_analytics(user: dict = Depends(require_auth(["admin"]))):
    """Get dealer analytics"""
    dealers = await db.dealer_profiles.find({}, {"_id": 0}).to_list(1000)
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    # Transaction volume by dealer
    dealer_stats = {}
    for t in transactions:
        dealer_id = t.get("dealer_id")
        if dealer_id:
            if dealer_id not in dealer_stats:
                dealer_stats[dealer_id] = {"count": 0, "total_value": 0}
            dealer_stats[dealer_id]["count"] += 1
            dealer_stats[dealer_id]["total_value"] += t.get("total_value", 0)
    
    return {
        "total_dealers": len(dealers),
        "active_dealers": len(dealer_stats),
        "total_transactions": len(transactions),
        "dealer_stats": dealer_stats
    }


@router.get("/analytics/compliance")
async def get_compliance_analytics(user: dict = Depends(require_auth(["admin"]))):
    """Get compliance analytics"""
    citizens = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    warnings = await db.compliance_warnings.find({}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    
    # Status breakdown
    status_counts = {"active": 0, "warning": 0, "suspended": 0, "expired": 0}
    for c in citizens:
        status = c.get("license_status", "active")
        if status == "suspended":
            status_counts["suspended"] += 1
        elif c.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(c["license_expiry"].replace("Z", "+00:00"))
                if expiry < now:
                    status_counts["expired"] += 1
                elif (expiry - now).days < 30:
                    status_counts["warning"] += 1
                else:
                    status_counts["active"] += 1
            except:
                status_counts["active"] += 1
        else:
            status_counts["active"] += 1
    
    return {
        "total_citizens": len(citizens),
        "status_breakdown": status_counts,
        "total_warnings_issued": len(warnings),
        "compliance_rate": (status_counts["active"] / len(citizens) * 100) if citizens else 0
    }


# ============== USERS MANAGEMENT ==============

@router.get("/users-list")
async def get_users_list(
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get list of all users"""
    query = {}
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Get role counts
    role_counts = {}
    all_users = await db.users.find({}, {"role": 1}).to_list(100000)
    for u in all_users:
        r = u.get("role", "unknown")
        role_counts[r] = role_counts.get(r, 0) + 1
    
    return {
        "users": [serialize_doc(u) for u in users],
        "total": total,
        "limit": limit,
        "skip": skip,
        "role_counts": role_counts
    }


@router.get("/citizen-profiles")
async def get_citizen_profiles(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get citizen profiles with license info"""
    query = {}
    if status:
        query["license_status"] = status
    
    profiles = await db.citizen_profiles.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"profiles": [serialize_doc(p) for p in profiles]}


@router.get("/user-profile/{user_id}")
async def get_user_profile(user_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Get detailed profile for a specific user"""
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get additional profile data based on role
    profile = None
    if user_data.get("role") == "citizen":
        profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    elif user_data.get("role") == "dealer":
        profile = await db.dealer_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    # Get firearms if citizen
    firearms = []
    if user_data.get("role") == "citizen":
        firearms = await db.registered_firearms.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Get transactions
    transactions = await db.transactions.find(
        {"$or": [{"citizen_id": user_id}, {"dealer_id": user_id}]},
        {"_id": 0}
    ).limit(20).to_list(20)
    
    return {
        "user": serialize_doc(user_data),
        "profile": serialize_doc(profile) if profile else None,
        "firearms": [serialize_doc(f) for f in firearms],
        "recent_transactions": [serialize_doc(t) for t in transactions]
    }


@router.get("/users-export")
async def export_users(
    role: Optional[str] = None,
    format: str = "json",
    user: dict = Depends(require_auth(["admin"]))
):
    """Export users data"""
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100000)
    
    if format == "csv":
        output = io.StringIO()
        if users:
            writer = csv.DictWriter(output, fieldnames=users[0].keys())
            writer.writeheader()
            writer.writerows(users)
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=users_export.csv"}
        )
    
    return {"users": [serialize_doc(u) for u in users], "count": len(users)}


# ============== DASHBOARD SUMMARY ==============

@router.get("/dashboard-summary")
async def get_dashboard_summary(user: dict = Depends(require_auth(["admin"]))):
    """Get summary data for government dashboard"""
    # Count users by role
    citizens = await db.users.count_documents({"role": "citizen"})
    dealers = await db.users.count_documents({"role": "dealer"})
    
    # Count firearms
    firearms = await db.registered_firearms.count_documents({"status": "active"})
    
    # Count pending reviews
    pending_reviews = await db.review_items.count_documents({"status": "pending"})
    
    # Calculate compliance rate
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    now = datetime.now(timezone.utc)
    compliant = 0
    for p in profiles:
        if p.get("license_status") != "suspended":
            if p.get("license_expiry"):
                try:
                    expiry = datetime.fromisoformat(p["license_expiry"].replace("Z", "+00:00"))
                    if expiry > now:
                        compliant += 1
                except:
                    compliant += 1
            else:
                compliant += 1
    
    compliance_rate = (compliant / len(profiles) * 100) if profiles else 100
    
    # Calculate monthly revenue
    payments = await db.payments.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    month_start = now - timedelta(days=30)
    monthly_revenue = 0
    for p in payments:
        try:
            payment_date = datetime.fromisoformat(p.get("payment_date", "").replace("Z", "+00:00"))
            if payment_date >= month_start:
                monthly_revenue += p.get("amount", 0)
        except:
            pass
    
    return {
        "licensed_owners": citizens,
        "active_dealers": dealers,
        "registered_firearms": firearms,
        "pending_reviews": pending_reviews,
        "compliance_rate": round(compliance_rate, 1),
        "monthly_revenue": monthly_revenue
    }


# ============== COURSES MANAGEMENT ==============

@router.get("/courses")
async def get_courses(user: dict = Depends(require_auth(["admin"]))):
    """Get all training courses"""
    courses = await db.training_courses.find({}, {"_id": 0}).to_list(100)
    return {"courses": [serialize_doc(c) for c in courses]}


@router.post("/courses")
async def create_course(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new training course"""
    body = await request.json()
    
    course = {
        "course_id": f"CRS_{uuid.uuid4().hex[:12]}",
        "name": body.get("name"),
        "description": body.get("description"),
        "category": body.get("category", "safety"),
        "level": body.get("level", "beginner"),
        "duration_hours": body.get("duration_hours", 4),
        "modules": body.get("modules", []),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.training_courses.insert_one(course)
    return {"message": "Course created", "course": serialize_doc(course)}


@router.put("/courses/{course_id}")
async def update_course(course_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update a training course"""
    body = await request.json()
    
    result = await db.training_courses.update_one(
        {"course_id": course_id},
        {"$set": {**body, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course = await db.training_courses.find_one({"course_id": course_id}, {"_id": 0})
    return serialize_doc(course)


@router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Delete a training course"""
    result = await db.training_courses.delete_one({"course_id": course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted"}


# ============== NOTIFICATIONS ==============

@router.get("/notifications")
async def get_government_notifications(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get system notifications"""
    notifications = await db.system_notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"notifications": [serialize_doc(n) for n in notifications]}


@router.post("/notifications/send")
async def send_notification(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Send a notification to users"""
    body = await request.json()
    
    target_role = body.get("target_role")
    target_users = body.get("target_users", [])
    message = body.get("message")
    notification_type = body.get("type", "info")
    
    notification_id = f"NOT_{uuid.uuid4().hex[:12]}"
    
    # If target role specified, get all users with that role
    if target_role:
        users = await db.users.find({"role": target_role}, {"user_id": 1}).to_list(100000)
        target_users = [u["user_id"] for u in users]
    
    # Create notifications for each user
    for uid in target_users:
        await db.notifications.insert_one({
            "notification_id": f"{notification_id}_{uid}",
            "user_id": uid,
            "message": message,
            "type": notification_type,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sent_by": user["user_id"]
        })
    
    return {
        "message": f"Notification sent to {len(target_users)} users",
        "notification_id": notification_id
    }


@router.get("/notification-stats")
async def get_notification_stats(user: dict = Depends(require_auth(["admin"]))):
    """Get notification statistics"""
    total = await db.notifications.count_documents({})
    unread = await db.notifications.count_documents({"read": False})
    
    return {
        "total_sent": total,
        "unread": unread,
        "read": total - unread
    }
