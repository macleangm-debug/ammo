"""
Test suite for Formal Documents & Certificates API
Testing: Document templates, PDF generation, sending documents to citizens
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDocumentTemplatesAPI:
    """Tests for Government Document Templates API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin authentication token"""
        self.session = requests.Session()
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            self.admin_token = login_response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_document_templates_returns_standard_templates(self):
        """GET /api/government/document-templates - returns standard templates"""
        response = self.session.get(f"{BASE_URL}/api/government/document-templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        
        # Should have at least 5 standard templates
        assert len(templates) >= 5, f"Expected at least 5 templates, got {len(templates)}"
        
        # Check standard template IDs exist
        template_ids = [t["template_id"] for t in templates]
        expected_ids = ["std_warning_general", "std_license_cert", "std_training_cert", 
                       "std_achievement_cert", "std_formal_notice"]
        
        for expected_id in expected_ids:
            assert expected_id in template_ids, f"Standard template {expected_id} not found"
        
        # Verify template structure
        for template in templates:
            assert "template_id" in template
            assert "name" in template
            assert "template_type" in template
            assert "body_template" in template
    
    def test_get_document_templates_requires_auth(self):
        """GET /api/government/document-templates - requires admin auth"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/government/document-templates")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
    
    def test_create_custom_template(self):
        """POST /api/government/document-templates - create custom template"""
        template_data = {
            "name": "TEST Custom Warning",
            "description": "Test custom warning template",
            "template_type": "warning_letter",
            "category": "compliance",
            "primary_color": "#ff0000",
            "secondary_color": "#ff6666",
            "title": "Test Warning Notice",
            "body_template": "Dear {{recipient_name}},\n\nThis is a test warning.\n\nReference: {{reference_number}}",
            "footer_text": "Test footer text",
            "signature_title": "Test Administrator",
            "seal_enabled": True,
            "watermark_enabled": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/document-templates", json=template_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "template_id" in data
        assert "message" in data
        assert data["message"] == "Template created successfully"
        
        # Verify template was created by fetching all templates
        get_response = self.session.get(f"{BASE_URL}/api/government/document-templates")
        assert get_response.status_code == 200
        templates = get_response.json().get("templates", [])
        created_template = next((t for t in templates if t["template_id"] == data["template_id"]), None)
        
        assert created_template is not None, "Created template not found in list"
        assert created_template["name"] == template_data["name"]
        assert created_template["is_standard"] == False
    
    def test_update_template(self):
        """PUT /api/government/document-templates/{id} - update template"""
        # First create a template
        create_response = self.session.post(f"{BASE_URL}/api/government/document-templates", json={
            "name": "TEST Template to Update",
            "description": "Will be updated",
            "template_type": "formal_notice",
            "title": "Original Title",
            "body_template": "Original body"
        })
        
        assert create_response.status_code == 200
        template_id = create_response.json()["template_id"]
        
        # Update the template
        update_data = {
            "name": "TEST Updated Template Name",
            "title": "Updated Title",
            "primary_color": "#00ff00"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/government/document-templates/{template_id}", json=update_data)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        assert "message" in update_response.json()
        
        # Verify changes persisted
        get_response = self.session.get(f"{BASE_URL}/api/government/document-templates")
        templates = get_response.json().get("templates", [])
        updated_template = next((t for t in templates if t["template_id"] == template_id), None)
        
        assert updated_template is not None
        assert updated_template["name"] == "TEST Updated Template Name"
        assert updated_template["primary_color"] == "#00ff00"
    
    def test_generate_pdf_preview(self):
        """POST /api/government/document-templates/{id}/preview - generate PDF preview"""
        # Use standard template
        template_id = "std_warning_general"
        
        response = self.session.post(
            f"{BASE_URL}/api/government/document-templates/{template_id}/preview",
            json={"sample_values": {}}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Should return PDF content
        assert response.headers.get("content-type", "").startswith("application/pdf"), \
            f"Expected PDF content-type, got {response.headers.get('content-type')}"
        
        # Should have actual PDF content (starts with %PDF)
        assert len(response.content) > 0, "PDF content is empty"
        assert response.content[:4] == b'%PDF', f"Response is not a valid PDF, starts with: {response.content[:20]}"


class TestSendFormalDocuments:
    """Tests for sending formal documents to recipients"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin authentication token"""
        self.session = requests.Session()
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            self.admin_token = login_response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip("Admin authentication failed")
    
    def test_send_document_to_individual(self):
        """POST /api/government/formal-documents/send - send document to individual"""
        # Send to demo citizen
        send_data = {
            "template_id": "std_formal_notice",
            "recipients": ["demo_citizen_001"],
            "placeholder_values": {
                "notice_subject": "Test Notice",
                "notice_body": "This is a test notice body.",
                "action_deadline": "January 31, 2026"
            },
            "priority": "normal"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/formal-documents/send", json=send_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "1 recipient" in data["message"]
        assert "documents" in data
        assert len(data["documents"]) == 1
        
        # Verify document has expected fields
        doc = data["documents"][0]
        assert "document_id" in doc
        assert doc["recipient_id"] == "demo_citizen_001"
    
    def test_send_document_to_role(self):
        """POST /api/government/formal-documents/send - send to all citizens"""
        send_data = {
            "template_id": "std_formal_notice",
            "recipients": ["role:citizen"],
            "placeholder_values": {
                "notice_subject": "Broadcast Notice",
                "notice_body": "This is a broadcast test.",
                "action_deadline": "February 28, 2026"
            },
            "priority": "high"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/formal-documents/send", json=send_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "documents" in data
        # Should send to at least 1 citizen
        assert len(data["documents"]) >= 1
    
    def test_get_all_sent_documents(self):
        """GET /api/government/formal-documents - list all sent documents"""
        response = self.session.get(f"{BASE_URL}/api/government/formal-documents")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "documents" in data
        assert "total" in data
        
        # Should have documents from previous tests
        if len(data["documents"]) > 0:
            doc = data["documents"][0]
            assert "document_id" in doc
            assert "title" in doc
            assert "recipient_name" in doc
            assert "status" in doc
            assert "issued_at" in doc
    
    def test_get_document_statistics(self):
        """GET /api/government/formal-documents/stats - document statistics"""
        response = self.session.get(f"{BASE_URL}/api/government/formal-documents/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data
        assert "by_type" in data
        assert "by_status" in data
        
        # Total should be >= 0
        assert data["total"] >= 0


class TestCitizenDocumentsAPI:
    """Tests for Citizen Documents Inbox API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get citizen authentication token"""
        self.session = requests.Session()
        # Login as citizen
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "citizen",
            "password": "demo123"
        })
        if login_response.status_code == 200:
            self.citizen_token = login_response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.citizen_token}"})
        else:
            pytest.skip("Citizen authentication failed")
    
    def test_get_citizen_documents(self):
        """GET /api/citizen/documents - get citizen's documents"""
        response = self.session.get(f"{BASE_URL}/api/citizen/documents")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "documents" in data
        assert "unread_count" in data
        
        # Should have documents from previous tests
        if len(data["documents"]) > 0:
            doc = data["documents"][0]
            assert "document_id" in doc
            assert "title" in doc
            assert "body_content" in doc
            assert "status" in doc
            assert "issued_at" in doc
            assert "priority" in doc
    
    def test_citizen_documents_requires_auth(self):
        """GET /api/citizen/documents - requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/citizen/documents")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
    
    def test_view_document_marks_as_read(self):
        """GET /api/citizen/documents/{id} - viewing marks document as read"""
        # First get list of documents
        list_response = self.session.get(f"{BASE_URL}/api/citizen/documents")
        assert list_response.status_code == 200
        
        documents = list_response.json().get("documents", [])
        if not documents:
            pytest.skip("No documents to test - send a document first")
        
        doc_id = documents[0]["document_id"]
        
        # View the document
        view_response = self.session.get(f"{BASE_URL}/api/citizen/documents/{doc_id}")
        
        assert view_response.status_code == 200, f"Expected 200, got {view_response.status_code}: {view_response.text}"
        
        data = view_response.json()
        assert "document_id" in data
        assert data["document_id"] == doc_id
        # Status should be 'read' or already was read
        assert data["status"] in ["read", "archived"]
    
    def test_download_document_pdf(self):
        """GET /api/citizen/documents/{id}/pdf - download PDF"""
        # Get list of documents
        list_response = self.session.get(f"{BASE_URL}/api/citizen/documents")
        assert list_response.status_code == 200
        
        documents = list_response.json().get("documents", [])
        if not documents:
            pytest.skip("No documents to test")
        
        doc_id = documents[0]["document_id"]
        
        # Download PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/citizen/documents/{doc_id}/pdf")
        
        assert pdf_response.status_code == 200, f"Expected 200, got {pdf_response.status_code}: {pdf_response.text}"
        
        # Should return PDF content
        assert pdf_response.headers.get("content-type", "").startswith("application/pdf"), \
            f"Expected PDF content-type, got {pdf_response.headers.get('content-type')}"
        
        # Should have actual PDF content
        assert len(pdf_response.content) > 0
        assert pdf_response.content[:4] == b'%PDF', "Response is not a valid PDF"
    
    def test_archive_document(self):
        """POST /api/citizen/documents/{id}/archive - archive document"""
        # Get list of documents
        list_response = self.session.get(f"{BASE_URL}/api/citizen/documents")
        assert list_response.status_code == 200
        
        documents = list_response.json().get("documents", [])
        # Find a non-archived document
        non_archived = [d for d in documents if d.get("status") != "archived"]
        
        if not non_archived:
            pytest.skip("No non-archived documents to test")
        
        doc_id = non_archived[0]["document_id"]
        
        # Archive the document
        archive_response = self.session.post(f"{BASE_URL}/api/citizen/documents/{doc_id}/archive")
        
        assert archive_response.status_code == 200, f"Expected 200, got {archive_response.status_code}: {archive_response.text}"
        
        data = archive_response.json()
        assert data["message"] == "Document archived"
        
        # Verify status changed
        verify_response = self.session.get(f"{BASE_URL}/api/citizen/documents/{doc_id}")
        assert verify_response.status_code == 200
        assert verify_response.json()["status"] == "archived"


class TestUserListForSendDialog:
    """Test the user list endpoint used in the send dialog"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin authentication token"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            self.admin_token = login_response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_users_list_for_sending(self):
        """GET /api/government/users-list - get users for send dialog"""
        response = self.session.get(f"{BASE_URL}/api/government/users-list")
        
        # This endpoint may or may not exist - check if it does
        if response.status_code == 404:
            pytest.skip("Users list endpoint not implemented")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data
        
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "user_id" in user
            assert "name" in user
            assert "role" in user


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
