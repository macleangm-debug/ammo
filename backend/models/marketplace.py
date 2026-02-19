"""
Marketplace and inventory models
"""
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
import uuid


class MarketplaceProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    dealer_id: str
    name: str
    description: Optional[str] = ""
    category: str
    subcategory: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    quantity_available: int = 0
    min_order_quantity: int = 1
    max_order_quantity: Optional[int] = None
    images: list = []
    specifications: dict = {}
    requires_license: bool = True
    license_types_allowed: list = []
    region_restrictions: list = []
    status: str = "active"
    featured: bool = False
    views: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MarketplaceOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    buyer_id: str
    dealer_id: str
    items: list = []
    subtotal: float
    tax: float = 0
    total: float
    status: str = "pending"
    payment_status: str = "pending"
    payment_method: Optional[str] = None
    shipping_address: Optional[dict] = None
    tracking_number: Optional[str] = None
    license_verified: bool = False
    verification_transaction_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MarketplaceReview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"review_{uuid.uuid4().hex[:12]}")
    product_id: str
    buyer_id: str
    order_id: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    verified_purchase: bool = True
    helpful_votes: int = 0
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    dealer_id: str
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    quantity: int = 0
    min_stock_level: int = 5
    unit_cost: float = 0
    unit_price: float = 0
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    location: Optional[str] = None
    serial_numbers: list = []
    requires_license: bool = False
    linked_to_marketplace: bool = False
    marketplace_product_id: Optional[str] = None
    status: str = "active"
    last_restock_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InventoryMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    movement_id: str = Field(default_factory=lambda: f"mov_{uuid.uuid4().hex[:12]}")
    item_id: str
    dealer_id: str
    movement_type: str
    quantity: int
    quantity_before: int
    quantity_after: int
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InventorySupplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    supplier_id: str = Field(default_factory=lambda: f"sup_{uuid.uuid4().hex[:12]}")
    dealer_id: str
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: int = 7
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReorderAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    alert_id: str = Field(default_factory=lambda: f"alert_{uuid.uuid4().hex[:12]}")
    item_id: str
    dealer_id: str
    item_name: str
    current_quantity: int
    min_stock_level: int
    suggested_reorder_qty: int
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
