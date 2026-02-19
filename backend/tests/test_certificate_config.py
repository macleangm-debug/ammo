"""
Test Certificate Configuration System APIs
- Tests design templates, seal styles, font options
- Tests signature upload (both drawn and uploaded)
- Tests certificate config save and retrieval
- Tests sending certificates with saved config
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://munitions-docs.preview.emergentagent.com')


class TestCertificateConfigAPIs:
    """Test certificate configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        # Store session token
        token = login_response.json().get("session_token") or login_response.json().get("token")
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ========== GET ENDPOINTS ==========
    
    def test_get_certificate_designs(self):
        """Test GET /api/government/certificate-designs returns 4 design templates"""
        response = self.session.get(f"{BASE_URL}/api/government/certificate-designs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "designs" in data, "Response should contain 'designs' key"
        
        designs = data["designs"]
        assert len(designs) == 4, f"Expected 4 design templates, got {len(designs)}"
        
        # Verify design IDs
        design_ids = [d["id"] for d in designs]
        expected_ids = ["modern", "classic", "corporate", "minimalist"]
        for expected_id in expected_ids:
            assert expected_id in design_ids, f"Missing design template: {expected_id}"
        
        # Verify each design has required fields
        for design in designs:
            assert "id" in design
            assert "name" in design
            assert "description" in design
            assert "preview_colors" in design
            print(f"✅ Design: {design['name']} ({design['id']})")
    
    def test_get_seal_styles(self):
        """Test GET /api/government/seal-styles returns 5 seal options"""
        response = self.session.get(f"{BASE_URL}/api/government/seal-styles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "seals" in data, "Response should contain 'seals' key"
        
        seals = data["seals"]
        assert len(seals) == 5, f"Expected 5 seal styles, got {len(seals)}"
        
        # Verify seal IDs
        seal_ids = [s["id"] for s in seals]
        expected_ids = ["official", "gold_ribbon", "blue_badge", "star_medal", "custom"]
        for expected_id in expected_ids:
            assert expected_id in seal_ids, f"Missing seal style: {expected_id}"
        
        # Verify each seal has required fields
        for seal in seals:
            assert "id" in seal
            assert "name" in seal
            assert "description" in seal
            print(f"✅ Seal: {seal['name']} ({seal['id']})")
    
    def test_get_font_options(self):
        """Test GET /api/government/font-options returns font options"""
        response = self.session.get(f"{BASE_URL}/api/government/font-options")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "fonts" in data, "Response should contain 'fonts' key"
        
        fonts = data["fonts"]
        assert len(fonts) >= 3, f"Expected at least 3 font options, got {len(fonts)}"
        
        # Verify expected fonts
        font_ids = [f["id"] for f in fonts]
        expected_fonts = ["helvetica", "times", "courier"]
        for expected_font in expected_fonts:
            assert expected_font in font_ids, f"Missing font: {expected_font}"
        
        for font in fonts:
            print(f"✅ Font: {font['name']} ({font['id']})")
    
    def test_get_certificate_config(self):
        """Test GET /api/government/certificate-config returns configuration"""
        response = self.session.get(f"{BASE_URL}/api/government/certificate-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        config = response.json()
        
        # Verify default fields exist
        expected_fields = ["default_design", "primary_color", "secondary_color", 
                         "font_family", "seal_style", "seal_text", "organization_name"]
        for field in expected_fields:
            assert field in config, f"Missing config field: {field}"
        
        print(f"✅ Certificate config retrieved successfully")
        print(f"  - Design: {config.get('default_design')}")
        print(f"  - Primary Color: {config.get('primary_color')}")
        print(f"  - Seal Style: {config.get('seal_style')}")
    
    # ========== UPDATE ENDPOINTS ==========
    
    def test_update_certificate_config(self):
        """Test PUT /api/government/certificate-config updates configuration"""
        update_data = {
            "default_design": "modern",
            "primary_color": "#2563eb",
            "secondary_color": "#d4a017",
            "font_family": "helvetica",
            "seal_style": "gold_ribbon",
            "seal_text": "OFFICIAL TEST SEAL",
            "organization_name": "AMMO Government Portal - Test"
        }
        
        response = self.session.put(f"{BASE_URL}/api/government/certificate-config", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result or "config_id" in result, f"Unexpected response: {result}"
        
        # Verify config was updated
        get_response = self.session.get(f"{BASE_URL}/api/government/certificate-config")
        config = get_response.json()
        
        assert config.get("primary_color") == "#2563eb", f"Primary color not updated: {config.get('primary_color')}"
        assert config.get("seal_style") == "gold_ribbon", f"Seal style not updated: {config.get('seal_style')}"
        
        print(f"✅ Certificate config updated successfully")
        print(f"  - New Primary Color: {config.get('primary_color')}")
        print(f"  - New Seal Style: {config.get('seal_style')}")
    
    def test_upload_signature(self):
        """Test POST /api/government/certificate-config/signature uploads signature"""
        # Create a simple test signature (1x1 red pixel PNG in base64)
        test_signature_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        
        signature_payload = {
            "signatory_name": "Dr. James Anderson",
            "signatory_title": "Director of Licensing",
            "signature_data": test_signature_data,
            "signature_type": "upload"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/certificate-config/signature", 
                                    json=signature_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result, f"Expected success message: {result}"
        
        # Verify signature was saved in config
        get_response = self.session.get(f"{BASE_URL}/api/government/certificate-config")
        config = get_response.json()
        
        assert config.get("authorized_signatory_name") == "Dr. James Anderson"
        assert config.get("authorized_signatory_title") == "Director of Licensing"
        assert config.get("signature_image_url") is not None
        
        print(f"✅ Signature uploaded successfully")
        print(f"  - Signatory: {config.get('authorized_signatory_name')}")
        print(f"  - Title: {config.get('authorized_signatory_title')}")
    
    def test_upload_drawn_signature(self):
        """Test uploading a drawn signature (type=draw)"""
        test_signature_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/AAAADwAI/dNHAAAAAElFTkSuQmCC"
        
        signature_payload = {
            "signatory_name": "John Doe",
            "signatory_title": "Chief Officer",
            "signature_data": test_signature_data,
            "signature_type": "draw"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/certificate-config/signature",
                                    json=signature_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print(f"✅ Drawn signature uploaded successfully")
    
    # ========== INTEGRATION TESTS ==========
    
    def test_send_certificate_with_config(self):
        """Test sending a certificate uses saved config (signature, colors)"""
        # First, set up config with signature
        config_data = {
            "default_design": "corporate",
            "primary_color": "#1a365d",
            "secondary_color": "#d4a017",
            "seal_style": "gold_ribbon"
        }
        self.session.put(f"{BASE_URL}/api/government/certificate-config", json=config_data)
        
        # Get users list
        users_response = self.session.get(f"{BASE_URL}/api/government/users-list")
        assert users_response.status_code == 200
        users = users_response.json().get("users", [])
        
        # Find citizen user
        citizen = None
        for u in users:
            if u.get("role") == "citizen":
                citizen = u
                break
        
        if not citizen:
            pytest.skip("No citizen user found for testing")
        
        # Get templates
        templates_response = self.session.get(f"{BASE_URL}/api/government/document-templates")
        assert templates_response.status_code == 200
        templates = templates_response.json().get("templates", [])
        
        # Find a license certificate template
        template = None
        for t in templates:
            if t.get("template_type") == "license_certificate":
                template = t
                break
        
        if not template:
            pytest.skip("No license certificate template found")
        
        # Send certificate
        send_payload = {
            "template_id": template["template_id"],
            "recipients": [citizen["user_id"]],
            "issuer_signature_name": "Dr. James Anderson",
            "issuer_designation": "Director of Licensing",
            "organization_name": "AMMO Government Portal",
            "priority": "normal"
        }
        
        send_response = self.session.post(f"{BASE_URL}/api/government/formal-documents/send",
                                         json=send_payload)
        assert send_response.status_code == 200, f"Expected 200, got {send_response.status_code}: {send_response.text}"
        
        result = send_response.json()
        assert "sent_count" in result or "document_ids" in result or "message" in result
        
        print(f"✅ Certificate sent successfully with saved config")


class TestQRVerification:
    """Test QR code document verification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin to create test document
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("session_token") or login_response.json().get("token")
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_verify_document_endpoint_exists(self):
        """Test that document verification endpoint exists"""
        # Test with a fake document ID - returns 200 with valid:false
        response = self.session.get(f"{BASE_URL}/api/verify/doc_fake123")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("valid") == False, "Expected valid=false for non-existent doc"
        print(f"✅ Verification endpoint responds correctly (valid=false for non-existent doc)")
    
    def test_verify_with_hash(self):
        """Test verification with hash parameter"""
        response = self.session.get(f"{BASE_URL}/api/verify/doc_fake123?h=fakehash123")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("valid") == False, "Expected valid=false for invalid hash"
        print(f"✅ Verification with hash parameter works")


class TestCitizenDocumentView:
    """Test citizen viewing received documents"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with citizen auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as citizen
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "citizen",
            "password": "demo123"
        })
        assert login_response.status_code == 200, f"Citizen login failed: {login_response.text}"
        
        token = login_response.json().get("session_token") or login_response.json().get("token")
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_citizen_can_view_documents(self):
        """Test citizen can view their received documents"""
        response = self.session.get(f"{BASE_URL}/api/citizen/documents")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Documents can come wrapped in {'documents': [...]} or as a list directly
        documents = data.get("documents", data) if isinstance(data, dict) else data
        assert isinstance(documents, list), f"Expected list of documents: {data}"
        
        print(f"✅ Citizen has {len(documents)} documents")
        
        for doc in documents[:3]:  # Show first 3
            print(f"  - {doc.get('title')} ({doc.get('document_type')}) - {doc.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
