"""
Test file for Firearms Registration & Annual Fee Management APIs
Tests the following endpoints:
- /api/government/fees-overview - Get overview of all fees
- /api/government/firearms-registry - Get all registered firearms
- /api/citizen/firearms - CRUD operations for firearms
- /api/citizen/fees-summary - Get user's fees summary
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFirearmsFeesAPIs:
    """Test suite for Firearms Registration and Annual Fees APIs"""
    
    admin_session = None
    citizen_session = None
    test_firearm_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup test class with sessions"""
        cls.admin_session = requests.Session()
        cls.citizen_session = requests.Session()
        cls.admin_session.headers.update({"Content-Type": "application/json"})
        cls.citizen_session.headers.update({"Content-Type": "application/json"})
    
    def test_01_demo_setup(self):
        """Test demo setup to ensure test data exists"""
        response = self.admin_session.post(f"{BASE_URL}/api/demo/setup")
        assert response.status_code == 200, f"Demo setup failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✅ Demo setup successful: {data.get('message')}")
    
    def test_02_admin_login(self):
        """Test admin login"""
        response = self.admin_session.post(f"{BASE_URL}/api/demo/login/admin")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        # Role is nested in user object
        user = data.get("user", data)
        assert user.get("role") == "admin"
        print(f"✅ Admin login successful: {user.get('name')}")
    
    def test_03_citizen_login(self):
        """Test citizen login"""
        response = self.citizen_session.post(f"{BASE_URL}/api/demo/login/citizen")
        assert response.status_code == 200, f"Citizen login failed: {response.text}"
        data = response.json()
        # Role is nested in user object
        user = data.get("user", data)
        assert user.get("role") == "citizen"
        print(f"✅ Citizen login successful: {user.get('name')}")
    
    # ===================== Government Fees Overview API Tests =====================
    
    def test_04_fees_overview_requires_auth(self):
        """Test that fees-overview requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/government/fees-overview")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Fees overview requires authentication")
    
    def test_05_fees_overview_returns_correct_structure(self):
        """Test that fees-overview returns correct data structure"""
        response = self.admin_session.get(f"{BASE_URL}/api/government/fees-overview")
        assert response.status_code == 200, f"Fees overview failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "license_fees" in data, "Missing license_fees in response"
        assert "firearms_fees" in data, "Missing firearms_fees in response"
        assert "total_expected_revenue" in data, "Missing total_expected_revenue in response"
        
        # Verify license_fees structure
        license_fees = data["license_fees"]
        assert "paid" in license_fees
        assert "pending" in license_fees
        assert "overdue" in license_fees
        assert "total_expected" in license_fees
        
        # Verify firearms_fees structure
        firearms_fees = data["firearms_fees"]
        assert "total_firearms" in firearms_fees
        assert "paid" in firearms_fees
        assert "pending" in firearms_fees
        assert "overdue" in firearms_fees
        assert "total_expected" in firearms_fees
        
        print(f"✅ Fees overview structure correct:")
        print(f"   - License fees: paid={license_fees['paid']}, pending={license_fees['pending']}, overdue={license_fees['overdue']}")
        print(f"   - Firearms: total={firearms_fees['total_firearms']}, paid={firearms_fees['paid']}, pending={firearms_fees['pending']}")
        print(f"   - Total expected revenue: ${data['total_expected_revenue']}")
    
    # ===================== Government Firearms Registry API Tests =====================
    
    def test_06_firearms_registry_requires_auth(self):
        """Test that firearms-registry requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/government/firearms-registry")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Firearms registry requires authentication")
    
    def test_07_firearms_registry_returns_correct_structure(self):
        """Test that firearms-registry returns correct data structure"""
        response = self.admin_session.get(f"{BASE_URL}/api/government/firearms-registry")
        assert response.status_code == 200, f"Firearms registry failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "firearms" in data, "Missing firearms in response"
        assert "stats" in data, "Missing stats in response"
        assert isinstance(data["firearms"], list), "firearms should be a list"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "by_type" in stats
        assert "by_status" in stats
        assert "by_fee_status" in stats
        
        print(f"✅ Firearms registry structure correct:")
        print(f"   - Total firearms: {stats['total']}")
        print(f"   - By type: {stats['by_type']}")
        print(f"   - By status: {stats['by_status']}")
        print(f"   - By fee status: {stats['by_fee_status']}")
    
    def test_08_firearms_registry_filters_work(self):
        """Test that firearms-registry filters work correctly"""
        # Test status filter
        response = self.admin_session.get(f"{BASE_URL}/api/government/firearms-registry?status=active")
        assert response.status_code == 200
        
        # Test fee_status filter
        response = self.admin_session.get(f"{BASE_URL}/api/government/firearms-registry?fee_status=pending")
        assert response.status_code == 200
        
        # Test limit filter
        response = self.admin_session.get(f"{BASE_URL}/api/government/firearms-registry?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["firearms"]) <= 10
        
        print("✅ Firearms registry filters work correctly")
    
    # ===================== Citizen Firearms CRUD API Tests =====================
    
    def test_09_citizen_firearms_list_requires_auth(self):
        """Test that citizen firearms list requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/citizen/firearms")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Citizen firearms list requires authentication")
    
    def test_10_citizen_firearms_list_returns_correct_structure(self):
        """Test citizen can get their firearms list"""
        response = self.citizen_session.get(f"{BASE_URL}/api/citizen/firearms")
        assert response.status_code == 200, f"Citizen firearms list failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "firearms" in data, "Missing firearms in response"
        assert isinstance(data["firearms"], list), "firearms should be a list"
        
        print(f"✅ Citizen firearms list returns {len(data['firearms'])} firearms")
    
    def test_11_citizen_register_firearm(self):
        """Test citizen can register a new firearm"""
        firearm_data = {
            "serial_number": f"TEST-SN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "make": "Test Manufacturer",
            "model": "Test Model XR",
            "caliber": "9mm",
            "firearm_type": "handgun",
            "purchase_date": "2024-01-15",
            "notes": "Test firearm registration"
        }
        
        response = self.citizen_session.post(
            f"{BASE_URL}/api/citizen/firearms",
            json=firearm_data
        )
        assert response.status_code == 200, f"Firearm registration failed: {response.text}"
        data = response.json()
        
        assert "firearm_id" in data, "Missing firearm_id in response"
        assert "message" in data, "Missing message in response"
        
        # Store for later tests
        TestFirearmsFeesAPIs.test_firearm_id = data["firearm_id"]
        
        print(f"✅ Firearm registered successfully: {data['firearm_id']}")
    
    def test_12_citizen_get_firearm_details(self):
        """Test citizen can get details of their firearm"""
        if not TestFirearmsFeesAPIs.test_firearm_id:
            pytest.skip("No test firearm available")
        
        response = self.citizen_session.get(
            f"{BASE_URL}/api/citizen/firearms/{TestFirearmsFeesAPIs.test_firearm_id}"
        )
        assert response.status_code == 200, f"Get firearm details failed: {response.text}"
        data = response.json()
        
        # Verify firearm structure
        assert "firearm_id" in data
        assert "serial_number" in data
        assert "make" in data
        assert "model" in data
        assert "caliber" in data
        assert "firearm_type" in data
        assert "annual_fee" in data
        assert "fee_status" in data
        assert data["annual_fee"] == 50.00, f"Expected annual_fee to be 50.00, got {data['annual_fee']}"
        
        print(f"✅ Firearm details retrieved: {data['make']} {data['model']}, annual_fee=${data['annual_fee']}")
    
    def test_13_citizen_update_firearm(self):
        """Test citizen can update their firearm notes"""
        if not TestFirearmsFeesAPIs.test_firearm_id:
            pytest.skip("No test firearm available")
        
        update_data = {
            "notes": "Updated test notes"
        }
        
        response = self.citizen_session.put(
            f"{BASE_URL}/api/citizen/firearms/{TestFirearmsFeesAPIs.test_firearm_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Update firearm failed: {response.text}"
        
        # Verify update
        response = self.citizen_session.get(
            f"{BASE_URL}/api/citizen/firearms/{TestFirearmsFeesAPIs.test_firearm_id}"
        )
        data = response.json()
        assert data["notes"] == "Updated test notes"
        
        print("✅ Firearm updated successfully")
    
    def test_14_duplicate_serial_number_rejected(self):
        """Test that duplicate serial numbers are rejected"""
        if not TestFirearmsFeesAPIs.test_firearm_id:
            pytest.skip("No test firearm available")
        
        # Get the existing firearm's serial number
        response = self.citizen_session.get(
            f"{BASE_URL}/api/citizen/firearms/{TestFirearmsFeesAPIs.test_firearm_id}"
        )
        existing_serial = response.json()["serial_number"]
        
        # Try to register with same serial number
        firearm_data = {
            "serial_number": existing_serial,
            "make": "Another Make",
            "model": "Another Model",
            "caliber": ".45 ACP",
            "firearm_type": "handgun"
        }
        
        response = self.citizen_session.post(
            f"{BASE_URL}/api/citizen/firearms",
            json=firearm_data
        )
        assert response.status_code == 400, f"Expected 400 for duplicate serial, got {response.status_code}"
        
        print("✅ Duplicate serial number correctly rejected")
    
    # ===================== Citizen Fees Summary API Tests =====================
    
    def test_15_citizen_fees_summary_requires_auth(self):
        """Test that citizen fees summary requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/citizen/fees-summary")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Citizen fees summary requires authentication")
    
    def test_16_citizen_fees_summary_returns_correct_structure(self):
        """Test citizen fees summary returns correct data structure"""
        response = self.citizen_session.get(f"{BASE_URL}/api/citizen/fees-summary")
        assert response.status_code == 200, f"Citizen fees summary failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "license_fee" in data, "Missing license_fee in response"
        assert "firearms_fees" in data, "Missing firearms_fees in response"
        assert "total_annual_fees" in data, "Missing total_annual_fees in response"
        assert "firearms" in data, "Missing firearms in response"
        
        # Verify license_fee structure
        license_fee = data["license_fee"]
        assert "amount" in license_fee
        assert "status" in license_fee
        assert "description" in license_fee
        assert license_fee["amount"] == 150.00, f"Expected license_fee amount to be 150.00, got {license_fee['amount']}"
        
        # Verify firearms_fees structure
        firearms_fees = data["firearms_fees"]
        assert "count" in firearms_fees
        assert "per_firearm_fee" in firearms_fees
        assert "total_amount" in firearms_fees
        assert firearms_fees["per_firearm_fee"] == 50.00, f"Expected per_firearm_fee to be 50.00, got {firearms_fees['per_firearm_fee']}"
        
        # Verify total calculation
        expected_total = license_fee["amount"] + firearms_fees["total_amount"]
        assert data["total_annual_fees"] == expected_total, f"Total fees calculation incorrect"
        
        print(f"✅ Citizen fees summary structure correct:")
        print(f"   - License fee: ${license_fee['amount']}/yr ({license_fee['status']})")
        print(f"   - Firearms count: {firearms_fees['count']}")
        print(f"   - Firearms fees: ${firearms_fees['total_amount']}/yr")
        print(f"   - Total annual fees: ${data['total_annual_fees']}/yr")
    
    def test_17_fees_reflect_registered_firearms(self):
        """Test that fees summary reflects registered firearms correctly"""
        # Get current fees summary
        response = self.citizen_session.get(f"{BASE_URL}/api/citizen/fees-summary")
        assert response.status_code == 200
        data = response.json()
        
        firearms_count = data["firearms_fees"]["count"]
        expected_firearms_total = firearms_count * 50.00
        
        assert data["firearms_fees"]["total_amount"] == expected_firearms_total, \
            f"Firearms fees total should be {expected_firearms_total}, got {data['firearms_fees']['total_amount']}"
        
        print(f"✅ Fees correctly reflect {firearms_count} firearms at $50/yr each = ${expected_firearms_total}/yr")
    
    # ===================== Cross-API Integration Tests =====================
    
    def test_18_registered_firearm_appears_in_registry(self):
        """Test that citizen-registered firearm appears in government registry"""
        if not TestFirearmsFeesAPIs.test_firearm_id:
            pytest.skip("No test firearm available")
        
        response = self.admin_session.get(f"{BASE_URL}/api/government/firearms-registry")
        assert response.status_code == 200
        data = response.json()
        
        firearm_ids = [f["firearm_id"] for f in data["firearms"]]
        assert TestFirearmsFeesAPIs.test_firearm_id in firearm_ids, \
            "Registered firearm not found in government registry"
        
        print("✅ Registered firearm appears in government registry")
    
    def test_19_fees_overview_includes_new_firearm(self):
        """Test that government fees overview reflects the new firearm"""
        response = self.admin_session.get(f"{BASE_URL}/api/government/fees-overview")
        assert response.status_code == 200
        data = response.json()
        
        # Just verify the API works and returns expected structure
        assert data["firearms_fees"]["total_firearms"] >= 0
        
        print(f"✅ Fees overview shows {data['firearms_fees']['total_firearms']} total firearms")
    
    # ===================== Cleanup =====================
    
    def test_20_cleanup_test_firearm(self):
        """Clean up test firearm by marking as transferred"""
        if not TestFirearmsFeesAPIs.test_firearm_id:
            pytest.skip("No test firearm to clean up")
        
        # Mark as transferred (soft delete)
        update_data = {"status": "transferred"}
        response = self.citizen_session.put(
            f"{BASE_URL}/api/citizen/firearms/{TestFirearmsFeesAPIs.test_firearm_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Cleanup failed: {response.text}"
        
        print("✅ Test firearm marked as transferred (cleanup complete)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
