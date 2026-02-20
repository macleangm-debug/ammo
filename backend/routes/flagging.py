"""
Flagged Transaction Auto-Detection System
Configurable rule engine for automatically flagging suspicious transactions.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
import logging

from ..utils.database import db, serialize_doc
from ..utils.helpers import require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/government", tags=["Flagging"])


# Default flagging rules
DEFAULT_FLAGGING_RULES = [
    {
        "rule_id": "high_quantity",
        "name": "High Quantity Purchase",
        "description": "Flag transactions with unusually high quantities",
        "category": "quantity",
        "enabled": True,
        "conditions": {
            "quantity_threshold": 50,
            "item_types": ["firearm", "ammunition"]
        },
        "severity": "high",
        "auto_review": True
    },
    {
        "rule_id": "frequency_spike",
        "name": "Purchase Frequency Spike",
        "description": "Flag when a buyer makes multiple purchases in a short period",
        "category": "frequency",
        "enabled": True,
        "conditions": {
            "max_transactions_per_day": 2,
            "max_transactions_per_week": 5,
            "lookback_days": 7
        },
        "severity": "medium",
        "auto_review": True
    },
    {
        "rule_id": "new_buyer_high_value",
        "name": "New Buyer High Value",
        "description": "Flag high-value purchases from new license holders",
        "category": "profile",
        "enabled": True,
        "conditions": {
            "license_age_days": 90,
            "quantity_threshold": 10
        },
        "severity": "medium",
        "auto_review": True
    },
    {
        "rule_id": "low_compliance_buyer",
        "name": "Low Compliance Score Buyer",
        "description": "Flag purchases from buyers with low compliance scores",
        "category": "compliance",
        "enabled": True,
        "conditions": {
            "min_compliance_score": 60
        },
        "severity": "high",
        "auto_review": True
    },
    {
        "rule_id": "geographic_anomaly",
        "name": "Geographic Anomaly",
        "description": "Flag transactions far from buyer's registered address",
        "category": "location",
        "enabled": False,
        "conditions": {
            "max_distance_km": 200
        },
        "severity": "medium",
        "auto_review": False
    },
    {
        "rule_id": "after_hours",
        "name": "After Hours Transaction",
        "description": "Flag transactions outside normal business hours",
        "category": "time",
        "enabled": True,
        "conditions": {
            "start_hour": 6,
            "end_hour": 22
        },
        "severity": "low",
        "auto_review": False
    },
    {
        "rule_id": "dealer_compliance_issue",
        "name": "Dealer Compliance Issue",
        "description": "Flag transactions from dealers with compliance issues",
        "category": "dealer",
        "enabled": True,
        "conditions": {
            "min_dealer_compliance_score": 75
        },
        "severity": "high",
        "auto_review": True
    },
    {
        "rule_id": "risk_score_threshold",
        "name": "High Risk Score",
        "description": "Flag transactions exceeding risk score threshold",
        "category": "risk",
        "enabled": True,
        "conditions": {
            "risk_score_threshold": 60
        },
        "severity": "high",
        "auto_review": True
    }
]


class FlaggingRule(BaseModel):
    """Flagging rule configuration"""
    rule_id: str
    name: str
    description: str
    category: str
    enabled: bool = True
    conditions: dict = {}
    severity: str = "medium"
    auto_review: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


async def evaluate_flagging_rules(transaction: dict, citizen_profile: dict, dealer_profile: dict) -> dict:
    """
    Evaluate all enabled flagging rules against a transaction.
    Returns flagging result with triggered rules.
    """
    rules = await db.flagging_rules.find({"enabled": True}, {"_id": 0}).to_list(100)
    if not rules:
        rules = DEFAULT_FLAGGING_RULES
    
    triggered_rules = []
    highest_severity = "low"
    severity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    
    citizen_id = transaction.get("citizen_id")
    now = datetime.now(timezone.utc)
    
    for rule in rules:
        if not rule.get("enabled", True):
            continue
        
        rule_id = rule.get("rule_id")
        conditions = rule.get("conditions", {})
        triggered = False
        trigger_reason = ""
        
        try:
            if rule_id == "high_quantity":
                threshold = conditions.get("quantity_threshold", 50)
                item_types = conditions.get("item_types", ["firearm", "ammunition"])
                if transaction.get("item_type") in item_types and transaction.get("quantity", 0) >= threshold:
                    triggered = True
                    trigger_reason = f"Quantity {transaction.get('quantity')} exceeds threshold {threshold}"
            
            elif rule_id == "frequency_spike":
                max_per_day = conditions.get("max_transactions_per_day", 2)
                max_per_week = conditions.get("max_transactions_per_week", 5)
                lookback = conditions.get("lookback_days", 7)
                
                lookback_date = (now - timedelta(days=lookback)).isoformat()
                recent_txns = await db.transactions.count_documents({
                    "citizen_id": citizen_id,
                    "created_at": {"$gte": lookback_date}
                })
                
                today_start = now.replace(hour=0, minute=0, second=0).isoformat()
                today_txns = await db.transactions.count_documents({
                    "citizen_id": citizen_id,
                    "created_at": {"$gte": today_start}
                })
                
                if today_txns >= max_per_day:
                    triggered = True
                    trigger_reason = f"{today_txns} transactions today (max: {max_per_day})"
                elif recent_txns >= max_per_week:
                    triggered = True
                    trigger_reason = f"{recent_txns} transactions in {lookback} days (max: {max_per_week})"
            
            elif rule_id == "new_buyer_high_value":
                license_age_threshold = conditions.get("license_age_days", 90)
                qty_threshold = conditions.get("quantity_threshold", 10)
                
                if citizen_profile:
                    license_issued = citizen_profile.get("created_at")
                    if license_issued:
                        if isinstance(license_issued, str):
                            issued_date = datetime.fromisoformat(license_issued.replace("Z", "+00:00"))
                        else:
                            issued_date = license_issued
                        license_age = (now - issued_date).days
                        
                        if license_age < license_age_threshold and transaction.get("quantity", 0) >= qty_threshold:
                            triggered = True
                            trigger_reason = f"New license ({license_age} days) with quantity {transaction.get('quantity')}"
            
            elif rule_id == "low_compliance_buyer":
                min_score = conditions.get("min_compliance_score", 60)
                if citizen_profile and citizen_profile.get("compliance_score", 100) < min_score:
                    triggered = True
                    trigger_reason = f"Compliance score {citizen_profile.get('compliance_score')} below {min_score}"
            
            elif rule_id == "after_hours":
                start_hour = conditions.get("start_hour", 6)
                end_hour = conditions.get("end_hour", 22)
                current_hour = now.hour
                if current_hour < start_hour or current_hour > end_hour:
                    triggered = True
                    trigger_reason = f"Transaction at {current_hour}:00 (outside {start_hour}:00-{end_hour}:00)"
            
            elif rule_id == "dealer_compliance_issue":
                min_dealer_score = conditions.get("min_dealer_compliance_score", 75)
                if dealer_profile and dealer_profile.get("compliance_score", 100) < min_dealer_score:
                    triggered = True
                    trigger_reason = f"Dealer compliance {dealer_profile.get('compliance_score')} below {min_dealer_score}"
            
            elif rule_id == "risk_score_threshold":
                threshold = conditions.get("risk_score_threshold", 60)
                if transaction.get("risk_score", 0) >= threshold:
                    triggered = True
                    trigger_reason = f"Risk score {transaction.get('risk_score')} exceeds threshold {threshold}"
            
            if triggered:
                triggered_rules.append({
                    "rule_id": rule_id,
                    "rule_name": rule.get("name"),
                    "severity": rule.get("severity", "medium"),
                    "reason": trigger_reason,
                    "auto_review": rule.get("auto_review", False)
                })
                
                rule_severity = rule.get("severity", "medium")
                if severity_order.get(rule_severity, 2) > severity_order.get(highest_severity, 1):
                    highest_severity = rule_severity
        
        except Exception as e:
            logger.error(f"Error evaluating rule {rule_id}: {e}")
    
    return {
        "flagged": len(triggered_rules) > 0,
        "triggered_rules": triggered_rules,
        "highest_severity": highest_severity if triggered_rules else None,
        "auto_review_required": any(r.get("auto_review") for r in triggered_rules)
    }


async def flag_transaction(transaction_id: str, flagging_result: dict) -> Optional[str]:
    """Create a flag record and optionally a review item for a transaction."""
    if not flagging_result.get("flagged"):
        return None
    
    now = datetime.now(timezone.utc)
    
    flag = {
        "flag_id": f"flag_{uuid.uuid4().hex[:12]}",
        "transaction_id": transaction_id,
        "rules_triggered": [r["rule_id"] for r in flagging_result["triggered_rules"]],
        "rule_details": flagging_result["triggered_rules"],
        "severity": flagging_result["highest_severity"],
        "auto_review_created": False,
        "resolved": False,
        "flagged_at": now.isoformat()
    }
    
    review_id = None
    if flagging_result.get("auto_review_required"):
        review_id = f"review_{uuid.uuid4().hex[:12]}"
        review = {
            "review_id": review_id,
            "type": "flagged_transaction",
            "status": "pending",
            "priority": "high" if flagging_result["highest_severity"] in ["high", "critical"] else "normal",
            "subject_id": transaction_id,
            "submitted_at": now.isoformat(),
            "data": {
                "transaction_id": transaction_id,
                "flag_id": flag["flag_id"],
                "triggered_rules": flagging_result["triggered_rules"],
                "severity": flagging_result["highest_severity"]
            },
            "notes": [],
            "assigned_to": None
        }
        await db.reviews.insert_one(review)
        flag["auto_review_created"] = True
        flag["review_id"] = review_id
    
    await db.flagged_transactions.insert_one(flag)
    
    await db.transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "flagged": True,
            "flag_id": flag["flag_id"],
            "flag_severity": flagging_result["highest_severity"],
            "status": "review_required" if flagging_result.get("auto_review_required") else "pending"
        }}
    )
    
    return flag["flag_id"]


# API Endpoints

@router.get("/flagging-rules")
async def get_flagging_rules(user: dict = Depends(require_auth(["admin"]))):
    """Get all flagging rules"""
    rules = await db.flagging_rules.find({}, {"_id": 0}).to_list(100)
    
    if not rules:
        for rule in DEFAULT_FLAGGING_RULES:
            await db.flagging_rules.insert_one(rule)
        rules = DEFAULT_FLAGGING_RULES
    
    total_flags = await db.flagged_transactions.count_documents({})
    unresolved_flags = await db.flagged_transactions.count_documents({"resolved": False})
    
    return {
        "rules": rules,
        "stats": {
            "total_rules": len(rules),
            "enabled_rules": len([r for r in rules if r.get("enabled")]),
            "total_flags": total_flags,
            "unresolved_flags": unresolved_flags
        }
    }


@router.put("/flagging-rules/{rule_id}")
async def update_flagging_rule(rule_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Update a flagging rule"""
    data = await request.json()
    
    existing = await db.flagging_rules.find_one({"rule_id": rule_id})
    
    if not existing:
        default_rule = next((r for r in DEFAULT_FLAGGING_RULES if r["rule_id"] == rule_id), None)
        if default_rule:
            await db.flagging_rules.insert_one(default_rule)
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_by"] = user["user_id"]
    
    await db.flagging_rules.update_one(
        {"rule_id": rule_id},
        {"$set": data},
        upsert=True
    )
    
    return {"message": "Rule updated successfully", "rule_id": rule_id}


@router.post("/flagging-rules")
async def create_flagging_rule(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Create a new custom flagging rule"""
    data = await request.json()
    
    rule = {
        "rule_id": f"custom_{uuid.uuid4().hex[:8]}",
        "name": data.get("name", "Custom Rule"),
        "description": data.get("description", ""),
        "category": data.get("category", "custom"),
        "enabled": data.get("enabled", True),
        "conditions": data.get("conditions", {}),
        "severity": data.get("severity", "medium"),
        "auto_review": data.get("auto_review", False),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.flagging_rules.insert_one(rule)
    
    return {"message": "Rule created successfully", "rule": rule}


@router.delete("/flagging-rules/{rule_id}")
async def delete_flagging_rule(rule_id: str, user: dict = Depends(require_auth(["admin"]))):
    """Delete a custom flagging rule"""
    if not rule_id.startswith("custom_"):
        raise HTTPException(status_code=400, detail="Cannot delete default rules. Disable them instead.")
    
    result = await db.flagging_rules.delete_one({"rule_id": rule_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule deleted successfully"}


@router.get("/flagged-transactions")
async def get_flagged_transactions(
    resolved: Optional[bool] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_auth(["admin"]))
):
    """Get flagged transactions"""
    query = {}
    if resolved is not None:
        query["resolved"] = resolved
    if severity:
        query["severity"] = severity
    
    flags = await db.flagged_transactions.find(query, {"_id": 0}).sort("flagged_at", -1).limit(limit).to_list(limit)
    
    for flag in flags:
        txn = await db.transactions.find_one({"transaction_id": flag["transaction_id"]}, {"_id": 0})
        if txn:
            flag["transaction"] = serialize_doc(txn)
    
    stats = {
        "total": await db.flagged_transactions.count_documents({}),
        "unresolved": await db.flagged_transactions.count_documents({"resolved": False}),
        "by_severity": {
            "critical": await db.flagged_transactions.count_documents({"severity": "critical", "resolved": False}),
            "high": await db.flagged_transactions.count_documents({"severity": "high", "resolved": False}),
            "medium": await db.flagged_transactions.count_documents({"severity": "medium", "resolved": False}),
            "low": await db.flagged_transactions.count_documents({"severity": "low", "resolved": False})
        }
    }
    
    return {
        "flags": [serialize_doc(f) for f in flags],
        "stats": stats
    }


@router.post("/flagged-transactions/{flag_id}/resolve")
async def resolve_flagged_transaction(flag_id: str, request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Resolve a flagged transaction"""
    data = await request.json()
    
    flag = await db.flagged_transactions.find_one({"flag_id": flag_id})
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    
    now = datetime.now(timezone.utc)
    
    await db.flagged_transactions.update_one(
        {"flag_id": flag_id},
        {"$set": {
            "resolved": True,
            "resolved_by": user["user_id"],
            "resolved_at": now.isoformat(),
            "resolution_notes": data.get("notes", ""),
            "resolution_action": data.get("action", "cleared")
        }}
    )
    
    action = data.get("action", "cleared")
    if action == "cleared":
        await db.transactions.update_one(
            {"transaction_id": flag["transaction_id"]},
            {"$set": {"status": "pending", "flagged": False}}
        )
    elif action == "blocked":
        await db.transactions.update_one(
            {"transaction_id": flag["transaction_id"]},
            {"$set": {"status": "rejected"}}
        )
    
    return {"message": "Flag resolved successfully", "action": action}


@router.post("/flagging/test-transaction")
async def test_flagging_rules(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Test flagging rules against a sample transaction"""
    data = await request.json()
    
    mock_txn = {
        "transaction_id": "test_txn",
        "citizen_id": data.get("citizen_id", "test_citizen"),
        "dealer_id": data.get("dealer_id", "test_dealer"),
        "item_type": data.get("item_type", "firearm"),
        "quantity": data.get("quantity", 1),
        "risk_score": data.get("risk_score", 0),
        "gps_lat": data.get("gps_lat"),
        "gps_lng": data.get("gps_lng")
    }
    
    citizen_profile = None
    dealer_profile = None
    
    if data.get("citizen_id"):
        citizen_profile = await db.citizen_profiles.find_one({"user_id": data["citizen_id"]}, {"_id": 0})
    
    if data.get("dealer_id"):
        dealer_profile = await db.dealer_profiles.find_one({"user_id": data["dealer_id"]}, {"_id": 0})
    
    result = await evaluate_flagging_rules(mock_txn, citizen_profile, dealer_profile)
    
    return {
        "test_transaction": mock_txn,
        "flagging_result": result,
        "would_be_flagged": result["flagged"],
        "note": "This is a test - no actual flag was created"
    }
