"""
Test Suite for Review System APIs
Tests: License Applications, Dealer Certification, Violation Reports, License Renewals, Appeals
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicEndpoints:
    """Tests for public application endpoints (no auth required)"""
    
    def test_license_application_submit(self):
        """Test submitting a license application"""
        payload = {
            "applicant_name": "TEST_John Smith",
            "applicant_email": "test_john@example.com",
            "applicant_phone": "555-1234",
            "applicant_address": "123 Test Street, Test City, TC 12345",
            "license_type": "firearm",
            "purpose": "personal_protection",
            "date_of_birth": "1990-05-15",
            "id_type": "drivers_license",
            "id_number": "DL12345678",
            "has_previous_license": False,
            "training_completed": True,
            "training_certificate_number": "CERT-001",
            "region": "northeast"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/license-application", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "application_id" in data
        assert "review_id" in data
        assert data["status"] == "pending"
        assert "message" in data
        print(f"✓ License application submitted: {data['application_id']}")
        return data
    
    def test_license_application_missing_fields(self):
        """Test license application with missing required fields"""
        payload = {
            "applicant_name": "TEST_Incomplete"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/license-application", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        print("✓ Missing fields properly rejected")
    
    def test_dealer_certification_submit(self):
        """Test submitting a dealer certification application"""
        payload = {
            "business_name": "TEST_Firearms Inc",
            "owner_name": "TEST_Jane Dealer",
            "owner_email": "test_dealer@example.com",
            "owner_phone": "555-9876",
            "business_address": "456 Commerce Blvd, Business City, BC 67890",
            "business_type": "retail",
            "tax_id": "12-3456789",
            "business_license_number": "BL-2024-001",
            "years_in_business": 5,
            "has_physical_location": True,
            "security_measures": ["alarm_system", "surveillance", "safe_storage"],
            "insurance_provider": "Test Insurance Co",
            "insurance_policy_number": "INS-12345",
            "background_check_consent": True,
            "compliance_agreement": True,
            "region": "midwest"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/dealer-certification", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "certification_id" in data
        assert "review_id" in data
        assert data["status"] == "pending"
        print(f"✓ Dealer certification submitted: {data['certification_id']}")
        return data
    
    def test_dealer_certification_missing_consent(self):
        """Test dealer certification without consent flags"""
        payload = {
            "business_name": "TEST_NoConsent Inc",
            "owner_name": "TEST_No Consent",
            "owner_email": "noconsent@example.com",
            "owner_phone": "555-0000",
            "business_address": "999 Nowhere St",
            "business_type": "retail",
            "tax_id": "00-0000000",
            "business_license_number": "BL-NONE",
            "region": "northeast",
            "background_check_consent": False,
            "compliance_agreement": False
        }
        
        response = requests.post(f"{BASE_URL}/api/public/dealer-certification", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing consent, got {response.status_code}"
        print("✓ Missing consent properly rejected")
    
    def test_report_violation_submit(self):
        """Test submitting a violation report"""
        payload = {
            "violation_type": "storage_violation",
            "description": "TEST_Observed unsafe storage practices at location",
            "location": "789 Suspect Ave, Risk Town, RT 11111",
            "date_observed": "2024-01-15",
            "reporter_name": "Anonymous Citizen",
            "reporter_email": "anon@example.com",
            "severity": "high",
            "subject_name": "Unknown Dealer",
            "evidence_description": "Photos taken from public area",
            "region": "southeast"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/report-violation", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "violation_id" in data
        assert "review_id" in data
        assert data["status"] == "pending"
        print(f"✓ Violation report submitted: {data['violation_id']}")
        return data
    
    def test_report_violation_anonymous(self):
        """Test anonymous violation report (minimal fields)"""
        payload = {
            "violation_type": "illegal_sale",
            "description": "TEST_Anonymous tip about suspected illegal sales"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/report-violation", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "violation_id" in data
        print("✓ Anonymous violation report accepted")
    
    def test_report_violation_missing_description(self):
        """Test violation report without description"""
        payload = {
            "violation_type": "storage_violation"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/report-violation", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing description properly rejected")


class TestAdminReviewEndpoints:
    """Tests for admin review management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            data = login_response.json()
            if "token" in data:
                self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
            elif "access_token" in data:
                self.session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
            print(f"✓ Admin logged in successfully")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_get_pending_reviews_count(self):
        """Test getting pending review counts"""
        response = self.session.get(f"{BASE_URL}/api/reviews/pending-count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data
        assert "license_applications" in data
        assert "license_renewals" in data
        assert "dealer_certifications" in data
        assert "flagged_transactions" in data
        assert "compliance_violations" in data
        assert "appeals" in data
        
        print(f"✓ Pending counts: Total={data['total']}, Apps={data['license_applications']}, Certs={data['dealer_certifications']}, Violations={data['compliance_violations']}")
        return data
    
    def test_get_reviews_list(self):
        """Test getting review list"""
        response = self.session.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reviews" in data
        assert "total" in data
        assert isinstance(data["reviews"], list)
        
        print(f"✓ Retrieved {len(data['reviews'])} reviews (total: {data['total']})")
        return data
    
    def test_get_reviews_filter_by_status(self):
        """Test filtering reviews by status"""
        response = self.session.get(f"{BASE_URL}/api/reviews?status=pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned reviews should have pending status
        for review in data["reviews"]:
            assert review["status"] == "pending", f"Expected pending, got {review['status']}"
        
        print(f"✓ Status filter works: {len(data['reviews'])} pending reviews")
    
    def test_get_reviews_filter_by_type(self):
        """Test filtering reviews by item type"""
        response = self.session.get(f"{BASE_URL}/api/reviews?item_type=license_application")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned reviews should be license applications
        for review in data["reviews"]:
            assert review["item_type"] == "license_application"
        
        print(f"✓ Type filter works: {len(data['reviews'])} license applications")
    
    def test_get_reviews_filter_by_region(self):
        """Test filtering reviews by region"""
        response = self.session.get(f"{BASE_URL}/api/reviews?region=northeast")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        for review in data["reviews"]:
            if review.get("region"):
                assert review["region"] == "northeast"
        
        print(f"✓ Region filter works: {len(data['reviews'])} northeast reviews")
    
    def test_get_review_detail(self):
        """Test getting review detail"""
        # First get a review ID
        list_response = self.session.get(f"{BASE_URL}/api/reviews?limit=1")
        if list_response.status_code != 200 or not list_response.json().get("reviews"):
            pytest.skip("No reviews available to test detail")
        
        review_id = list_response.json()["reviews"][0]["review_id"]
        
        response = self.session.get(f"{BASE_URL}/api/reviews/{review_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "review" in data
        assert data["review"]["review_id"] == review_id
        
        print(f"✓ Review detail retrieved: {review_id}")
        return data
    
    def test_get_review_detail_not_found(self):
        """Test getting non-existent review"""
        response = self.session.get(f"{BASE_URL}/api/reviews/nonexistent_review_123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent review returns 404")
    
    def test_update_review_status(self):
        """Test updating review status"""
        # First create a test application
        app_response = requests.post(f"{BASE_URL}/api/public/license-application", json={
            "applicant_name": "TEST_Status Update",
            "applicant_email": "test_status@example.com",
            "applicant_address": "123 Update St",
            "license_type": "firearm",
            "purpose": "sport",
            "date_of_birth": "1985-03-20",
            "id_type": "passport",
            "id_number": "P12345678",
            "region": "west"
        })
        
        if app_response.status_code != 200:
            pytest.skip("Could not create test application")
        
        review_id = app_response.json()["review_id"]
        
        # Update to under_review
        update_response = self.session.put(f"{BASE_URL}/api/reviews/{review_id}", json={
            "status": "under_review"
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        data = update_response.json()
        assert data["review"]["status"] == "under_review"
        print(f"✓ Review status updated to under_review: {review_id}")
    
    def test_approve_review(self):
        """Test approving a review"""
        # Create test application
        app_response = requests.post(f"{BASE_URL}/api/public/license-application", json={
            "applicant_name": "TEST_Approve",
            "applicant_email": "test_approve@example.com",
            "applicant_address": "123 Approve St",
            "license_type": "ammunition",
            "purpose": "hunting",
            "date_of_birth": "1980-07-10",
            "id_type": "state_id",
            "id_number": "SI12345678",
            "region": "southwest"
        })
        
        if app_response.status_code != 200:
            pytest.skip("Could not create test application")
        
        review_id = app_response.json()["review_id"]
        
        # Approve with reason
        update_response = self.session.put(f"{BASE_URL}/api/reviews/{review_id}", json={
            "status": "approved",
            "decision_reason": "All requirements met. Background check passed."
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        data = update_response.json()
        assert data["review"]["status"] == "approved"
        assert data["review"]["decided_by"] is not None
        assert data["review"]["decided_at"] is not None
        print(f"✓ Review approved: {review_id}")
    
    def test_reject_review(self):
        """Test rejecting a review"""
        # Create test application
        app_response = requests.post(f"{BASE_URL}/api/public/license-application", json={
            "applicant_name": "TEST_Reject",
            "applicant_email": "test_reject@example.com",
            "applicant_address": "123 Reject St",
            "license_type": "both",
            "purpose": "collection",
            "date_of_birth": "1975-12-25",
            "id_type": "drivers_license",
            "id_number": "DL98765432",
            "region": "southeast"
        })
        
        if app_response.status_code != 200:
            pytest.skip("Could not create test application")
        
        review_id = app_response.json()["review_id"]
        
        # Reject with reason
        update_response = self.session.put(f"{BASE_URL}/api/reviews/{review_id}", json={
            "status": "rejected",
            "decision_reason": "Incomplete documentation. Missing required training certificate."
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        data = update_response.json()
        assert data["review"]["status"] == "rejected"
        print(f"✓ Review rejected: {review_id}")
    
    def test_add_note_to_review(self):
        """Test adding a note to a review"""
        # Get an existing review
        list_response = self.session.get(f"{BASE_URL}/api/reviews?status=pending&limit=1")
        if list_response.status_code != 200 or not list_response.json().get("reviews"):
            pytest.skip("No pending reviews available")
        
        review_id = list_response.json()["reviews"][0]["review_id"]
        
        # Add note
        update_response = self.session.put(f"{BASE_URL}/api/reviews/{review_id}", json={
            "note": "TEST_Note: Additional verification required."
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify note was added
        detail_response = self.session.get(f"{BASE_URL}/api/reviews/{review_id}")
        data = detail_response.json()
        
        notes = data["review"].get("notes", [])
        assert len(notes) > 0, "Note should have been added"
        
        print(f"✓ Note added to review: {review_id}")


class TestCitizenReviewEndpoints:
    """Tests for citizen portal review endpoints (license renewal, appeals)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup citizen session"""
        self.session = requests.Session()
        # Login as citizen
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "citizen",
            "password": "demo123"
        })
        if login_response.status_code == 200:
            data = login_response.json()
            if "token" in data:
                self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
            elif "access_token" in data:
                self.session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
            print(f"✓ Citizen logged in successfully")
        else:
            pytest.skip(f"Citizen login failed: {login_response.status_code}")
    
    def test_submit_license_renewal(self):
        """Test submitting a license renewal request"""
        payload = {
            "reason_for_renewal": "standard",
            "address_changed": False,
            "training_current": True,
            "any_incidents": False,
            "region": "northeast"
        }
        
        response = self.session.post(f"{BASE_URL}/api/citizen/license-renewal", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "renewal_id" in data
        assert "review_id" in data
        assert data["status"] == "pending"
        
        print(f"✓ License renewal submitted: {data['renewal_id']}")
        return data
    
    def test_submit_license_renewal_with_address_change(self):
        """Test license renewal with address change"""
        payload = {
            "reason_for_renewal": "standard",
            "address_changed": True,
            "new_address": "999 New Address Lane, New City, NC 55555",
            "training_current": True,
            "any_incidents": False,
            "region": "midwest"
        }
        
        response = self.session.post(f"{BASE_URL}/api/citizen/license-renewal", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✓ License renewal with address change submitted")
    
    def test_submit_appeal(self):
        """Test submitting an appeal"""
        payload = {
            "original_decision_type": "license_rejection",
            "original_decision_id": "REV-TEST-001",
            "original_decision_date": "2024-01-10",
            "grounds_for_appeal": "TEST_I believe the rejection was based on outdated information. I have since completed all required training.",
            "supporting_evidence": "Training certificate dated after original decision",
            "requested_outcome": "Reversal of rejection and approval of license application",
            "region": "northeast"
        }
        
        response = self.session.post(f"{BASE_URL}/api/citizen/appeal", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "appeal_id" in data
        assert "review_id" in data
        assert data["status"] == "pending"
        
        print(f"✓ Appeal submitted: {data['appeal_id']}")
        return data
    
    def test_submit_appeal_missing_required_fields(self):
        """Test appeal submission with missing required fields"""
        payload = {
            "original_decision_type": "license_rejection"
        }
        
        response = self.session.post(f"{BASE_URL}/api/citizen/appeal", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing appeal fields properly rejected")
    
    def test_get_my_reviews(self):
        """Test getting citizen's own reviews"""
        response = self.session.get(f"{BASE_URL}/api/citizen/my-reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reviews" in data
        assert isinstance(data["reviews"], list)
        
        print(f"✓ Retrieved {len(data['reviews'])} citizen reviews")
        return data


class TestReviewSystemIntegration:
    """Integration tests for the complete review workflow"""
    
    def test_complete_license_application_workflow(self):
        """Test complete workflow: submit -> review -> approve"""
        # 1. Submit application (public)
        app_payload = {
            "applicant_name": "TEST_Integration User",
            "applicant_email": "test_integration@example.com",
            "applicant_address": "123 Integration St",
            "license_type": "firearm",
            "purpose": "personal_protection",
            "date_of_birth": "1988-04-22",
            "id_type": "drivers_license",
            "id_number": "INT123456",
            "training_completed": True,
            "region": "northeast"
        }
        
        submit_response = requests.post(f"{BASE_URL}/api/public/license-application", json=app_payload)
        assert submit_response.status_code == 200
        review_id = submit_response.json()["review_id"]
        print(f"  ✓ Application submitted: {review_id}")
        
        # 2. Login as admin
        admin_session = requests.Session()
        login_response = admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token") or login_response.json().get("access_token")
        admin_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # 3. Verify review appears in pending list
        list_response = admin_session.get(f"{BASE_URL}/api/reviews?status=pending")
        assert list_response.status_code == 200
        reviews = list_response.json()["reviews"]
        review_ids = [r["review_id"] for r in reviews]
        assert review_id in review_ids, "New review should appear in pending list"
        print(f"  ✓ Review visible in admin pending list")
        
        # 4. Get review detail
        detail_response = admin_session.get(f"{BASE_URL}/api/reviews/{review_id}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["review"]["submitter_name"] == "TEST_Integration User"
        print(f"  ✓ Review detail retrieved")
        
        # 5. Add a note
        note_response = admin_session.put(f"{BASE_URL}/api/reviews/{review_id}", json={
            "note": "Reviewing application documentation"
        })
        assert note_response.status_code == 200
        print(f"  ✓ Note added to review")
        
        # 6. Approve the review
        approve_response = admin_session.put(f"{BASE_URL}/api/reviews/{review_id}", json={
            "status": "approved",
            "decision_reason": "All requirements verified. Application approved."
        })
        assert approve_response.status_code == 200
        assert approve_response.json()["review"]["status"] == "approved"
        print(f"  ✓ Review approved")
        
        # 7. Verify status changed
        final_detail = admin_session.get(f"{BASE_URL}/api/reviews/{review_id}")
        assert final_detail.json()["review"]["status"] == "approved"
        print(f"✓ Complete license application workflow test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
