"""
Test suite for Government Templates V2 API endpoints
Tests the categorized template management system for document templates

Endpoints tested:
- POST /api/auth/login - Admin authentication
- GET /api/government/document-templates - Fetch all templates
- GET /api/government/users-list - Fetch users for recipient targeting
- POST /api/government/formal-documents/send - Send documents to recipients
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://munitions-docs.preview.emergentagent.com')


class TestGovernmentTemplatesAuth:
    """Authentication tests for admin access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✅ Admin login successful, role: {data['user']['role']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")


class TestDocumentTemplates:
    """Test document templates API"""
    
    @pytest.fixture(autouse=True)
    def setup_with_auth(self):
        """Login and get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Failed to authenticate admin user")
    
    def test_get_document_templates(self):
        """Test fetching all document templates"""
        response = self.session.get(f"{BASE_URL}/api/government/document-templates")
        
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        
        templates = data["templates"]
        assert len(templates) > 0
        
        # Verify template structure
        template = templates[0]
        assert "template_id" in template
        assert "name" in template
        assert "template_type" in template
        
        print(f"✅ Retrieved {len(templates)} templates")
    
    def test_templates_include_standard_templates(self):
        """Test that standard templates are included"""
        response = self.session.get(f"{BASE_URL}/api/government/document-templates")
        
        assert response.status_code == 200
        templates = response.json()["templates"]
        
        # Check for expected standard template types
        template_types = [t.get("template_type") for t in templates]
        
        expected_types = [
            "warning_letter",
            "license_certificate",
            "training_certificate",
            "achievement_certificate",
            "compliance_certificate",
            "formal_notice"
        ]
        
        for expected in expected_types:
            assert expected in template_types, f"Missing template type: {expected}"
        
        print(f"✅ All expected template types found: {expected_types}")
    
    def test_templates_filter_by_type(self):
        """Test filtering templates by type"""
        response = self.session.get(
            f"{BASE_URL}/api/government/document-templates",
            params={"template_type": "warning_letter"}
        )
        
        assert response.status_code == 200
        templates = response.json()["templates"]
        
        for template in templates:
            assert template["template_type"] == "warning_letter"
        
        print(f"✅ Filtered to {len(templates)} warning_letter templates")


class TestUsersList:
    """Test users list API for recipient targeting"""
    
    @pytest.fixture(autouse=True)
    def setup_with_auth(self):
        """Login and get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Failed to authenticate admin user")
    
    def test_get_users_list(self):
        """Test fetching users list for notification targeting"""
        response = self.session.get(f"{BASE_URL}/api/government/users-list")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert "role_counts" in data
        
        users = data["users"]
        assert len(users) > 0
        
        # Verify user structure
        user = users[0]
        assert "user_id" in user
        assert "name" in user
        assert "role" in user
        
        print(f"✅ Retrieved {len(users)} users")
        print(f"   Role counts: {data['role_counts']}")
    
    def test_users_include_citizens_and_dealers(self):
        """Test that users list includes citizens and dealers"""
        response = self.session.get(f"{BASE_URL}/api/government/users-list")
        
        assert response.status_code == 200
        users = response.json()["users"]
        
        roles = set([u["role"] for u in users])
        assert "citizen" in roles, "No citizens in user list"
        assert "dealer" in roles, "No dealers in user list"
        
        print(f"✅ User roles found: {roles}")


class TestDocumentSending:
    """Test document sending functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_with_auth(self):
        """Login and get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Failed to authenticate admin user")
    
    def test_send_document_to_individual(self):
        """Test sending document to individual user"""
        # First get a valid user
        users_response = self.session.get(f"{BASE_URL}/api/government/users-list")
        users = users_response.json()["users"]
        citizen = next((u for u in users if u["role"] == "citizen"), None)
        
        if not citizen:
            pytest.skip("No citizen users available")
        
        # Send document
        response = self.session.post(
            f"{BASE_URL}/api/government/formal-documents/send",
            json={
                "template_id": "std_warning_general",
                "recipients": [citizen["user_id"]],
                "placeholder_values": {
                    "violation_type": "Test violation",
                    "incident_date": "2026-01-01",
                    "violation_details": "Test details",
                    "reference_number": "TEST-001"
                },
                "priority": "normal"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "documents" in data
        assert len(data["documents"]) == 1
        
        print(f"✅ Document sent to {citizen['name']}")
    
    def test_send_document_to_all_citizens(self):
        """Test broadcast sending to all citizens"""
        response = self.session.post(
            f"{BASE_URL}/api/government/formal-documents/send",
            json={
                "template_id": "std_formal_notice",
                "recipients": ["role:citizen"],
                "placeholder_values": {
                    "notice_subject": "Test broadcast notice",
                    "notice_body": "This is a test broadcast to all citizens",
                    "action_deadline": "2026-02-28",
                    "reference_number": "BROADCAST-001"
                },
                "priority": "high"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "documents" in data
        
        # Should send to multiple citizens
        assert len(data["documents"]) > 0
        print(f"✅ Broadcast sent to {len(data['documents'])} citizens")
    
    def test_send_document_invalid_template(self):
        """Test sending with invalid template ID"""
        response = self.session.post(
            f"{BASE_URL}/api/government/formal-documents/send",
            json={
                "template_id": "invalid_template_id",
                "recipients": ["demo_citizen_001"],
                "placeholder_values": {}
            }
        )
        
        assert response.status_code == 404
        print("✅ Invalid template correctly rejected")
    
    def test_send_document_no_recipients(self):
        """Test sending with no valid recipients"""
        response = self.session.post(
            f"{BASE_URL}/api/government/formal-documents/send",
            json={
                "template_id": "std_warning_general",
                "recipients": ["invalid_user_id"],
                "placeholder_values": {}
            }
        )
        
        assert response.status_code == 400
        print("✅ No valid recipients correctly rejected")
    
    def test_send_certificate_with_signature(self):
        """Test sending certificate with issuer signature info"""
        users_response = self.session.get(f"{BASE_URL}/api/government/users-list")
        users = users_response.json()["users"]
        citizen = next((u for u in users if u["role"] == "citizen"), None)
        
        if not citizen:
            pytest.skip("No citizen users available")
        
        response = self.session.post(
            f"{BASE_URL}/api/government/formal-documents/send",
            json={
                "template_id": "std_license_cert",
                "recipients": [citizen["user_id"]],
                "placeholder_values": {
                    "license_type": "Firearm",
                    "license_number": "TEST-LIC-001",
                    "issue_date": "2026-01-15",
                    "expiry_date": "2027-01-15",
                    "region": "Northeast",
                    "license_permissions": "purchase and possess firearms"
                },
                "issuer_signature_name": "Dr. Test Administrator",
                "issuer_designation": "Chief Licensing Officer",
                "organization_name": "AMMO Government Portal",
                "priority": "normal"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert len(data["documents"]) == 1
        
        print(f"✅ Certificate sent with signature info to {citizen['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
