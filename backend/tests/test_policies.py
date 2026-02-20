"""
Test suite for Policy Management System APIs
Tests: Policies CRUD, Presets, Currencies, Accredited Hospitals, Compliance Status
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPoliciesAPI:
    """Tests for /api/government/policies endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as admin before each test"""
        self.session = requests.Session()
        # Demo login as admin
        setup_resp = self.session.post(f"{BASE_URL}/api/demo/setup")
        assert setup_resp.status_code == 200, f"Demo setup failed: {setup_resp.text}"
        
        login_resp = self.session.post(f"{BASE_URL}/api/demo/login/admin")
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        
        # Store cookie for subsequent requests
        self.cookies = self.session.cookies
        yield
    
    def test_get_policies_returns_default(self):
        """GET /api/government/policies should return default policies"""
        response = self.session.get(f"{BASE_URL}/api/government/policies")
        assert response.status_code == 200
        
        data = response.json()
        assert "policy_id" in data
        assert "fees" in data
        assert "escalation" in data
        assert "training" in data
        assert "ari" in data
        assert "additional" in data
        
        # Verify fee structure
        fees = data.get("fees", {})
        assert "currency" in fees
        assert "currency_symbol" in fees
        assert "member_annual_license_fee" in fees
        assert "per_firearm_registration_fee" in fees
        assert "late_fee_penalty_percent" in fees
        assert "grace_period_days" in fees
        print(f"✅ GET /api/government/policies returns complete policy structure")
    
    def test_policies_contains_all_categories(self):
        """Policies should contain all required categories"""
        response = self.session.get(f"{BASE_URL}/api/government/policies")
        assert response.status_code == 200
        
        data = response.json()
        
        # Escalation policies
        escalation = data.get("escalation", {})
        assert "grace_period_days" in escalation
        assert "warning_intervals" in escalation
        assert "suspension_trigger_days" in escalation
        assert "block_dealer_transactions" in escalation
        assert "block_government_services" in escalation
        assert "flag_firearm_repossession" in escalation
        
        # Training policies
        training = data.get("training", {})
        assert "mandatory_initial_training_hours" in training
        assert "annual_refresher_training_hours" in training
        assert "range_practice_sessions_per_year" in training
        assert "mental_health_assessment_required" in training
        
        # ARI policies
        ari = data.get("ari", {})
        assert "points_per_training_hour" in ari
        assert "min_ari_for_renewal" in ari
        
        # Additional policies
        additional = data.get("additional", {})
        assert "background_check_renewal_months" in additional
        assert "waiting_period_days" in additional
        assert "min_age_handgun" in additional
        
        print(f"✅ Policies contains all required categories")
    
    def test_update_policies(self):
        """PUT /api/government/policies should update policies"""
        update_data = {
            "fees": {
                "member_annual_license_fee": 175.00,
                "late_fee_penalty_percent": 12.0
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/government/policies", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "policies" in data
        
        # Verify update was applied
        policies = data.get("policies", {})
        assert policies.get("fees", {}).get("member_annual_license_fee") == 175.00
        assert policies.get("fees", {}).get("late_fee_penalty_percent") == 12.0
        
        # Verify preset_name changed to custom
        assert policies.get("preset_name") == "custom"
        
        print(f"✅ PUT /api/government/policies updates policies correctly")
    
    def test_update_policies_deep_merge(self):
        """Updating one field shouldn't remove others"""
        # Get current policies
        get_resp = self.session.get(f"{BASE_URL}/api/government/policies")
        original = get_resp.json()
        original_currency = original.get("fees", {}).get("currency")
        
        # Update only one field
        update_data = {
            "fees": {
                "per_firearm_registration_fee": 60.00
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/government/policies", json=update_data)
        assert response.status_code == 200
        
        policies = response.json().get("policies", {})
        
        # Verify update
        assert policies.get("fees", {}).get("per_firearm_registration_fee") == 60.00
        
        # Verify other fields not removed
        assert policies.get("fees", {}).get("currency") == original_currency
        
        print(f"✅ PUT /api/government/policies performs deep merge correctly")


class TestPolicyPresets:
    """Tests for policy presets"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as admin"""
        self.session = requests.Session()
        self.session.post(f"{BASE_URL}/api/demo/setup")
        login_resp = self.session.post(f"{BASE_URL}/api/demo/login/admin")
        assert login_resp.status_code == 200
        yield
    
    def test_apply_strict_preset(self):
        """POST /api/government/policies/apply-preset with strict should apply stricter values"""
        response = self.session.post(
            f"{BASE_URL}/api/government/policies/apply-preset",
            json={"preset_name": "strict"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "policies" in data
        
        policies = data.get("policies", {})
        assert policies.get("preset_name") == "strict"
        
        # Strict preset should have higher fees
        assert policies.get("fees", {}).get("member_annual_license_fee") == 250.00
        assert policies.get("fees", {}).get("per_firearm_registration_fee") == 100.00
        assert policies.get("fees", {}).get("grace_period_days") == 14
        
        # Strict preset should have more training hours
        assert policies.get("training", {}).get("mandatory_initial_training_hours") == 16
        
        print(f"✅ Strict preset applied correctly")
    
    def test_apply_standard_preset(self):
        """POST /api/government/policies/apply-preset with standard should apply default values"""
        response = self.session.post(
            f"{BASE_URL}/api/government/policies/apply-preset",
            json={"preset_name": "standard"}
        )
        assert response.status_code == 200
        
        data = response.json()
        policies = data.get("policies", {})
        
        assert policies.get("preset_name") == "standard"
        assert policies.get("fees", {}).get("member_annual_license_fee") == 150.00
        assert policies.get("fees", {}).get("per_firearm_registration_fee") == 50.00
        assert policies.get("fees", {}).get("grace_period_days") == 30
        
        print(f"✅ Standard preset applied correctly")
    
    def test_apply_permissive_preset(self):
        """POST /api/government/policies/apply-preset with permissive should apply lenient values"""
        response = self.session.post(
            f"{BASE_URL}/api/government/policies/apply-preset",
            json={"preset_name": "permissive"}
        )
        assert response.status_code == 200
        
        data = response.json()
        policies = data.get("policies", {})
        
        assert policies.get("preset_name") == "permissive"
        assert policies.get("fees", {}).get("member_annual_license_fee") == 75.00
        assert policies.get("fees", {}).get("per_firearm_registration_fee") == 25.00
        assert policies.get("fees", {}).get("grace_period_days") == 60
        
        # Permissive has less training requirements
        assert policies.get("training", {}).get("mandatory_initial_training_hours") == 4
        assert policies.get("training", {}).get("mental_health_assessment_required") == False
        
        print(f"✅ Permissive preset applied correctly")
    
    def test_apply_invalid_preset_returns_400(self):
        """Applying invalid preset should return 400"""
        response = self.session.post(
            f"{BASE_URL}/api/government/policies/apply-preset",
            json={"preset_name": "invalid_preset"}
        )
        assert response.status_code == 400
        print(f"✅ Invalid preset returns 400 error")


class TestSupportedCurrencies:
    """Tests for /api/government/supported-currencies"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.post(f"{BASE_URL}/api/demo/setup")
        self.session.post(f"{BASE_URL}/api/demo/login/admin")
        yield
    
    def test_get_currencies_returns_15(self):
        """GET /api/government/supported-currencies should return 15 currencies"""
        response = self.session.get(f"{BASE_URL}/api/government/supported-currencies")
        assert response.status_code == 200
        
        data = response.json()
        assert "currencies" in data
        
        currencies = data.get("currencies", [])
        assert len(currencies) == 15, f"Expected 15 currencies, got {len(currencies)}"
        print(f"✅ GET /api/government/supported-currencies returns 15 currencies")
    
    def test_currencies_have_required_fields(self):
        """Each currency should have code, symbol, and name"""
        response = self.session.get(f"{BASE_URL}/api/government/supported-currencies")
        assert response.status_code == 200
        
        currencies = response.json().get("currencies", [])
        
        for currency in currencies:
            assert "code" in currency, f"Currency missing code: {currency}"
            assert "symbol" in currency, f"Currency missing symbol: {currency}"
            assert "name" in currency, f"Currency missing name: {currency}"
        
        # Verify some specific currencies exist
        codes = [c["code"] for c in currencies]
        assert "USD" in codes
        assert "EUR" in codes
        assert "GBP" in codes
        assert "INR" in codes
        assert "AED" in codes
        
        print(f"✅ All currencies have required fields (code, symbol, name)")


class TestAccreditedHospitals:
    """Tests for /api/government/accredited-hospitals CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.post(f"{BASE_URL}/api/demo/setup")
        self.session.post(f"{BASE_URL}/api/demo/login/admin")
        self.test_hospital_id = None
        yield
        # Cleanup: delete test hospital if created
        if self.test_hospital_id:
            self.session.delete(f"{BASE_URL}/api/government/accredited-hospitals/{self.test_hospital_id}")
    
    def test_get_hospitals(self):
        """GET /api/government/accredited-hospitals should return list and stats"""
        response = self.session.get(f"{BASE_URL}/api/government/accredited-hospitals")
        assert response.status_code == 200
        
        data = response.json()
        assert "hospitals" in data
        assert "stats" in data
        
        stats = data.get("stats", {})
        assert "total" in stats
        assert "by_type" in stats
        assert "by_status" in stats
        
        print(f"✅ GET /api/government/accredited-hospitals returns hospitals and stats")
    
    def test_create_hospital(self):
        """POST /api/government/accredited-hospitals should create new hospital"""
        hospital_data = {
            "name": "TEST_General Hospital",
            "hospital_type": "national",
            "address": "123 Test Street",
            "city": "Test City",
            "state": "TC",
            "country": "USA",
            "phone": "555-0123",
            "email": "test@hospital.com",
            "accreditation_number": "ACC-TEST-001",
            "accreditation_expiry": "2027-12-31"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/government/accredited-hospitals",
            json=hospital_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "hospital_id" in data
        
        self.test_hospital_id = data.get("hospital_id")
        
        # Verify hospital was created by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/government/accredited-hospitals")
        hospitals = get_response.json().get("hospitals", [])
        created = next((h for h in hospitals if h.get("hospital_id") == self.test_hospital_id), None)
        
        assert created is not None, "Created hospital not found"
        assert created.get("name") == "TEST_General Hospital"
        assert created.get("status") == "active"
        
        print(f"✅ POST /api/government/accredited-hospitals creates hospital")
    
    def test_update_hospital(self):
        """PUT /api/government/accredited-hospitals/{id} should update hospital"""
        # First create a hospital
        create_resp = self.session.post(
            f"{BASE_URL}/api/government/accredited-hospitals",
            json={
                "name": "TEST_Update Hospital",
                "hospital_type": "regional",
                "address": "456 Update Ave",
                "city": "Update City",
                "state": "UC",
                "country": "USA",
                "phone": "555-0456",
                "accreditation_number": "ACC-TEST-002",
                "accreditation_expiry": "2027-06-30"
            }
        )
        hospital_id = create_resp.json().get("hospital_id")
        self.test_hospital_id = hospital_id
        
        # Update the hospital
        update_resp = self.session.put(
            f"{BASE_URL}/api/government/accredited-hospitals/{hospital_id}",
            json={"name": "TEST_Updated Hospital Name", "hospital_type": "private"}
        )
        assert update_resp.status_code == 200
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/government/accredited-hospitals")
        hospitals = get_response.json().get("hospitals", [])
        updated = next((h for h in hospitals if h.get("hospital_id") == hospital_id), None)
        
        assert updated.get("name") == "TEST_Updated Hospital Name"
        assert updated.get("hospital_type") == "private"
        
        print(f"✅ PUT /api/government/accredited-hospitals updates hospital")
    
    def test_delete_hospital_deactivates(self):
        """DELETE /api/government/accredited-hospitals/{id} should deactivate hospital"""
        # First create a hospital
        create_resp = self.session.post(
            f"{BASE_URL}/api/government/accredited-hospitals",
            json={
                "name": "TEST_Delete Hospital",
                "hospital_type": "national",
                "address": "789 Delete Rd",
                "city": "Delete City",
                "state": "DC",
                "country": "USA",
                "phone": "555-0789",
                "accreditation_number": "ACC-TEST-003",
                "accreditation_expiry": "2027-03-31"
            }
        )
        hospital_id = create_resp.json().get("hospital_id")
        
        # Delete the hospital
        delete_resp = self.session.delete(
            f"{BASE_URL}/api/government/accredited-hospitals/{hospital_id}"
        )
        assert delete_resp.status_code == 200
        
        # Verify it's deactivated (status = inactive)
        get_response = self.session.get(f"{BASE_URL}/api/government/accredited-hospitals")
        hospitals = get_response.json().get("hospitals", [])
        deleted = next((h for h in hospitals if h.get("hospital_id") == hospital_id), None)
        
        assert deleted.get("status") == "inactive"
        
        print(f"✅ DELETE /api/government/accredited-hospitals deactivates hospital")


class TestComplianceStatus:
    """Tests for /api/government/compliance-status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.post(f"{BASE_URL}/api/demo/setup")
        self.session.post(f"{BASE_URL}/api/demo/login/admin")
        yield
    
    def test_get_compliance_status(self):
        """GET /api/government/compliance-status should return compliance summary"""
        response = self.session.get(f"{BASE_URL}/api/government/compliance-status")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        
        summary = data.get("summary", {})
        assert "total_members" in summary
        assert "compliant" in summary
        assert "in_grace_period" in summary
        assert "warning_issued" in summary
        assert "suspended" in summary
        
        # All counts should be non-negative integers
        assert summary.get("total_members", -1) >= 0
        assert summary.get("compliant", -1) >= 0
        
        print(f"✅ GET /api/government/compliance-status returns compliance summary")


class TestUnauthorizedAccess:
    """Test that endpoints require authentication"""
    
    def test_policies_requires_auth(self):
        """GET /api/government/policies should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/government/policies")
        assert response.status_code == 401
        print(f"✅ /api/government/policies requires authentication")
    
    def test_currencies_requires_auth(self):
        """GET /api/government/supported-currencies should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/government/supported-currencies")
        assert response.status_code == 401
        print(f"✅ /api/government/supported-currencies requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
