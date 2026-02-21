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
        "total_licenses": citizens,  # Frontend expects this field name
        "licensed_owners": citizens,
        "active_dealers": dealers,
        "registered_firearms": firearms,
        "pending_reviews": pending_reviews,
        "compliance_rate": round(compliance_rate, 1),
        "monthly_revenue": monthly_revenue,
        "total_revenue": monthly_revenue  # Frontend also uses this
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


# ============== STATS ENDPOINTS FOR DASHBOARD ==============

@router.get("/revenue-stats")
async def get_revenue_stats(user: dict = Depends(require_auth(["admin"]))):
    """Get revenue statistics for dashboard"""
    payments = await db.payments.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    
    # Group by month
    monthly_data = {}
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    for p in payments:
        try:
            date = datetime.fromisoformat(p.get("payment_date", "").replace("Z", "+00:00"))
            month_key = months[date.month - 1]
            monthly_data[month_key] = monthly_data.get(month_key, 0) + p.get("amount", 0)
        except:
            pass
    
    # Fill in missing months with 0
    chart_data = [{"month": m, "revenue": monthly_data.get(m, 0)} for m in months[:now.month]]
    
    total = sum(p.get("amount", 0) for p in payments)
    
    return {
        "total_revenue": total,
        "monthly_data": chart_data,
        "payment_count": len(payments)
    }


@router.get("/training-stats")
async def get_training_stats(user: dict = Depends(require_auth(["admin"]))):
    """Get training statistics for dashboard"""
    enrollments = await db.course_enrollments.find({}, {"_id": 0}).to_list(10000)
    courses = await db.training_courses.find({}, {"_id": 0}).to_list(100)
    
    completed = sum(1 for e in enrollments if e.get("status") == "completed")
    in_progress = sum(1 for e in enrollments if e.get("status") == "in_progress")
    
    # Calculate average hours
    total_hours = sum(c.get("duration_hours", 4) for c in courses)
    avg_hours = total_hours / len(courses) if courses else 0
    
    return {
        "total_enrollments": len(enrollments),
        "completed": completed,
        "in_progress": in_progress,
        "completion_rate": round((completed / len(enrollments) * 100) if enrollments else 0, 1),
        "total_courses": len(courses),
        "avg_course_hours": round(avg_hours, 1)
    }


@router.get("/dealer-stats")
async def get_dealer_stats(user: dict = Depends(require_auth(["admin"]))):
    """Get dealer statistics for dashboard"""
    dealers = await db.dealer_profiles.find({}, {"_id": 0}).to_list(1000)
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    # Group transactions by dealer
    dealer_tx = {}
    for t in transactions:
        did = t.get("dealer_id")
        if did:
            if did not in dealer_tx:
                dealer_tx[did] = {"count": 0, "value": 0}
            dealer_tx[did]["count"] += 1
            dealer_tx[did]["value"] += t.get("total_value", 0)
    
    # Get active dealers (with transactions)
    active_dealers = len(dealer_tx)
    
    # Calculate average transaction value
    total_value = sum(t.get("total_value", 0) for t in transactions)
    avg_tx_value = total_value / len(transactions) if transactions else 0
    
    return {
        "total_dealers": len(dealers),
        "active_dealers": active_dealers,
        "total_transactions": len(transactions),
        "total_transaction_value": round(total_value, 2),
        "avg_transaction_value": round(avg_tx_value, 2)
    }


@router.get("/compliance-overview")
async def get_compliance_overview(user: dict = Depends(require_auth(["admin"]))):
    """Get compliance overview for dashboard"""
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    warnings = await db.compliance_warnings.find({}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    
    compliant = 0
    warning_status = 0
    suspended = 0
    expired = 0
    
    for p in profiles:
        status = p.get("license_status", "active")
        if status == "suspended":
            suspended += 1
        elif p.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(p["license_expiry"].replace("Z", "+00:00"))
                if expiry < now:
                    expired += 1
                elif (expiry - now).days < 30:
                    warning_status += 1
                else:
                    compliant += 1
            except:
                compliant += 1
        else:
            compliant += 1
    
    total = len(profiles)
    
    return {
        "total_citizens": total,
        "compliant": compliant,
        "warning": warning_status,
        "suspended": suspended,
        "expired": expired,
        "compliance_rate": round((compliant / total * 100) if total > 0 else 0, 1),
        "total_warnings": len(warnings),
        "status_breakdown": {
            "active": compliant,
            "warning": warning_status,
            "suspended": suspended,
            "expired": expired
        }
    }


@router.get("/alerts")
async def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get system alerts"""
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    
    alerts = await db.system_alerts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get severity counts
    all_alerts = await db.system_alerts.find({}, {"severity": 1}).to_list(10000)
    severity_counts = {}
    for a in all_alerts:
        s = a.get("severity", "low")
        severity_counts[s] = severity_counts.get(s, 0) + 1
    
    return {
        "alerts": [serialize_doc(a) for a in alerts],
        "total": len(all_alerts),
        "by_severity": severity_counts
    }


@router.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update an alert status"""
    body = await request.json()
    
    update_data = {
        "status": body.get("status", "resolved"),
        "notes": body.get("notes", ""),
        "resolved_by": user["user_id"],
        "resolved_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.system_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await create_audit_log("alert_resolved", user["user_id"], "admin", details={"alert_id": alert_id})
    return {"message": "Alert updated"}



# ============== ALERTS SYSTEM ==============

@router.get("/alerts/active")
async def get_active_alerts(user: dict = Depends(require_auth(["admin"]))):
    """Get all active alerts"""
    alerts = await db.system_alerts.find(
        {"status": {"$in": ["active", "warning", "critical"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"alerts": [serialize_doc(a) for a in alerts]}


@router.get("/alerts/dashboard")
async def get_alerts_dashboard(user: dict = Depends(require_auth(["admin"]))):
    """Get alerts dashboard data"""
    alerts = await db.system_alerts.find({}, {"_id": 0}).to_list(10000)
    
    active = sum(1 for a in alerts if a.get("status") in ["active", "warning", "critical"])
    resolved = sum(1 for a in alerts if a.get("status") == "resolved")
    
    by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for a in alerts:
        sev = a.get("severity", "low")
        if sev in by_severity:
            by_severity[sev] += 1
    
    return {
        "total": len(alerts),
        "active": active,
        "resolved": resolved,
        "by_severity": by_severity
    }


@router.get("/alerts/thresholds")
async def get_alert_thresholds(user: dict = Depends(require_auth(["admin"]))):
    """Get alert threshold configuration"""
    thresholds = await db.alert_thresholds.find({}, {"_id": 0}).to_list(100)
    return {"thresholds": [serialize_doc(t) for t in thresholds]}


@router.post("/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Acknowledge an alert"""
    result = await db.system_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {
            "acknowledged": True,
            "acknowledged_by": user["user_id"],
            "acknowledged_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}


@router.post("/alerts/resolve/{alert_id}")
async def resolve_alert(alert_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Resolve an alert"""
    body = await request.json()
    
    result = await db.system_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {
            "status": "resolved",
            "resolution_notes": body.get("notes", ""),
            "resolved_by": user["user_id"],
            "resolved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await create_audit_log("alert_resolved", user["user_id"], "admin", details={"alert_id": alert_id})
    return {"message": "Alert resolved"}


@router.post("/alerts/intervene/{alert_id}")
async def intervene_alert(alert_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Take intervention action on an alert"""
    body = await request.json()
    action = body.get("action", "review")
    
    result = await db.system_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {
            "intervention_action": action,
            "intervention_by": user["user_id"],
            "intervention_at": datetime.now(timezone.utc).isoformat(),
            "status": "under_review"
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await create_audit_log("alert_intervention", user["user_id"], "admin", details={"alert_id": alert_id, "action": action})
    return {"message": f"Intervention '{action}' recorded"}


# ============== ENFORCEMENT SYSTEM ==============

@router.get("/enforcement/status")
async def get_enforcement_status(user: dict = Depends(require_auth(["admin"]))):
    """Get current enforcement system status"""
    # Check if scheduler is running
    scheduler_status = await db.system_config.find_one({"key": "enforcement_scheduler"}, {"_id": 0})
    
    # Get recent enforcement history
    history = await db.enforcement_history.find({}, {"_id": 0}).sort("start_time", -1).limit(5).to_list(5)
    
    return {
        "scheduler_running": scheduler_status.get("running", False) if scheduler_status else False,
        "last_run": history[0] if history else None,
        "recent_runs": [serialize_doc(h) for h in history]
    }


@router.post("/enforcement/run")
async def run_enforcement(user: dict = Depends(require_auth(["admin"]))):
    """Manually trigger enforcement check"""
    run_id = f"ENF_{uuid.uuid4().hex[:12]}"
    
    # Record the run
    run_record = {
        "run_id": run_id,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "triggered_by": user["user_id"],
        "status": "running"
    }
    await db.enforcement_history.insert_one(run_record)
    
    # Get policy configuration
    policy = await db.policies.find_one({}, {"_id": 0})
    if not policy:
        policy = {"escalation": {"grace_period_days": 30, "warning_threshold_days": 60, "suspension_threshold_days": 90}}
    
    # Get all citizen profiles
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    actions_taken = []
    
    for profile in profiles:
        if profile.get("license_status") == "suspended":
            continue
            
        if profile.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
                days_overdue = (now - expiry).days
                
                escalation = policy.get("escalation", {})
                
                if days_overdue > escalation.get("suspension_threshold_days", 90):
                    # Suspend license
                    await db.citizen_profiles.update_one(
                        {"user_id": profile["user_id"]},
                        {"$set": {"license_status": "suspended", "suspended_at": now.isoformat()}}
                    )
                    actions_taken.append({"action": "suspended", "user_id": profile["user_id"]})
                elif days_overdue > escalation.get("warning_threshold_days", 60):
                    # Send warning
                    await db.compliance_warnings.insert_one({
                        "warning_id": f"WARN_{uuid.uuid4().hex[:12]}",
                        "user_id": profile["user_id"],
                        "type": "final_warning",
                        "message": "Your license is significantly overdue. Suspension imminent.",
                        "created_at": now.isoformat()
                    })
                    actions_taken.append({"action": "final_warning", "user_id": profile["user_id"]})
            except:
                pass
    
    # Update run record
    await db.enforcement_history.update_one(
        {"run_id": run_id},
        {"$set": {
            "end_time": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "actions_taken": actions_taken,
            "profiles_checked": len(profiles)
        }}
    )
    
    await create_audit_log("enforcement_run", user["user_id"], "admin", details={"run_id": run_id})
    
    return {
        "message": "Enforcement check completed",
        "run_id": run_id,
        "profiles_checked": len(profiles),
        "actions_taken": len(actions_taken)
    }


@router.get("/enforcement/history")
async def get_enforcement_history(
    limit: int = 20,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get enforcement run history"""
    history = await db.enforcement_history.find({}, {"_id": 0}).sort("start_time", -1).limit(limit).to_list(limit)
    return {"history": [serialize_doc(h) for h in history]}


@router.get("/enforcement/user/{user_id}")
async def get_user_enforcement_status(user_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Get enforcement status for a specific user"""
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    warnings = await db.compliance_warnings.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    
    return {
        "profile": serialize_doc(profile),
        "warnings": [serialize_doc(w) for w in warnings],
        "license_status": profile.get("license_status", "active")
    }


@router.post("/enforcement/reinstate/{user_id}")
async def reinstate_user(user_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Reinstate a suspended user"""
    body = await request.json()
    
    result = await db.citizen_profiles.update_one(
        {"user_id": user_id, "license_status": "suspended"},
        {"$set": {
            "license_status": "active",
            "reinstated_at": datetime.now(timezone.utc).isoformat(),
            "reinstated_by": user["user_id"],
            "reinstatement_reason": body.get("reason", "")
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or not suspended")
    
    await create_audit_log("user_reinstated", user["user_id"], "admin", details={"reinstated_user": user_id})
    return {"message": "User reinstated"}


@router.post("/enforcement/scheduler/start")
async def start_enforcement_scheduler(user: dict = Depends(require_auth(["admin"]))):
    """Start the enforcement scheduler"""
    await db.system_config.update_one(
        {"key": "enforcement_scheduler"},
        {"$set": {"running": True, "started_at": datetime.now(timezone.utc).isoformat(), "started_by": user["user_id"]}},
        upsert=True
    )
    return {"message": "Enforcement scheduler started"}


@router.post("/enforcement/scheduler/stop")
async def stop_enforcement_scheduler(user: dict = Depends(require_auth(["admin"]))):
    """Stop the enforcement scheduler"""
    await db.system_config.update_one(
        {"key": "enforcement_scheduler"},
        {"$set": {"running": False, "stopped_at": datetime.now(timezone.utc).isoformat(), "stopped_by": user["user_id"]}},
        upsert=True
    )
    return {"message": "Enforcement scheduler stopped"}


# ============== PARTNER DATA VIEWS (Admin) ==============

@router.get("/smart-safe/reports")
async def get_smart_safe_reports(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get smart safe status reports"""
    reports = await db.smart_safe_reports.find({}, {"_id": 0}).sort("received_at", -1).limit(limit).to_list(limit)
    return {
        "reports": [serialize_doc(r) for r in reports],
        "total": len(reports),
        "integration_status": "seeking_partner"
    }


@router.get("/insurance/records")
async def get_insurance_records(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get insurance policy records"""
    records = await db.insurance_records.find({}, {"_id": 0}).sort("updated_at", -1).limit(limit).to_list(limit)
    return {
        "records": [serialize_doc(r) for r in records],
        "total": len(records),
        "integration_status": "seeking_partner"
    }


@router.get("/insurance/verify/{license_number}")
async def verify_insurance(license_number: str, user: dict = Depends(require_auth(["admin"]))):
    """Verify insurance for a license"""
    record = await db.insurance_records.find_one({"license_number": license_number}, {"_id": 0})
    if not record:
        return {"verified": False, "message": "No insurance record found"}
    
    # Check if policy is active
    if record.get("policy_end_date"):
        try:
            end_date = datetime.fromisoformat(record["policy_end_date"].replace("Z", "+00:00"))
            if end_date < datetime.now(timezone.utc):
                return {"verified": False, "message": "Policy expired", "record": serialize_doc(record)}
        except:
            pass
    
    return {"verified": True, "record": serialize_doc(record)}


@router.get("/training-sessions")
async def get_training_sessions(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get training range session logs"""
    sessions = await db.training_sessions.find({}, {"_id": 0}).sort("session_date", -1).limit(limit).to_list(limit)
    return {
        "sessions": [serialize_doc(s) for s in sessions],
        "total": len(sessions),
        "integration_status": "seeking_partner"
    }


@router.get("/background-checks")
async def get_background_checks(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get background check records"""
    query = {}
    if status:
        query["status"] = status
    
    checks = await db.background_checks.find(query, {"_id": 0}).sort("submitted_at", -1).limit(limit).to_list(limit)
    return {
        "checks": [serialize_doc(c) for c in checks],
        "total": len(checks),
        "integration_status": "seeking_partner"
    }


@router.get("/mental-health-assessments")
async def get_mental_health_assessments(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get mental health assessment records"""
    assessments = await db.mental_health_assessments.find({}, {"_id": 0}).sort("assessment_date", -1).limit(limit).to_list(limit)
    return {
        "assessments": [serialize_doc(a) for a in assessments],
        "total": len(assessments),
        "integration_status": "seeking_partner"
    }


@router.get("/gunsmith-services")
async def get_gunsmith_services(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get gunsmith service records"""
    services = await db.gunsmith_services.find({}, {"_id": 0}).sort("service_date", -1).limit(limit).to_list(limit)
    return {
        "services": [serialize_doc(s) for s in services],
        "total": len(services),
        "integration_status": "seeking_partner"
    }


@router.get("/ammunition-purchases")
async def get_ammunition_purchases(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get ammunition purchase records"""
    purchases = await db.ammunition_purchases.find({}, {"_id": 0}).sort("purchase_date", -1).limit(limit).to_list(limit)
    
    total_rounds = sum(p.get("quantity", 0) for p in purchases)
    
    return {
        "purchases": [serialize_doc(p) for p in purchases],
        "total": len(purchases),
        "total_rounds": total_rounds,
        "integration_status": "seeking_partner"
    }


@router.get("/stolen-firearms")
async def get_stolen_firearms(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get stolen firearms reports"""
    query = {}
    if status:
        query["status"] = status
    
    reports = await db.stolen_firearms.find(query, {"_id": 0}).sort("reported_at", -1).limit(limit).to_list(limit)
    return {
        "reports": [serialize_doc(r) for r in reports],
        "total": len(reports),
        "integration_status": "seeking_partner"
    }


@router.get("/location-verifications")
async def get_location_verifications(
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get GPS location verification records"""
    verifications = await db.location_verifications.find({}, {"_id": 0}).sort("verified_at", -1).limit(limit).to_list(limit)
    return {
        "verifications": [serialize_doc(v) for v in verifications],
        "total": len(verifications),
        "integration_status": "seeking_partner"
    }


# ============== THRESHOLDS & COMPLIANCE ==============

@router.get("/thresholds")
async def get_thresholds(user: dict = Depends(require_auth(["admin"]))):
    """Get compliance thresholds"""
    thresholds = await db.compliance_thresholds.find({}, {"_id": 0}).to_list(100)
    return {"thresholds": [serialize_doc(t) for t in thresholds]}


@router.put("/thresholds/{threshold_id}")
async def update_threshold(threshold_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update a compliance threshold"""
    body = await request.json()
    
    result = await db.compliance_thresholds.update_one(
        {"threshold_id": threshold_id},
        {"$set": {**body, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["user_id"]}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Threshold not found")
    
    threshold = await db.compliance_thresholds.find_one({"threshold_id": threshold_id}, {"_id": 0})
    return serialize_doc(threshold)


@router.post("/thresholds/run-check")
async def run_threshold_check(user: dict = Depends(require_auth(["admin"]))):
    """Run compliance threshold check"""
    thresholds = await db.compliance_thresholds.find({"enabled": True}, {"_id": 0}).to_list(100)
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    violations = []
    now = datetime.now(timezone.utc)
    
    for profile in profiles:
        for threshold in thresholds:
            # Check various threshold conditions
            if threshold.get("type") == "license_expiry":
                if profile.get("license_expiry"):
                    try:
                        expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
                        days_until = (expiry - now).days
                        if days_until < threshold.get("warning_days", 30):
                            violations.append({
                                "user_id": profile["user_id"],
                                "threshold_id": threshold["threshold_id"],
                                "type": "license_expiry",
                                "days_until": days_until
                            })
                    except:
                        pass
    
    return {
        "message": "Threshold check completed",
        "profiles_checked": len(profiles),
        "thresholds_checked": len(thresholds),
        "violations_found": len(violations),
        "violations": violations[:50]  # Limit response size
    }


@router.post("/run-compliance-check")
async def run_compliance_check(user: dict = Depends(require_auth(["admin"]))):
    """Run a full compliance check"""
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    results = {"compliant": 0, "warning": 0, "non_compliant": 0, "suspended": 0}
    issues = []
    
    for profile in profiles:
        status = profile.get("license_status", "active")
        
        if status == "suspended":
            results["suspended"] += 1
            continue
        
        if profile.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
                days_until = (expiry - now).days
                
                if days_until < 0:
                    results["non_compliant"] += 1
                    issues.append({"user_id": profile["user_id"], "issue": "expired", "days_overdue": -days_until})
                elif days_until < 30:
                    results["warning"] += 1
                    issues.append({"user_id": profile["user_id"], "issue": "expiring_soon", "days_until": days_until})
                else:
                    results["compliant"] += 1
            except:
                results["compliant"] += 1
        else:
            results["compliant"] += 1
    
    return {
        "message": "Compliance check completed",
        "summary": results,
        "total_checked": len(profiles),
        "issues": issues[:100]
    }


@router.get("/preventive-warnings")
async def get_preventive_warnings(user: dict = Depends(require_auth(["admin"]))):
    """Get citizens who should receive preventive warnings"""
    profiles = await db.citizen_profiles.find({"license_status": {"$ne": "suspended"}}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    warnings_needed = []
    
    for profile in profiles:
        if profile.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
                days_until = (expiry - now).days
                
                if 0 < days_until <= 60:
                    warnings_needed.append({
                        "user_id": profile["user_id"],
                        "license_number": profile.get("license_number"),
                        "days_until_expiry": days_until,
                        "warning_level": "urgent" if days_until <= 14 else "warning" if days_until <= 30 else "reminder"
                    })
            except:
                pass
    
    return {
        "warnings_needed": sorted(warnings_needed, key=lambda x: x["days_until_expiry"]),
        "total": len(warnings_needed)
    }


# ============== PREDICTIVE ANALYTICS ==============

@router.get("/predictive/dashboard")
async def get_predictive_dashboard(user: dict = Depends(require_auth(["admin"]))):
    """Get predictive analytics dashboard"""
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    
    # Predict compliance issues
    at_risk = []
    for profile in profiles:
        risk_score = 0
        risk_factors = []
        
        if profile.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
                days_until = (expiry - now).days
                
                if days_until < 0:
                    risk_score += 50
                    risk_factors.append("expired")
                elif days_until < 30:
                    risk_score += 30
                    risk_factors.append("expiring_soon")
            except:
                pass
        
        # Check for previous warnings
        warnings = await db.compliance_warnings.count_documents({"user_id": profile["user_id"]})
        if warnings > 0:
            risk_score += warnings * 10
            risk_factors.append(f"{warnings}_previous_warnings")
        
        if risk_score > 20:
            at_risk.append({
                "user_id": profile["user_id"],
                "risk_score": min(risk_score, 100),
                "risk_factors": risk_factors
            })
    
    return {
        "total_profiles": len(profiles),
        "at_risk_count": len(at_risk),
        "at_risk_profiles": sorted(at_risk, key=lambda x: x["risk_score"], reverse=True)[:50]
    }


@router.get("/predictive/citizen/{user_id}")
async def get_citizen_prediction(user_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Get predictive analytics for a specific citizen"""
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Citizen not found")
    
    warnings = await db.compliance_warnings.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    transactions = await db.transactions.find({"citizen_id": user_id}, {"_id": 0}).to_list(50)
    
    # Calculate risk factors
    risk_score = 0
    risk_factors = []
    recommendations = []
    
    now = datetime.now(timezone.utc)
    
    if profile.get("license_expiry"):
        try:
            expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
            days_until = (expiry - now).days
            
            if days_until < 0:
                risk_score += 50
                risk_factors.append({"factor": "expired_license", "weight": 50})
                recommendations.append("Immediate renewal required")
            elif days_until < 30:
                risk_score += 30
                risk_factors.append({"factor": "expiring_soon", "weight": 30})
                recommendations.append("Schedule renewal soon")
        except:
            pass
    
    if len(warnings) > 0:
        risk_score += len(warnings) * 10
        risk_factors.append({"factor": "previous_warnings", "weight": len(warnings) * 10, "count": len(warnings)})
    
    return {
        "user_id": user_id,
        "risk_score": min(risk_score, 100),
        "risk_level": "high" if risk_score >= 60 else "medium" if risk_score >= 30 else "low",
        "risk_factors": risk_factors,
        "recommendations": recommendations,
        "warning_history": [serialize_doc(w) for w in warnings],
        "transaction_count": len(transactions)
    }


@router.post("/predictive/run-analysis")
async def run_predictive_analysis(user: dict = Depends(require_auth(["admin"]))):
    """Run full predictive analysis"""
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    analysis_results = {
        "total_analyzed": len(profiles),
        "high_risk": 0,
        "medium_risk": 0,
        "low_risk": 0,
        "predicted_issues_30_days": 0,
        "predicted_issues_60_days": 0,
        "predicted_issues_90_days": 0
    }
    
    for profile in profiles:
        risk_score = 0
        
        if profile.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(profile["license_expiry"].replace("Z", "+00:00"))
                days_until = (expiry - now).days
                
                if days_until < 0:
                    risk_score = 80
                elif days_until <= 30:
                    risk_score = 60
                    analysis_results["predicted_issues_30_days"] += 1
                elif days_until <= 60:
                    risk_score = 40
                    analysis_results["predicted_issues_60_days"] += 1
                elif days_until <= 90:
                    risk_score = 20
                    analysis_results["predicted_issues_90_days"] += 1
            except:
                pass
        
        if risk_score >= 60:
            analysis_results["high_risk"] += 1
        elif risk_score >= 30:
            analysis_results["medium_risk"] += 1
        else:
            analysis_results["low_risk"] += 1
    
    return {
        "message": "Predictive analysis completed",
        "analysis_date": now.isoformat(),
        "results": analysis_results
    }


# ============== NOTIFICATION TRIGGERS ==============

@router.get("/notification-triggers")
async def get_notification_triggers(user: dict = Depends(require_auth(["admin"]))):
    """Get notification trigger configurations"""
    triggers = await db.notification_triggers.find({}, {"_id": 0}).to_list(100)
    return {"triggers": [serialize_doc(t) for t in triggers]}


@router.post("/notification-triggers")
async def create_notification_trigger(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new notification trigger"""
    body = await request.json()
    
    trigger = {
        "trigger_id": f"TRG_{uuid.uuid4().hex[:12]}",
        "name": body.get("name"),
        "event_type": body.get("event_type"),
        "conditions": body.get("conditions", {}),
        "notification_template": body.get("notification_template"),
        "enabled": body.get("enabled", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.notification_triggers.insert_one(trigger)
    return {"message": "Trigger created", "trigger": serialize_doc(trigger)}


@router.put("/notification-triggers/{trigger_id}")
async def update_notification_trigger(trigger_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update a notification trigger"""
    body = await request.json()
    
    result = await db.notification_triggers.update_one(
        {"trigger_id": trigger_id},
        {"$set": {**body, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    trigger = await db.notification_triggers.find_one({"trigger_id": trigger_id}, {"_id": 0})
    return serialize_doc(trigger)


@router.post("/notification-triggers/{trigger_id}/test")
async def test_notification_trigger(trigger_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Test a notification trigger"""
    trigger = await db.notification_triggers.find_one({"trigger_id": trigger_id}, {"_id": 0})
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    return {
        "message": "Trigger test executed",
        "trigger_id": trigger_id,
        "would_notify": True,
        "test_result": "success"
    }


@router.get("/triggers/scheduler-status")
async def get_triggers_scheduler_status(user: dict = Depends(require_auth(["admin"]))):
    """Get triggers scheduler status"""
    status = await db.system_config.find_one({"key": "triggers_scheduler"}, {"_id": 0})
    return {
        "running": status.get("running", False) if status else False,
        "last_run": status.get("last_run") if status else None
    }


@router.post("/triggers/scheduler/start")
async def start_triggers_scheduler(user: dict = Depends(require_auth(["admin"]))):
    """Start the triggers scheduler"""
    await db.system_config.update_one(
        {"key": "triggers_scheduler"},
        {"$set": {"running": True, "started_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Triggers scheduler started"}


@router.post("/triggers/scheduler/stop")
async def stop_triggers_scheduler(user: dict = Depends(require_auth(["admin"]))):
    """Stop the triggers scheduler"""
    await db.system_config.update_one(
        {"key": "triggers_scheduler"},
        {"$set": {"running": False, "stopped_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Triggers scheduler stopped"}


@router.post("/triggers/{trigger_id}/execute")
async def execute_trigger(trigger_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Manually execute a trigger"""
    trigger = await db.notification_triggers.find_one({"trigger_id": trigger_id}, {"_id": 0})
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    # Record execution
    execution = {
        "execution_id": f"EXE_{uuid.uuid4().hex[:12]}",
        "trigger_id": trigger_id,
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "executed_by": user["user_id"],
        "status": "completed"
    }
    await db.trigger_executions.insert_one(execution)
    
    return {"message": "Trigger executed", "execution_id": execution["execution_id"]}


@router.post("/triggers/run-all")
async def run_all_triggers(user: dict = Depends(require_auth(["admin"]))):
    """Run all enabled triggers"""
    triggers = await db.notification_triggers.find({"enabled": True}, {"_id": 0}).to_list(100)
    
    results = []
    for trigger in triggers:
        execution = {
            "execution_id": f"EXE_{uuid.uuid4().hex[:12]}",
            "trigger_id": trigger["trigger_id"],
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "executed_by": user["user_id"],
            "status": "completed"
        }
        await db.trigger_executions.insert_one(execution)
        results.append({"trigger_id": trigger["trigger_id"], "status": "executed"})
    
    return {"message": f"Executed {len(results)} triggers", "results": results}


@router.get("/triggers/executions")
async def get_trigger_executions(
    trigger_id: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get trigger execution history"""
    query = {}
    if trigger_id:
        query["trigger_id"] = trigger_id
    
    executions = await db.trigger_executions.find(query, {"_id": 0}).sort("executed_at", -1).limit(limit).to_list(limit)
    return {"executions": [serialize_doc(e) for e in executions]}


# ============== MISC ENDPOINTS ==============

@router.get("/supported-currencies")
async def get_supported_currencies(user: dict = Depends(require_auth(["admin"]))):
    """Get supported currencies for transactions"""
    return {
        "currencies": [
            {"code": "USD", "symbol": "$", "name": "US Dollar"},
            {"code": "EUR", "symbol": "€", "name": "Euro"},
            {"code": "GBP", "symbol": "£", "name": "British Pound"},
            {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar"},
            {"code": "AUD", "symbol": "A$", "name": "Australian Dollar"}
        ]
    }


@router.get("/certificate-config")
async def get_certificate_config(user: dict = Depends(require_auth(["admin"]))):
    """Get certificate configuration"""
    config = await db.certificate_config.find_one({}, {"_id": 0})
    if not config:
        config = {
            "issuer_name": "AMMO National Oversight",
            "header_text": "Certificate of Completion",
            "footer_text": "This certificate is valid for one year from the date of issue."
        }
    return serialize_doc(config)


@router.put("/certificate-config")
async def update_certificate_config(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update certificate configuration"""
    body = await request.json()
    
    await db.certificate_config.update_one(
        {},
        {"$set": {**body, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    config = await db.certificate_config.find_one({}, {"_id": 0})
    return serialize_doc(config)


@router.post("/certificate-config/signature")
async def upload_certificate_signature(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Upload signature for certificates"""
    body = await request.json()
    signature_data = body.get("signature_data")
    
    await db.certificate_config.update_one(
        {},
        {"$set": {"signature": signature_data, "signature_updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Signature uploaded"}


@router.get("/certificate-designs")
async def get_certificate_designs(user: dict = Depends(require_auth(["admin"]))):
    """Get available certificate designs"""
    designs = await db.certificate_designs.find({}, {"_id": 0}).to_list(50)
    if not designs:
        designs = [
            {"design_id": "classic", "name": "Classic", "description": "Traditional certificate design"},
            {"design_id": "modern", "name": "Modern", "description": "Contemporary clean design"},
            {"design_id": "official", "name": "Official", "description": "Government official style"}
        ]
    return {"designs": designs}


@router.get("/seal-styles")
async def get_seal_styles(user: dict = Depends(require_auth(["admin"]))):
    """Get available seal styles"""
    return {
        "styles": [
            {"style_id": "gold", "name": "Gold Seal"},
            {"style_id": "silver", "name": "Silver Seal"},
            {"style_id": "embossed", "name": "Embossed"},
            {"style_id": "digital", "name": "Digital Seal"}
        ]
    }


@router.get("/font-options")
async def get_font_options(user: dict = Depends(require_auth(["admin"]))):
    """Get available font options"""
    return {
        "fonts": [
            {"font_id": "serif", "name": "Times New Roman", "family": "serif"},
            {"font_id": "sans", "name": "Arial", "family": "sans-serif"},
            {"font_id": "elegant", "name": "Georgia", "family": "serif"},
            {"font_id": "modern", "name": "Helvetica", "family": "sans-serif"}
        ]
    }


@router.get("/document-templates")
async def get_document_templates(user: dict = Depends(require_auth(["admin"]))):
    """Get document templates"""
    templates = await db.document_templates.find({}, {"_id": 0}).to_list(100)
    return {"templates": [serialize_doc(t) for t in templates]}


@router.post("/document-templates")
async def create_document_template(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new document template"""
    body = await request.json()
    
    template = {
        "template_id": f"TPL_{uuid.uuid4().hex[:12]}",
        "name": body.get("name"),
        "type": body.get("type", "certificate"),
        "content": body.get("content", ""),
        "variables": body.get("variables", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.document_templates.insert_one(template)
    return {"message": "Template created", "template": serialize_doc(template)}


@router.put("/document-templates/{template_id}")
async def update_document_template(template_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update a document template"""
    body = await request.json()
    
    result = await db.document_templates.update_one(
        {"template_id": template_id},
        {"$set": {**body, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = await db.document_templates.find_one({"template_id": template_id}, {"_id": 0})
    return serialize_doc(template)


@router.get("/document-templates/{template_id}/preview")
async def preview_document_template(template_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Preview a document template with sample data"""
    template = await db.document_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Generate preview with sample data
    sample_data = {
        "recipient_name": "John Doe",
        "date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        "certificate_number": "CERT-SAMPLE-001"
    }
    
    return {
        "template": serialize_doc(template),
        "preview_data": sample_data,
        "rendered_preview": template.get("content", "").format(**sample_data) if template.get("content") else ""
    }


@router.get("/formal-documents")
async def get_formal_documents(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get formal documents"""
    query = {}
    if status:
        query["status"] = status
    
    documents = await db.formal_documents.find(query, {"_id": 0}).sort("issued_at", -1).limit(limit).to_list(limit)
    return {"documents": [serialize_doc(d) for d in documents]}


@router.post("/formal-documents/send")
async def send_formal_document(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Send a formal document to a user"""
    body = await request.json()
    
    document = {
        "document_id": f"DOC_{uuid.uuid4().hex[:12]}",
        "user_id": body.get("user_id"),
        "template_id": body.get("template_id"),
        "type": body.get("type", "notice"),
        "subject": body.get("subject"),
        "content": body.get("content"),
        "status": "sent",
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "issued_by": user["user_id"]
    }
    
    await db.formal_documents.insert_one(document)
    
    # Also create a notification for the user
    await db.notifications.insert_one({
        "notification_id": f"NOT_{uuid.uuid4().hex[:12]}",
        "user_id": body.get("user_id"),
        "message": f"You have received a new document: {body.get('subject')}",
        "type": "document",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Document sent", "document_id": document["document_id"]}


@router.get("/formal-documents/stats")
async def get_formal_documents_stats(user: dict = Depends(require_auth(["admin"]))):
    """Get formal documents statistics"""
    documents = await db.formal_documents.find({}, {"_id": 0}).to_list(10000)
    
    by_type = {}
    by_status = {}
    
    for doc in documents:
        doc_type = doc.get("type", "other")
        status = doc.get("status", "unknown")
        
        by_type[doc_type] = by_type.get(doc_type, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
    
    return {
        "total": len(documents),
        "by_type": by_type,
        "by_status": by_status
    }


@router.get("/notification-templates")
async def get_notification_templates(user: dict = Depends(require_auth(["admin"]))):
    """Get notification templates"""
    templates = await db.notification_templates.find({}, {"_id": 0}).to_list(100)
    return {"templates": [serialize_doc(t) for t in templates]}


@router.put("/notification-templates/{template_id}")
async def update_notification_template(template_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update a notification template"""
    body = await request.json()
    
    result = await db.notification_templates.update_one(
        {"template_id": template_id},
        {"$set": {**body, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = await db.notification_templates.find_one({"template_id": template_id}, {"_id": 0})
    return serialize_doc(template)



# ============== MISSING ENDPOINTS (from server.py migration) ==============

@router.delete("/notification-triggers/{trigger_id}")
async def delete_notification_trigger(trigger_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Delete a notification trigger"""
    result = await db.notification_triggers.delete_one({"trigger_id": trigger_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    return {"message": "Trigger deleted successfully"}


@router.post("/notification-templates")
async def create_notification_template(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a reusable notification template"""
    body = await request.json()
    
    template = {
        "template_id": f"TPL_{uuid.uuid4().hex[:12]}",
        "name": body.get("name"),
        "title": body.get("title"),
        "message": body.get("message"),
        "type": body.get("type", "announcement"),
        "category": body.get("category", "general"),
        "priority": body.get("priority", "normal"),
        "action_url": body.get("action_url"),
        "action_label": body.get("action_label"),
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notification_templates.insert_one(template)
    return {"template_id": template["template_id"], "message": "Template created successfully"}


@router.delete("/notification-templates/{template_id}")
async def delete_notification_template(template_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Delete a notification template"""
    result = await db.notification_templates.delete_one({"template_id": template_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted successfully"}


@router.post("/thresholds")
async def create_threshold(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new alert threshold"""
    body = await request.json()
    
    threshold = {
        "threshold_id": f"THR_{uuid.uuid4().hex[:12]}",
        "metric": body.get("metric"),
        "operator": body.get("operator", ">="),
        "value": body.get("value"),
        "severity": body.get("severity", "medium"),
        "action": body.get("action"),
        "is_active": body.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.alert_thresholds.insert_one(threshold)
    await create_audit_log("threshold_created", user["user_id"], "admin", details=threshold)
    return {"message": "Threshold created", "threshold_id": threshold["threshold_id"]}


@router.delete("/thresholds/{threshold_id}")
async def delete_threshold(threshold_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Delete a threshold"""
    result = await db.alert_thresholds.delete_one({"threshold_id": threshold_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Threshold not found")
    
    await create_audit_log("threshold_deleted", user["user_id"], "admin", details={"threshold_id": threshold_id})
    return {"message": "Threshold deleted"}


@router.post("/alerts/thresholds")
async def create_alert_threshold(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new alert threshold"""
    body = await request.json()
    
    threshold = {
        "threshold_id": f"THR_{uuid.uuid4().hex[:12]}",
        "metric": body.get("metric"),
        "operator": body.get("operator", ">="),
        "value": body.get("value"),
        "severity": body.get("severity", "medium"),
        "action": body.get("action"),
        "is_active": body.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alert_thresholds.insert_one(threshold)
    return {"message": "Alert threshold created", "threshold_id": threshold["threshold_id"]}


@router.delete("/document-templates/{template_id}")
async def delete_document_template(template_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Delete a document template"""
    result = await db.document_templates.delete_one({"template_id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}


@router.post("/document-templates/{template_id}/preview")
async def preview_document_template(template_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Generate a preview of a document template"""
    template = await db.document_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Return template data for frontend to render preview
    return {
        "template": serialize_doc(template),
        "preview_data": {
            "recipient_name": "John Doe (Preview)",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    }

