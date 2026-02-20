"""
Inventory Management API Tests for Dealer Portal
Tests all CRUD operations and inventory-specific features
"""
import pytest
import requests
import os

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://ammo-doc-verify.preview.emergentagent.com"


class TestInventoryAPI:
    """Test Dealer Inventory Management API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Setup: Login as dealer, Teardown: Cleanup test data"""
        # Setup demo data
        requests.post(f"{BASE_URL}/api/demo/setup")
        
        # Login as dealer
        response = requests.post(f"{BASE_URL}/api/demo/login/dealer")
        assert response.status_code == 200, f"Demo login failed: {response.text}"
        self.token = response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        yield
        
        # Cleanup: Delete test items created during tests
        try:
            items_response = requests.get(
                f"{BASE_URL}/api/dealer/inventory",
                headers=self.headers
            )
            if items_response.status_code == 200:
                items = items_response.json().get("items", [])
                for item in items:
                    if item.get("name", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/dealer/inventory/{item['item_id']}",
                            headers=self.headers
                        )
        except Exception:
            pass
    
    # ========== GET /dealer/inventory ==========
    def test_get_inventory_list(self):
        """Test retrieving inventory list with stats"""
        response = requests.get(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "items" in data
        assert "stats" in data
        assert isinstance(data["items"], list)
        assert "total_items" in data["stats"]
        assert "total_cost_value" in data["stats"]
        assert "total_retail_value" in data["stats"]
        assert "potential_profit" in data["stats"]
        print(f"✓ GET /dealer/inventory: {len(data['items'])} items, stats present")
    
    def test_get_inventory_with_search(self):
        """Test inventory search functionality"""
        response = requests.get(
            f"{BASE_URL}/api/dealer/inventory?search=Glock",
            headers=self.headers
        )
        assert response.status_code == 200
        print("✓ GET /dealer/inventory?search=Glock: Search works")
    
    def test_get_inventory_with_category_filter(self):
        """Test inventory category filter"""
        response = requests.get(
            f"{BASE_URL}/api/dealer/inventory?category=accessory",
            headers=self.headers
        )
        assert response.status_code == 200
        print("✓ GET /dealer/inventory?category=accessory: Category filter works")
    
    # ========== POST /dealer/inventory (Create) ==========
    def test_create_inventory_item(self):
        """Test creating a new inventory item"""
        new_item = {
            "name": "TEST_Item_Create",
            "sku": "TEST-SKU-001",
            "category": "ammunition",
            "quantity": 100,
            "min_stock_level": 20,
            "unit_cost": 10.50,
            "unit_price": 15.99,
            "location": "Warehouse A",
            "supplier_name": "Test Supplier",
            "requires_license": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json=new_item
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert "item" in data
        created_item = data["item"]
        assert created_item["name"] == new_item["name"]
        assert created_item["sku"] == new_item["sku"]
        assert created_item["quantity"] == new_item["quantity"]
        assert created_item["unit_cost"] == new_item["unit_cost"]
        assert created_item["unit_price"] == new_item["unit_price"]
        assert "item_id" in created_item
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/{created_item['item_id']}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()["item"]
        assert fetched["name"] == new_item["name"]
        
        print(f"✓ POST /dealer/inventory: Created item {created_item['item_id']}")
    
    def test_create_item_with_duplicate_sku_fails(self):
        """Test that creating item with duplicate SKU fails"""
        item = {
            "name": "TEST_Duplicate_SKU",
            "sku": "TEST-DUP-SKU",
            "category": "accessory",
            "quantity": 10
        }
        
        # Create first item
        response1 = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json=item
        )
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json=item
        )
        assert response2.status_code == 400
        assert "SKU already exists" in response2.json().get("detail", "")
        print("✓ POST /dealer/inventory: Duplicate SKU correctly rejected")
    
    # ========== PUT /dealer/inventory/{item_id} (Update) ==========
    def test_update_inventory_item(self):
        """Test updating an inventory item"""
        # First create an item
        create_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json={
                "name": "TEST_Item_Update",
                "sku": "TEST-UPD-001",
                "category": "accessory",
                "quantity": 50,
                "unit_cost": 25.00,
                "unit_price": 40.00
            }
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["item"]["item_id"]
        
        # Update the item
        update_data = {
            "name": "TEST_Item_Updated",
            "quantity": 75,
            "unit_price": 45.00,
            "location": "Updated Location"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/dealer/inventory/{item_id}",
            headers=self.headers,
            json=update_data
        )
        assert update_response.status_code == 200
        
        # Verify update with GET
        get_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/{item_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        updated_item = get_response.json()["item"]
        assert updated_item["name"] == "TEST_Item_Updated"
        assert updated_item["quantity"] == 75
        assert updated_item["unit_price"] == 45.00
        
        print(f"✓ PUT /dealer/inventory/{item_id}: Item updated correctly")
    
    # ========== DELETE /dealer/inventory/{item_id} ==========
    def test_delete_inventory_item(self):
        """Test deleting an inventory item"""
        # First create an item
        create_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json={
                "name": "TEST_Item_Delete",
                "sku": "TEST-DEL-001",
                "category": "accessory",
                "quantity": 10
            }
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["item"]["item_id"]
        
        # Delete the item
        delete_response = requests.delete(
            f"{BASE_URL}/api/dealer/inventory/{item_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion with GET
        get_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/{item_id}",
            headers=self.headers
        )
        assert get_response.status_code == 404
        print(f"✓ DELETE /dealer/inventory/{item_id}: Item deleted correctly")
    
    # ========== POST /dealer/inventory/{item_id}/adjust ==========
    def test_adjust_stock(self):
        """Test stock adjustment (restock, sale, damage, etc.)"""
        # Create item
        create_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json={
                "name": "TEST_Item_Adjust",
                "sku": "TEST-ADJ-001",
                "category": "ammunition",
                "quantity": 100
            }
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["item"]["item_id"]
        
        # Test restock adjustment (+25)
        adjust_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory/{item_id}/adjust",
            headers=self.headers,
            json={
                "type": "restock",
                "quantity": 25,
                "notes": "Test restock"
            }
        )
        assert adjust_response.status_code == 200
        assert adjust_response.json()["new_quantity"] == 125
        
        # Test sale adjustment (-10)
        adjust_response2 = requests.post(
            f"{BASE_URL}/api/dealer/inventory/{item_id}/adjust",
            headers=self.headers,
            json={
                "type": "sale",
                "quantity": 10,
                "notes": "Test sale"
            }
        )
        assert adjust_response2.status_code == 200
        assert adjust_response2.json()["new_quantity"] == 115
        
        # Test damage adjustment (-5)
        adjust_response3 = requests.post(
            f"{BASE_URL}/api/dealer/inventory/{item_id}/adjust",
            headers=self.headers,
            json={
                "type": "damage",
                "quantity": 5,
                "notes": "Test damage"
            }
        )
        assert adjust_response3.status_code == 200
        assert adjust_response3.json()["new_quantity"] == 110
        
        print(f"✓ POST /dealer/inventory/{item_id}/adjust: Stock adjustments work correctly")
    
    # ========== GET /dealer/inventory/movements ==========
    def test_get_movement_history(self):
        """Test retrieving inventory movement history"""
        response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/movements?limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "movements" in data
        assert "total" in data
        assert isinstance(data["movements"], list)
        
        # Check movement structure if movements exist
        if len(data["movements"]) > 0:
            movement = data["movements"][0]
            assert "movement_id" in movement
            assert "movement_type" in movement
            assert "quantity" in movement
            assert "item_name" in movement
        
        print(f"✓ GET /dealer/inventory/movements: {len(data['movements'])} movements retrieved")
    
    # ========== GET /dealer/inventory/alerts ==========
    def test_get_reorder_alerts(self):
        """Test retrieving reorder alerts"""
        response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/alerts",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "alerts" in data
        assert isinstance(data["alerts"], list)
        print(f"✓ GET /dealer/inventory/alerts: {len(data['alerts'])} alerts retrieved")
    
    def test_low_stock_creates_alert(self):
        """Test that low stock items trigger reorder alerts"""
        # Create item with low stock
        create_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json={
                "name": "TEST_Low_Stock_Item",
                "sku": "TEST-LOW-001",
                "category": "accessory",
                "quantity": 3,  # Below min_stock_level of 5
                "min_stock_level": 5
            }
        )
        assert create_response.status_code == 200
        
        # Check for alert
        alerts_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/alerts",
            headers=self.headers
        )
        assert alerts_response.status_code == 200
        alerts = alerts_response.json()["alerts"]
        
        # Find our alert
        our_alert = next((a for a in alerts if a.get("item_name") == "TEST_Low_Stock_Item"), None)
        assert our_alert is not None, "Alert should be created for low stock item"
        assert our_alert["current_quantity"] == 3
        assert our_alert["min_stock_level"] == 5
        
        print("✓ Low stock item correctly triggers reorder alert")
    
    # ========== GET /dealer/inventory/export ==========
    def test_export_inventory_csv(self):
        """Test exporting inventory to CSV format"""
        response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/export",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "count" in data
        assert isinstance(data["data"], list)
        
        # Check export data structure if items exist
        if len(data["data"]) > 0:
            item = data["data"][0]
            assert "sku" in item
            assert "name" in item
            assert "quantity" in item
            assert "unit_cost" in item
            assert "unit_price" in item
        
        print(f"✓ GET /dealer/inventory/export: {data['count']} items exported")
    
    # ========== GET /dealer/inventory/valuation ==========
    def test_get_inventory_valuation(self):
        """Test inventory valuation report"""
        response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/valuation",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "summary" in data
        summary = data["summary"]
        assert "total_items" in summary
        assert "total_units" in summary
        assert "total_cost_value" in summary
        assert "total_retail_value" in summary
        assert "potential_profit" in summary
        assert "profit_margin" in summary
        
        # Verify by_category structure
        assert "by_category" in data
        
        # Verify top_items structure
        assert "top_items" in data
        assert isinstance(data["top_items"], list)
        
        print(f"✓ GET /dealer/inventory/valuation: Valuation report retrieved")
        print(f"  - Total items: {summary['total_items']}")
        print(f"  - Cost value: ${summary['total_cost_value']}")
        print(f"  - Retail value: ${summary['total_retail_value']}")
        print(f"  - Profit margin: {summary['profit_margin']}%")
    
    # ========== GET /dealer/inventory/scan/{sku} ==========
    def test_scan_sku_barcode_found(self):
        """Test SKU/barcode scan - item found"""
        # Create item with known SKU
        create_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json={
                "name": "TEST_Scan_Item",
                "sku": "TEST-SCAN-123",
                "category": "accessory",
                "quantity": 50
            }
        )
        assert create_response.status_code == 200
        
        # Scan the SKU
        scan_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/scan/TEST-SCAN-123",
            headers=self.headers
        )
        assert scan_response.status_code == 200
        data = scan_response.json()
        
        assert data["found"] == True
        assert "item" in data
        assert data["item"]["sku"] == "TEST-SCAN-123"
        assert data["item"]["name"] == "TEST_Scan_Item"
        
        print("✓ GET /dealer/inventory/scan/{sku}: Item found correctly")
    
    def test_scan_sku_barcode_not_found(self):
        """Test SKU/barcode scan - item not found"""
        scan_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/scan/NONEXISTENT-SKU-999",
            headers=self.headers
        )
        assert scan_response.status_code == 200
        data = scan_response.json()
        
        assert data["found"] == False
        print("✓ GET /dealer/inventory/scan/{sku}: Not found handled correctly")
    
    # ========== POST /dealer/inventory/link-marketplace/{item_id} ==========
    def test_link_to_marketplace(self):
        """Test linking inventory item to marketplace"""
        # Create item
        create_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json={
                "name": "TEST_Link_Item",
                "sku": "TEST-LINK-001",
                "category": "accessory",
                "quantity": 25,
                "unit_price": 99.99
            }
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["item"]["item_id"]
        
        # Link to marketplace
        link_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory/link-marketplace/{item_id}",
            headers=self.headers,
            json={
                "name": "Test Product for Marketplace",
                "description": "A test product linked from inventory"
            }
        )
        assert link_response.status_code == 200
        data = link_response.json()
        
        assert "product_id" in data
        assert "message" in data
        
        # Verify item is now linked
        get_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/{item_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        item = get_response.json()["item"]
        assert item["linked_to_marketplace"] == True
        assert item["marketplace_product_id"] is not None
        
        print(f"✓ POST /dealer/inventory/link-marketplace/{item_id}: Item linked to marketplace")
    
    # ========== POST /dealer/inventory/unlink-marketplace/{item_id} ==========
    def test_unlink_from_marketplace(self):
        """Test unlinking inventory item from marketplace"""
        # Create and link item
        create_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory",
            headers=self.headers,
            json={
                "name": "TEST_Unlink_Item",
                "sku": "TEST-UNLINK-001",
                "category": "accessory",
                "quantity": 25,
                "unit_price": 49.99
            }
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["item"]["item_id"]
        
        # Link first
        link_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory/link-marketplace/{item_id}",
            headers=self.headers,
            json={"name": "Test Unlink Product"}
        )
        assert link_response.status_code == 200
        
        # Now unlink
        unlink_response = requests.post(
            f"{BASE_URL}/api/dealer/inventory/unlink-marketplace/{item_id}",
            headers=self.headers
        )
        assert unlink_response.status_code == 200
        
        # Verify item is now unlinked
        get_response = requests.get(
            f"{BASE_URL}/api/dealer/inventory/{item_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        item = get_response.json()["item"]
        assert item["linked_to_marketplace"] == False
        assert item["marketplace_product_id"] is None
        
        print(f"✓ POST /dealer/inventory/unlink-marketplace/{item_id}: Item unlinked from marketplace")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
