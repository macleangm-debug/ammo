"""
Test Government Navigation and New Features APIs
Tests for Analytics, Firearm Owners, and Reviews endpoints
"""
import pytest
import requests
import os
import time

# Use the preview URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ammo-owners-registry.preview.emergentagent.com')
if not BASE_URL:
    BASE_URL = 'https://ammo-owners-registry.preview.emergentagent.com'
API_URL = f"{BASE_URL}/api"


@pytest.fixture
def admin_session():
    """Create an admin session for testing"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    login_response = session.post(f"{API_URL}/auth/dev-login", json={
        "username": "admin",
        "password": "admin123"
    })
    
    if login_response.status_code == 200:
        return session
    else:
        pytest.skip("Failed to login as admin")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test that API is healthy"""
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


class TestPredictiveAnalyticsAPI:
    """Tests for Predictive Analytics endpoints"""
    
    def test_predictive_dashboard_endpoint_exists(self, admin_session):
        """Test that predictive dashboard endpoint exists"""
        response = admin_session.get(f"{API_URL}/government/predictive/dashboard")
        # Should return 200 or 403 (if not admin) but not 404
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
    
    def test_thresholds_endpoint_exists(self, admin_session):
        """Test that thresholds endpoint exists"""
        response = admin_session.get(f"{API_URL}/government/thresholds")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
    
    def test_preventive_warnings_endpoint_exists(self, admin_session):
        """Test that preventive warnings endpoint exists"""
        response = admin_session.get(f"{API_URL}/government/preventive-warnings")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"


class TestFirearmOwnersAPI:
    """Tests for Firearm Owners Registry endpoints"""
    
    def test_users_list_endpoint(self, admin_session):
        """Test users list endpoint"""
        response = admin_session.get(f"{API_URL}/government/users-list")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "users" in data or isinstance(data, list)
    
    def test_users_list_with_role_filter(self, admin_session):
        """Test users list with role filter"""
        response = admin_session.get(f"{API_URL}/government/users-list?role=citizen")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
    
    def test_citizen_profiles_endpoint(self, admin_session):
        """Test citizen profiles endpoint"""
        response = admin_session.get(f"{API_URL}/government/citizen-profiles")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "profiles" in data or isinstance(data, list)


class TestReviewsAPI:
    """Tests for Reviews system endpoints"""
    
    def test_reviews_list_endpoint(self, admin_session):
        """Test reviews list endpoint"""
        response = admin_session.get(f"{API_URL}/reviews")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "reviews" in data or isinstance(data, list)
    
    def test_reviews_pending_count(self, admin_session):
        """Test reviews pending count endpoint"""
        response = admin_session.get(f"{API_URL}/reviews/pending-count")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
    
    def test_reviews_with_status_filter(self, admin_session):
        """Test reviews with status filter"""
        response = admin_session.get(f"{API_URL}/reviews?status=pending")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
    
    def test_reviews_with_type_filter(self, admin_session):
        """Test reviews with type filter"""
        response = admin_session.get(f"{API_URL}/reviews?item_type=license_application")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"


class TestTemplatesAPI:
    """Tests for Templates endpoints"""
    
    def test_document_templates_endpoint(self, admin_session):
        """Test document templates endpoint"""
        response = admin_session.get(f"{API_URL}/government/document-templates")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "templates" in data or isinstance(data, list)


class TestGovernmentDashboardAPI:
    """Tests for Government Dashboard endpoints"""
    
    def test_dashboard_summary_endpoint(self, admin_session):
        """Test dashboard summary endpoint"""
        response = admin_session.get(f"{API_URL}/government/dashboard-summary")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
    
    def test_revenue_stats_endpoint(self, admin_session):
        """Test revenue stats endpoint"""
        response = admin_session.get(f"{API_URL}/government/revenue-stats")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
    
    def test_compliance_overview_endpoint(self, admin_session):
        """Test compliance overview endpoint"""
        response = admin_session.get(f"{API_URL}/government/compliance-overview")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
