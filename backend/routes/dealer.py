"""
Dealer Routes
Endpoints for dealer profiles, transactions, and inventory management.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from utils.database import db, serialize_doc
from utils.helpers import require_auth, create_audit_log
from models import DealerProfile, Transaction, TransactionCreate, InventoryItem

router = APIRouter(tags=["Dealer"])


# ============== DEALER PROFILE ==============

@router.get("/dealer/profile")
async def get_dealer_profile(user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get dealer's profile"""
    profile = await db.dealer_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        return None
    return serialize_doc(profile)


@router.post("/dealer/profile")
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


# ============== DEALER TRANSACTIONS ==============

@router.get("/dealer/transactions")
async def get_dealer_transactions(user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get dealer's transaction history"""
    transactions = await db.transactions.find(
        {"dealer_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [serialize_doc(t) for t in transactions]


@router.get("/dealer/transaction/{transaction_id}")
async def get_transaction_details(transaction_id: str, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get details of a specific transaction"""
    query = {"transaction_id": transaction_id}
    if user["role"] != "admin":
        query["dealer_id"] = user["user_id"]
    
    transaction = await db.transactions.find_one(query, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return serialize_doc(transaction)


# ============== INVENTORY MANAGEMENT ==============

@router.get("/dealer/inventory")
async def get_dealer_inventory(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(require_auth(["dealer", "admin"]))
):
    """Get dealer's inventory items"""
    query = {"dealer_id": user["user_id"]}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if low_stock:
        query["$expr"] = {"$lte": ["$quantity", "$min_stock_level"]}
    
    skip = (page - 1) * limit
    total = await db.inventory_items.count_documents(query)
    items = await db.inventory_items.find(query, {"_id": 0}).skip(skip).limit(limit).sort("name", 1).to_list(limit)
    
    # Calculate inventory stats
    all_items = await db.inventory_items.find({"dealer_id": user["user_id"]}, {"_id": 0}).to_list(10000)
    total_items = len(all_items)
    total_value = sum(item.get("quantity", 0) * item.get("unit_cost", 0) for item in all_items)
    total_retail_value = sum(item.get("quantity", 0) * item.get("unit_price", 0) for item in all_items)
    low_stock_count = sum(1 for item in all_items if item.get("quantity", 0) <= item.get("min_stock_level", 5))
    out_of_stock = sum(1 for item in all_items if item.get("quantity", 0) == 0)
    
    return {
        "items": [serialize_doc(item) for item in items],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "stats": {
            "total_items": total_items,
            "total_cost_value": round(total_value, 2),
            "total_retail_value": round(total_retail_value, 2),
            "potential_profit": round(total_retail_value - total_value, 2),
            "low_stock_count": low_stock_count,
            "out_of_stock": out_of_stock
        }
    }


@router.post("/dealer/inventory")
async def create_inventory_item(request: Request, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Create a new inventory item"""
    body = await request.json()
    
    existing = await db.inventory_items.find_one({"dealer_id": user["user_id"], "sku": body.get("sku")})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists in your inventory")
    
    item = InventoryItem(
        dealer_id=user["user_id"],
        sku=body.get("sku", f"SKU-{uuid.uuid4().hex[:8].upper()}"),
        name=body.get("name"),
        description=body.get("description"),
        category=body.get("category", "accessory"),
        subcategory=body.get("subcategory"),
        quantity=body.get("quantity", 0),
        min_stock_level=body.get("min_stock_level", 5),
        unit_cost=body.get("unit_cost", 0),
        unit_price=body.get("unit_price", 0),
        supplier_id=body.get("supplier_id"),
        supplier_name=body.get("supplier_name"),
        serial_numbers=body.get("serial_numbers", []),
        location=body.get("location"),
        notes=body.get("notes")
    )
    
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.inventory_items.insert_one(doc)
    await create_audit_log("inventory_created", user["user_id"], "dealer", details={"item_id": item.item_id})
    
    return {"message": "Item created", "item": serialize_doc(doc)}


@router.get("/dealer/inventory/{item_id}")
async def get_inventory_item(item_id: str, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get details of a specific inventory item"""
    query = {"item_id": item_id}
    if user["role"] != "admin":
        query["dealer_id"] = user["user_id"]
    
    item = await db.inventory_items.find_one(query, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_doc(item)


@router.put("/dealer/inventory/{item_id}")
async def update_inventory_item(item_id: str, request: Request, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Update an inventory item"""
    body = await request.json()
    
    query = {"item_id": item_id}
    if user["role"] != "admin":
        query["dealer_id"] = user["user_id"]
    
    item = await db.inventory_items.find_one(query, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    allowed_fields = ["name", "description", "category", "subcategory", "quantity", 
                      "min_stock_level", "unit_cost", "unit_price", "supplier_id",
                      "supplier_name", "location", "notes", "status"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track quantity changes
    if "quantity" in update_data and update_data["quantity"] != item.get("quantity"):
        movement = {
            "movement_id": f"MOV_{uuid.uuid4().hex[:12]}",
            "item_id": item_id,
            "dealer_id": user["user_id"],
            "movement_type": "adjustment",
            "quantity_before": item.get("quantity", 0),
            "quantity_after": update_data["quantity"],
            "quantity_change": update_data["quantity"] - item.get("quantity", 0),
            "reason": body.get("reason", "Manual adjustment"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["user_id"]
        }
        await db.inventory_movements.insert_one(movement)
    
    await db.inventory_items.update_one(query, {"$set": update_data})
    await create_audit_log("inventory_updated", user["user_id"], "dealer", details={"item_id": item_id})
    
    updated_item = await db.inventory_items.find_one(query, {"_id": 0})
    return serialize_doc(updated_item)


@router.delete("/dealer/inventory/{item_id}")
async def delete_inventory_item(item_id: str, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Delete an inventory item"""
    query = {"item_id": item_id}
    if user["role"] != "admin":
        query["dealer_id"] = user["user_id"]
    
    result = await db.inventory_items.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await create_audit_log("inventory_deleted", user["user_id"], "dealer", details={"item_id": item_id})
    return {"message": "Item deleted"}


@router.post("/dealer/inventory/{item_id}/adjust")
async def adjust_inventory(item_id: str, request: Request, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Adjust inventory quantity with reason tracking"""
    body = await request.json()
    adjustment = body.get("adjustment", 0)
    reason = body.get("reason", "Manual adjustment")
    
    query = {"item_id": item_id}
    if user["role"] != "admin":
        query["dealer_id"] = user["user_id"]
    
    item = await db.inventory_items.find_one(query, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    new_quantity = item.get("quantity", 0) + adjustment
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Cannot have negative inventory")
    
    # Record movement
    movement = {
        "movement_id": f"MOV_{uuid.uuid4().hex[:12]}",
        "item_id": item_id,
        "dealer_id": user["user_id"],
        "movement_type": "adjustment",
        "quantity_before": item.get("quantity", 0),
        "quantity_after": new_quantity,
        "quantity_change": adjustment,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    await db.inventory_movements.insert_one(movement)
    
    await db.inventory_items.update_one(
        query,
        {"$set": {"quantity": new_quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": "Inventory adjusted",
        "previous_quantity": item.get("quantity", 0),
        "new_quantity": new_quantity,
        "adjustment": adjustment
    }


@router.get("/dealer/inventory/movements")
async def get_inventory_movements(
    item_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_auth(["dealer", "admin"]))
):
    """Get inventory movement history"""
    query = {"dealer_id": user["user_id"]}
    if item_id:
        query["item_id"] = item_id
    if movement_type:
        query["movement_type"] = movement_type
    
    movements = await db.inventory_movements.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"movements": [serialize_doc(m) for m in movements]}


@router.get("/dealer/inventory/alerts")
async def get_inventory_alerts(user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get inventory alerts (low stock, reorder needed)"""
    alerts = await db.inventory_alerts.find(
        {"dealer_id": user["user_id"], "status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"alerts": [serialize_doc(a) for a in alerts]}


@router.put("/dealer/inventory/alerts/{alert_id}")
async def update_alert(alert_id: str, request: Request, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Update/dismiss an alert"""
    body = await request.json()
    
    result = await db.inventory_alerts.update_one(
        {"alert_id": alert_id, "dealer_id": user["user_id"]},
        {"$set": {"status": body.get("status", "dismissed"), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert updated"}


@router.get("/dealer/inventory/export")
async def export_inventory(user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Export inventory as CSV-ready data"""
    items = await db.inventory_items.find({"dealer_id": user["user_id"]}, {"_id": 0}).to_list(10000)
    
    export_data = []
    for item in items:
        export_data.append({
            "SKU": item.get("sku"),
            "Name": item.get("name"),
            "Category": item.get("category"),
            "Quantity": item.get("quantity"),
            "Unit Cost": item.get("unit_cost"),
            "Unit Price": item.get("unit_price"),
            "Total Value": item.get("quantity", 0) * item.get("unit_price", 0),
            "Status": item.get("status"),
            "Location": item.get("location")
        })
    
    return {"data": export_data, "total_items": len(export_data)}


@router.get("/dealer/inventory/valuation")
async def get_inventory_valuation(user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Get detailed inventory valuation"""
    items = await db.inventory_items.find({"dealer_id": user["user_id"]}, {"_id": 0}).to_list(10000)
    
    categories = {}
    for item in items:
        cat = item.get("category", "other")
        if cat not in categories:
            categories[cat] = {"items": 0, "quantity": 0, "cost_value": 0, "retail_value": 0}
        categories[cat]["items"] += 1
        categories[cat]["quantity"] += item.get("quantity", 0)
        categories[cat]["cost_value"] += item.get("quantity", 0) * item.get("unit_cost", 0)
        categories[cat]["retail_value"] += item.get("quantity", 0) * item.get("unit_price", 0)
    
    total_cost = sum(c["cost_value"] for c in categories.values())
    total_retail = sum(c["retail_value"] for c in categories.values())
    
    return {
        "by_category": categories,
        "totals": {
            "total_cost_value": round(total_cost, 2),
            "total_retail_value": round(total_retail, 2),
            "gross_margin": round((total_retail - total_cost) / total_retail * 100, 1) if total_retail > 0 else 0
        }
    }


@router.post("/dealer/inventory/import")
async def import_inventory(request: Request, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Import inventory items from JSON data"""
    body = await request.json()
    items_data = body.get("items", [])
    
    imported = 0
    errors = []
    
    for idx, item_data in enumerate(items_data):
        try:
            existing = await db.inventory_items.find_one({
                "dealer_id": user["user_id"],
                "sku": item_data.get("sku")
            })
            
            if existing:
                errors.append(f"Row {idx + 1}: SKU {item_data.get('sku')} already exists")
                continue
            
            item = InventoryItem(
                dealer_id=user["user_id"],
                sku=item_data.get("sku", f"SKU-{uuid.uuid4().hex[:8].upper()}"),
                name=item_data.get("name", "Unnamed Item"),
                description=item_data.get("description"),
                category=item_data.get("category", "accessory"),
                quantity=int(item_data.get("quantity", 0)),
                unit_cost=float(item_data.get("unit_cost", 0)),
                unit_price=float(item_data.get("unit_price", 0))
            )
            
            doc = item.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            
            await db.inventory_items.insert_one(doc)
            imported += 1
        except Exception as e:
            errors.append(f"Row {idx + 1}: {str(e)}")
    
    return {
        "message": f"Imported {imported} items",
        "imported": imported,
        "errors": errors
    }


@router.get("/dealer/inventory/scan/{sku}")
async def scan_item(sku: str, user: dict = Depends(require_auth(["dealer", "admin"]))):
    """Quick lookup by SKU for barcode scanning"""
    item = await db.inventory_items.find_one(
        {"dealer_id": user["user_id"], "sku": sku},
        {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_doc(item)


@router.post("/dealer/inventory/link-marketplace/{item_id}")
async def link_to_marketplace(item_id: str, request: Request, user: dict = Depends(require_auth(["dealer"]))):
    """Link inventory item to marketplace listing"""
    body = await request.json()
    
    item = await db.inventory_items.find_one(
        {"item_id": item_id, "dealer_id": user["user_id"]},
        {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    listing_id = f"LST_{uuid.uuid4().hex[:12]}"
    
    await db.inventory_items.update_one(
        {"item_id": item_id},
        {"$set": {
            "marketplace_linked": True,
            "marketplace_listing_id": listing_id,
            "marketplace_price": body.get("price", item.get("unit_price")),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Linked to marketplace", "listing_id": listing_id}


@router.post("/dealer/inventory/unlink-marketplace/{item_id}")
async def unlink_from_marketplace(item_id: str, user: dict = Depends(require_auth(["dealer"]))):
    """Unlink inventory item from marketplace"""
    item = await db.inventory_items.find_one(
        {"item_id": item_id, "dealer_id": user["user_id"]},
        {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.inventory_items.update_one(
        {"item_id": item_id},
        {"$set": {
            "marketplace_linked": False,
            "marketplace_listing_id": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Unlinked from marketplace"}
