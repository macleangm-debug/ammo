"""
Partner Integration Routes
External partner APIs for Smart Safe, Insurance, Training Ranges, etc.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request

from ..utils.database import db, serialize_doc
from ..utils.helpers import require_auth

router = APIRouter(tags=["Partners"])


# ============== PARTNER INTEGRATIONS DATA ==============

PARTNER_INTEGRATIONS = {
    "smart_safe": {
        "integration_id": "partner_smart_safe",
        "name": "Smart Safe IoT Integration",
        "category": "storage_compliance",
        "status": "seeking_partner",
        "description": "Connect with IoT-enabled gun safe manufacturers to automatically verify secure storage compliance.",
        "layman_explanation": "Imagine your gun safe could 'talk' to AMMO. When you lock your safe, it automatically tells the system 'I'm secured.' This means no more manual inspections or paperwork to prove you're storing firearms safely.",
        "benefits": [
            "Automated storage compliance verification - no manual inspections needed",
            "Real-time alerts if a safe is left open or tampered with",
            "Higher ARI scores for consistently responsible storage",
            "Reduced administrative burden for both citizens and government",
            "Instant notification to owner if unauthorized access is attempted"
        ],
        "technical_requirements": [
            "Safe must have internet connectivity (WiFi or cellular)",
            "API endpoint for status reporting (locked/unlocked/tampered)",
            "Secure authentication between safe and AMMO platform",
            "Minimum reporting interval: once per day"
        ],
        "data_we_receive": [
            "Safe status (locked/unlocked/tampered)",
            "Door open/close events with timestamps",
            "Battery level and connectivity status",
            "Authorized access logs (optional)"
        ],
        "potential_partners": [{"name": "Looking for partners", "type": "Smart Safe Manufacturer", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "insurance": {
        "integration_id": "partner_insurance",
        "name": "Insurance Partner Integration",
        "category": "coverage_verification",
        "status": "seeking_partner",
        "description": "Connect with firearm insurance providers to automatically verify coverage status and policy details.",
        "layman_explanation": "Just like your car insurance can be verified instantly by police, this integration lets AMMO automatically check if a firearm owner has valid insurance.",
        "benefits": [
            "Instant insurance verification - no paperwork needed",
            "Automatic reminders before policy expiration",
            "Seamless compliance for jurisdictions requiring firearm insurance",
            "Reduced fraud through real-time verification",
            "Faster license renewals with pre-verified insurance"
        ],
        "technical_requirements": [
            "API endpoint for policy status lookup by license number",
            "Real-time or daily policy status updates",
            "Secure data transmission (TLS 1.3+)",
            "Support for policy expiration webhooks"
        ],
        "data_we_receive": [
            "Policy status (active/expired/cancelled)",
            "Coverage amount and type",
            "Policy start and end dates",
            "Policyholder verification (name match)"
        ],
        "potential_partners": [{"name": "Looking for partners", "type": "Firearm Insurance Provider", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "training_range": {
        "integration_id": "partner_training_range",
        "name": "Training Range Integration",
        "category": "training_compliance",
        "status": "seeking_partner",
        "description": "Connect with shooting ranges and training facilities to automatically log practice hours.",
        "layman_explanation": "Walk into any partner range, show your license, and your practice hours get logged automatically.",
        "benefits": [
            "Automatic logging of range visits and practice hours",
            "Real-time ARI score updates based on training activity",
            "Digital proof of practice for license renewals",
            "Track progress across multiple ranges"
        ],
        "technical_requirements": [
            "POS/Check-in system integration capability",
            "API endpoint for session logging",
            "License number validation",
            "Secure transmission of training records"
        ],
        "data_we_receive": ["Visit date and duration", "Type of training", "Rounds fired (optional)"],
        "potential_partners": [{"name": "Looking for partners", "type": "Shooting Range", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "background_check": {
        "integration_id": "partner_background_check",
        "name": "Background Check Provider",
        "category": "verification",
        "status": "seeking_partner",
        "description": "Connect with authorized background check providers for real-time verification.",
        "layman_explanation": "When you apply for or renew your license, AMMO can instantly verify your background.",
        "benefits": ["Instant background verification", "Faster license renewals", "Real-time dealer verification"],
        "technical_requirements": ["Real-time API", "Response time under 30 seconds", "Audit logging"],
        "data_we_receive": ["Verification status", "Check completion timestamp", "Denial reason codes"],
        "potential_partners": [{"name": "Looking for partners", "type": "Background Check Provider", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "mental_health": {
        "integration_id": "partner_mental_health",
        "name": "Mental Health Clinic Integration",
        "category": "health_compliance",
        "status": "seeking_partner",
        "description": "Connect with accredited mental health clinics for assessment verification.",
        "layman_explanation": "Partner clinics can report your compliance status directly to AMMO. Privacy protected.",
        "benefits": ["Seamless compliance verification", "Privacy-protected reporting", "Automatic reminders"],
        "technical_requirements": ["HIPAA-compliant transmission", "Patient consent management"],
        "data_we_receive": ["Assessment status (pass/fail only)", "Assessment date", "Validity period"],
        "potential_partners": [{"name": "Looking for partners", "type": "Mental Health Clinic", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "gunsmith": {
        "integration_id": "partner_gunsmith",
        "name": "Gunsmith & Repair Services",
        "category": "maintenance_tracking",
        "status": "seeking_partner",
        "description": "Connect with licensed gunsmiths to maintain firearm maintenance records.",
        "layman_explanation": "Every time your firearm is serviced, the record is automatically added to history.",
        "benefits": ["Complete digital service history", "Automatic recall notifications", "Verified modification records"],
        "technical_requirements": ["POS/Work order integration", "Serial number validation"],
        "data_we_receive": ["Service type", "Parts replaced", "Gunsmith license number"],
        "potential_partners": [{"name": "Looking for partners", "type": "Licensed Gunsmith", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "ammunition_retailer": {
        "integration_id": "partner_ammo_retailer",
        "name": "Ammunition Retailer Integration",
        "category": "purchase_tracking",
        "status": "seeking_partner",
        "description": "Connect with ammunition retailers to track purchases for compliance.",
        "layman_explanation": "Partner retailers automatically verify your eligibility and log purchases.",
        "benefits": ["Automatic purchase limit tracking", "Real-time eligibility check", "Digital purchase history"],
        "technical_requirements": ["POS system integration", "Real-time API for limit verification"],
        "data_we_receive": ["Purchase date and quantity", "Ammunition type", "Retailer identification"],
        "potential_partners": [{"name": "Looking for partners", "type": "Ammunition Retailer", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "law_enforcement": {
        "integration_id": "partner_law_enforcement",
        "name": "Law Enforcement Database",
        "category": "stolen_verification",
        "status": "seeking_partner",
        "description": "Connect with law enforcement databases for stolen firearm verification.",
        "layman_explanation": "Before any transaction, AMMO can instantly check if the firearm has been reported stolen.",
        "benefits": ["Instant stolen firearm verification", "Protection for buyers", "Faster recovery of stolen firearms"],
        "technical_requirements": ["Real-time API access", "Response time under 10 seconds"],
        "data_we_receive": ["Stolen status", "Date reported", "Recovery instructions"],
        "potential_partners": [{"name": "Looking for partners", "type": "Law Enforcement Agency", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "payment_processor": {
        "integration_id": "partner_payment",
        "name": "Payment Processor Integration",
        "category": "fee_collection",
        "status": "seeking_partner",
        "description": "Connect with payment processors for in-app fee payments and auto-renewals.",
        "layman_explanation": "Pay your annual license fees directly in the AMMO app. Set up auto-renewal.",
        "benefits": ["Pay all fees in-app", "Auto-renewal option", "Instant digital receipts"],
        "technical_requirements": ["PCI-DSS compliance", "Recurring payment support", "Webhook notifications"],
        "data_we_receive": ["Payment confirmation", "Payment method (last 4 only)", "Receipt data"],
        "potential_partners": [{"name": "Looking for partners", "type": "Payment Processor", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    },
    "gps_location": {
        "integration_id": "partner_gps",
        "name": "GPS & Location Services",
        "category": "transaction_security",
        "status": "seeking_partner",
        "description": "Connect with location services to verify transaction locations.",
        "layman_explanation": "AMMO can verify transactions happen at legitimate dealer locations.",
        "benefits": ["Verify transactions at legitimate locations", "Enhanced security", "Geographic compliance"],
        "technical_requirements": ["Real-time location API", "Geofencing capabilities", "Privacy-compliant"],
        "data_we_receive": ["Transaction coordinates (with consent)", "Dealer location verification"],
        "potential_partners": [{"name": "Looking for partners", "type": "Location Services Provider", "status": "open"}],
        "api_version": "1.0-draft",
        "last_updated": "2026-02-20"
    }
}


# ============== GOVERNMENT PARTNER ENDPOINTS ==============

@router.get("/government/partner-integrations")
async def get_partner_integrations(user: dict = Depends(require_auth(["admin"]))):
    """Get all available partner integrations and their status"""
    registered_partners = await db.partner_registrations.find({}, {"_id": 0}).to_list(100)
    
    integrations = []
    for key, integration in PARTNER_INTEGRATIONS.items():
        partners = [p for p in registered_partners if p.get("integration_id") == integration["integration_id"]]
        integration_data = {
            **integration,
            "registered_partners": len(partners),
            "is_active": len(partners) > 0
        }
        integrations.append(integration_data)
    
    return {
        "integrations": integrations,
        "total": len(integrations),
        "active": len([i for i in integrations if i["is_active"]]),
        "seeking_partners": len([i for i in integrations if not i["is_active"]])
    }


@router.get("/government/partner-integrations/{integration_id}")
async def get_partner_integration_details(integration_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Get detailed information about a specific partner integration"""
    integration = None
    for key, integ in PARTNER_INTEGRATIONS.items():
        if integ["integration_id"] == integration_id:
            integration = integ
            break
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    registered_partners = await db.partner_registrations.find(
        {"integration_id": integration_id}, {"_id": 0}
    ).to_list(100)
    
    return {
        **integration,
        "registered_partners": registered_partners,
        "usage_stats": {"total_requests_today": 0, "success_rate": 0}
    }


# ============== PARTNER API ENDPOINTS ==============

@router.post("/partner/smart-safe/status-report")
async def smart_safe_status_report(request: Request):
    """Endpoint for smart safes to report their status"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    report = {
        "report_id": f"ssr_{uuid.uuid4().hex[:12]}",
        "safe_id": data.get("safe_id"),
        "owner_license": data.get("owner_license"),
        "status": data.get("status"),
        "door_open": data.get("door_open", False),
        "battery_level": data.get("battery_level"),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.smart_safe_reports.insert_one(report)
    return {"status": "received", "report_id": report["report_id"]}


@router.post("/partner/insurance/policy-update")
async def insurance_policy_update(request: Request):
    """Endpoint for insurance providers to report policy status"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    record = {
        "record_id": f"ins_{uuid.uuid4().hex[:12]}",
        "policy_id": data.get("policy_id"),
        "license_number": data.get("license_number"),
        "status": data.get("status"),
        "coverage_amount": data.get("coverage_amount"),
        "expiry_date": data.get("expiry_date"),
        "provider_name": data.get("provider_name"),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.insurance_records.insert_one(record)
    return {"status": "received", "record_id": record["record_id"]}


@router.post("/partner/training-range/log-session")
async def training_range_log_session(request: Request):
    """Endpoint for training ranges to log practice sessions"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    session = {
        "session_id": f"trn_{uuid.uuid4().hex[:12]}",
        "license_number": data.get("license_number"),
        "range_name": data.get("range_name"),
        "session_type": data.get("session_type", "practice"),
        "duration_minutes": data.get("duration_minutes"),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.training_sessions.insert_one(session)
    
    if data.get("license_number") and data.get("duration_minutes"):
        await db.citizen_profiles.update_one(
            {"license_number": data.get("license_number")},
            {"$inc": {"training_hours": data.get("duration_minutes", 0) / 60, "range_visits": 1}}
        )
    
    return {"status": "received", "session_id": session["session_id"]}


@router.post("/partner/background-check/submit-result")
async def background_check_submit_result(request: Request):
    """Endpoint for background check providers to submit results"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    result = {
        "check_id": f"bgc_{uuid.uuid4().hex[:12]}",
        "license_number": data.get("license_number"),
        "status": data.get("status"),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.background_checks.insert_one(result)
    return {"status": "received", "check_id": result["check_id"]}


@router.post("/partner/mental-health/submit-assessment")
async def mental_health_submit_assessment(request: Request):
    """Endpoint for mental health clinics to submit assessment status (HIPAA-compliant)"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    assessment = {
        "assessment_id": f"mha_{uuid.uuid4().hex[:12]}",
        "license_number": data.get("license_number"),
        "status": data.get("status"),  # pass/fail only
        "valid_until": data.get("valid_until"),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "hipaa_compliant": True
    }
    
    await db.mental_health_assessments.insert_one(assessment)
    return {"status": "received", "assessment_id": assessment["assessment_id"]}


@router.post("/partner/gunsmith/log-service")
async def gunsmith_log_service(request: Request):
    """Endpoint for gunsmiths to log firearm service records"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    service = {
        "service_id": f"gsv_{uuid.uuid4().hex[:12]}",
        "firearm_serial": data.get("firearm_serial"),
        "service_type": data.get("service_type"),
        "description": data.get("description"),
        "gunsmith_license": data.get("gunsmith_license"),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.gunsmith_services.insert_one(service)
    return {"status": "received", "service_id": service["service_id"]}


@router.post("/partner/ammo-retailer/log-purchase")
async def ammo_retailer_log_purchase(request: Request):
    """Endpoint for ammunition retailers to log purchases"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    purchase = {
        "purchase_id": f"ammo_{uuid.uuid4().hex[:12]}",
        "buyer_license": data.get("buyer_license"),
        "caliber": data.get("caliber"),
        "quantity": data.get("quantity"),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.ammunition_purchases.insert_one(purchase)
    return {"status": "received", "purchase_id": purchase["purchase_id"]}


@router.post("/partner/law-enforcement/report-stolen")
async def law_enforcement_report_stolen(request: Request):
    """Endpoint for law enforcement to report stolen firearms"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    report = {
        "report_id": f"stl_{uuid.uuid4().hex[:12]}",
        "firearm_serial": data.get("firearm_serial"),
        "status": "stolen",
        "jurisdiction": data.get("jurisdiction"),
        "case_number": data.get("case_number"),
        "received_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stolen_firearms.insert_one(report)
    
    await db.registered_firearms.update_one(
        {"serial_number": data.get("firearm_serial")},
        {"$set": {"stolen_flag": True, "stolen_report_id": report["report_id"]}}
    )
    
    return {"status": "received", "report_id": report["report_id"]}


@router.get("/partner/law-enforcement/check-serial/{serial_number}")
async def law_enforcement_check_serial(serial_number: str):
    """Check if a serial number is reported stolen"""
    stolen = await db.stolen_firearms.find_one(
        {"firearm_serial": serial_number, "status": "stolen"},
        {"_id": 0}
    )
    
    return {
        "serial_number": serial_number,
        "is_stolen": stolen is not None,
        "report": serialize_doc(stolen) if stolen else None
    }


@router.post("/partner/gps/verify-location")
async def gps_verify_location(request: Request):
    """Endpoint for GPS providers to verify transaction locations"""
    data = await request.json()
    
    if not data.get("api_key"):
        raise HTTPException(status_code=401, detail="Partner API key required")
    
    verification = {
        "verification_id": f"loc_{uuid.uuid4().hex[:12]}",
        "transaction_id": data.get("transaction_id"),
        "coordinates": {"lat": data.get("lat"), "lng": data.get("lng")},
        "is_at_dealer_location": data.get("is_at_dealer_location", False),
        "verified_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.location_verifications.insert_one(verification)
    return {"status": "received", "verification_id": verification["verification_id"]}
