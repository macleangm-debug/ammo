"""
Government Dashboard API Tests
Tests all government oversight endpoints including:
- Dashboard Summary
- Revenue Analytics
- Training Analytics
- Dealer Analytics  
- Compliance Analytics
- Alerts System (acknowledge, intervene)
- Course Management
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGovernmentDashboardAPIs:
    """Test Government Dashboard API endpoints"""
    
    @pytest.fixture(scope="class")
    def setup_demo_and_auth(self):
        """Setup demo data and get admin session token"""
        session = requests.Session()
        
        # Setup demo data first
        setup_response = session.post(f"{BASE_URL}/api/demo/setup")
        assert setup_response.status_code == 200, f"Demo setup failed: {setup_response.text}"
        
        # Login as admin
        login_response = session.post(f"{BASE_URL}/api/demo/login/admin")
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        session_token = data.get("session_token")
        
        # Set cookie and header for subsequent requests
        session.cookies.set("session_token", session_token)
        session.headers.update({"Cookie": f"session_token={session_token}"})
        
        return session
    
    # ==================== DASHBOARD SUMMARY ====================
    
    def test_dashboard_summary_endpoint(self, setup_demo_and_auth):
        """Test /government/dashboard-summary returns comprehensive summary"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/dashboard-summary")
        
        assert response.status_code == 200, f"Dashboard summary failed: {response.text}"
        data = response.json()
        
        # Verify overview section
        assert "overview" in data, "Missing 'overview' in response"
        assert "total_citizens" in data["overview"]
        assert "total_dealers" in data["overview"]
        assert "license_compliance_rate" in data["overview"]
        
        # Verify revenue section
        assert "revenue" in data, "Missing 'revenue' in response"
        assert "total" in data["revenue"]
        assert "this_month" in data["revenue"]
        
        # Verify alerts section
        assert "alerts" in data, "Missing 'alerts' in response"
        assert "active" in data["alerts"]
        assert "critical" in data["alerts"]
        
        print(f"Dashboard Summary: {data['overview']['total_citizens']} citizens, "
              f"{data['overview']['total_dealers']} dealers, "
              f"Revenue: ${data['revenue']['total']}")
    
    # ==================== REVENUE ANALYTICS ====================
    
    def test_revenue_analytics_endpoint(self, setup_demo_and_auth):
        """Test /government/analytics/revenue returns breakdown by type and region"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/analytics/revenue")
        
        assert response.status_code == 200, f"Revenue analytics failed: {response.text}"
        data = response.json()
        
        # Verify revenue breakdown
        assert "total_revenue" in data
        assert "by_type" in data
        assert "by_region" in data
        assert "trends" in data
        assert "type_breakdown" in data
        
        # Verify type breakdown has expected fee types
        type_breakdown = data["type_breakdown"]
        assert len(type_breakdown) >= 3, "Should have multiple fee types"
        
        # Verify trends is a list
        assert isinstance(data["trends"], list), "Trends should be a list"
        
        print(f"Total Revenue: ${data['total_revenue']}, "
              f"By Type: {len(data['by_type'])} types, "
              f"By Region: {len(data['by_region'])} regions")
    
    # ==================== TRAINING ANALYTICS ====================
    
    def test_training_analytics_endpoint(self, setup_demo_and_auth):
        """Test /government/analytics/training returns course and compliance data"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/analytics/training")
        
        assert response.status_code == 200, f"Training analytics failed: {response.text}"
        data = response.json()
        
        # Verify training metrics
        assert "total_courses" in data
        assert "compulsory_courses" in data
        assert "total_enrollments" in data
        assert "completion_rate" in data
        assert "compliance_by_region" in data
        
        # Verify compliance by region has expected regions
        assert isinstance(data["compliance_by_region"], dict)
        
        print(f"Total Courses: {data['total_courses']}, "
              f"Compulsory: {data['compulsory_courses']}, "
              f"Completion Rate: {data['completion_rate']}%")
    
    # ==================== DEALER ANALYTICS ====================
    
    def test_dealer_analytics_endpoint(self, setup_demo_and_auth):
        """Test /government/analytics/dealers returns dealer activity and flags"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/analytics/dealers")
        
        assert response.status_code == 200, f"Dealer analytics failed: {response.text}"
        data = response.json()
        
        # Verify dealer metrics
        assert "total_dealers" in data
        assert "active_dealers" in data
        assert "by_region" in data
        assert "top_by_volume" in data
        assert "flagged_dealers" in data
        assert "total_firearm_sales" in data
        assert "total_ammunition_sales" in data
        
        # Verify top by volume is a list
        assert isinstance(data["top_by_volume"], list)
        
        print(f"Total Dealers: {data['total_dealers']}, "
              f"Active: {data['active_dealers']}, "
              f"Flagged: {len(data['flagged_dealers'])}")
    
    # ==================== COMPLIANCE ANALYTICS ====================
    
    def test_compliance_analytics_endpoint(self, setup_demo_and_auth):
        """Test /government/analytics/compliance returns ARI distribution and license stats"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/analytics/compliance")
        
        assert response.status_code == 200, f"Compliance analytics failed: {response.text}"
        data = response.json()
        
        # Verify compliance metrics
        assert "total_citizens" in data
        assert "tier_distribution" in data
        assert "ari_by_region" in data
        assert "license_stats" in data
        
        # Verify tier distribution
        tiers = data["tier_distribution"]
        assert "sentinel" in tiers
        assert "guardian" in tiers
        assert "elite_custodian" in tiers
        
        # Verify license stats
        license_stats = data["license_stats"]
        assert "active" in license_stats
        assert "expired" in license_stats
        assert "suspended" in license_stats
        assert "renewal_rate" in license_stats
        
        print(f"Citizens: {data['total_citizens']}, "
              f"Tiers: Sentinel={tiers['sentinel']}, Guardian={tiers['guardian']}, Elite={tiers['elite_custodian']}")
    
    # ==================== ALERTS SYSTEM ====================
    
    def test_active_alerts_endpoint(self, setup_demo_and_auth):
        """Test /government/alerts/active returns alerts with severity breakdown"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/alerts/active")
        
        assert response.status_code == 200, f"Active alerts failed: {response.text}"
        data = response.json()
        
        # Verify alerts structure
        assert "total_active" in data
        assert "by_severity" in data
        assert "alerts" in data
        
        # Verify severity breakdown
        severity = data["by_severity"]
        assert "critical" in severity
        assert "high" in severity
        assert "medium" in severity
        assert "low" in severity
        
        print(f"Total Active Alerts: {data['total_active']}, "
              f"Critical: {severity['critical']}, "
              f"High: {severity['high']}")
        
        return data
    
    def test_acknowledge_alert(self, setup_demo_and_auth):
        """Test POST /government/alerts/acknowledge/{alert_id}"""
        session = setup_demo_and_auth
        
        # First get active alerts
        alerts_response = session.get(f"{BASE_URL}/api/government/alerts/active")
        alerts_data = alerts_response.json()
        
        if alerts_data.get("alerts") and len(alerts_data["alerts"]) > 0:
            alert_id = alerts_data["alerts"][0].get("alert_id")
            
            # Acknowledge the alert
            ack_response = session.post(f"{BASE_URL}/api/government/alerts/acknowledge/{alert_id}")
            
            # Should succeed or alert already acknowledged
            assert ack_response.status_code in [200, 404], f"Acknowledge failed: {ack_response.text}"
            print(f"Acknowledged alert: {alert_id}")
        else:
            print("No alerts available to acknowledge - skipping")
            pytest.skip("No alerts to acknowledge")
    
    def test_intervene_warning_action(self, setup_demo_and_auth):
        """Test POST /government/alerts/intervene/{alert_id} with warning action"""
        session = setup_demo_and_auth
        
        # Get active alerts
        alerts_response = session.get(f"{BASE_URL}/api/government/alerts/active")
        alerts_data = alerts_response.json()
        
        if alerts_data.get("alerts") and len(alerts_data["alerts"]) > 0:
            alert_id = alerts_data["alerts"][0].get("alert_id")
            
            # Send intervention with warning action
            intervene_response = session.post(
                f"{BASE_URL}/api/government/alerts/intervene/{alert_id}",
                json={
                    "action": "warning",
                    "notes": "Test warning intervention from automated test"
                }
            )
            
            # Should succeed or alert already resolved
            assert intervene_response.status_code in [200, 404], f"Intervene failed: {intervene_response.text}"
            print(f"Sent warning intervention for alert: {alert_id}")
        else:
            print("No alerts available to intervene - skipping")
            pytest.skip("No alerts to intervene")
    
    # ==================== COURSE MANAGEMENT ====================
    
    def test_get_all_courses(self, setup_demo_and_auth):
        """Test GET /government/courses returns course list"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/courses")
        
        assert response.status_code == 200, f"Get courses failed: {response.text}"
        data = response.json()
        
        assert "courses" in data
        assert isinstance(data["courses"], list)
        
        # Verify course structure if courses exist
        if len(data["courses"]) > 0:
            course = data["courses"][0]
            assert "course_id" in course
            assert "name" in course
            assert "region" in course
            assert "is_compulsory" in course
            assert "status" in course
        
        print(f"Total Courses: {len(data['courses'])}")
        return data
    
    def test_create_course(self, setup_demo_and_auth):
        """Test POST /government/courses creates a new course"""
        session = setup_demo_and_auth
        
        # Create a test course
        new_course = {
            "name": "TEST Automated Safety Course",
            "description": "Test course created by automated tests",
            "region": "national",
            "cost": 99.99,
            "duration_hours": 4,
            "is_compulsory": False,
            "category": "safety",
            "ari_boost": 5,
            "ari_penalty_for_skip": 0,
            "deadline_days": 30
        }
        
        response = session.post(f"{BASE_URL}/api/government/courses", json=new_course)
        
        assert response.status_code == 200, f"Create course failed: {response.text}"
        data = response.json()
        
        assert "course_id" in data
        assert data.get("message") == "Course created"
        
        print(f"Created course: {data['course_id']}")
        return data["course_id"]
    
    # ==================== ALERT THRESHOLDS ====================
    
    def test_get_alert_thresholds(self, setup_demo_and_auth):
        """Test GET /government/alerts/thresholds returns threshold configs"""
        session = setup_demo_and_auth
        response = session.get(f"{BASE_URL}/api/government/alerts/thresholds")
        
        assert response.status_code == 200, f"Get thresholds failed: {response.text}"
        data = response.json()
        
        assert "thresholds" in data
        assert isinstance(data["thresholds"], list)
        
        print(f"Total Thresholds: {len(data['thresholds'])}")
    
    # ==================== UNAUTHORIZED ACCESS ====================
    
    def test_unauthorized_access_without_auth(self):
        """Test that government endpoints require authentication"""
        session = requests.Session()  # No auth
        
        endpoints = [
            "/api/government/dashboard-summary",
            "/api/government/analytics/revenue",
            "/api/government/analytics/training",
            "/api/government/analytics/dealers",
            "/api/government/analytics/compliance",
            "/api/government/alerts/active",
            "/api/government/courses"
        ]
        
        for endpoint in endpoints:
            response = session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"Endpoint {endpoint} should require auth, got {response.status_code}"
        
        print("All government endpoints correctly require authentication")
    
    def test_citizen_cannot_access_government_endpoints(self):
        """Test that citizen role cannot access government endpoints"""
        session = requests.Session()
        
        # Login as citizen
        login_response = session.post(f"{BASE_URL}/api/demo/login/citizen")
        if login_response.status_code == 200:
            data = login_response.json()
            session_token = data.get("session_token")
            session.cookies.set("session_token", session_token)
            
            # Try to access government endpoint
            response = session.get(f"{BASE_URL}/api/government/dashboard-summary")
            
            # Should be forbidden (403)
            assert response.status_code == 403, f"Citizen should not access government endpoints, got {response.status_code}"
            print("Citizen correctly denied access to government endpoints")
        else:
            pytest.skip("Could not login as citizen")


class TestDataIntegrity:
    """Test data integrity between endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/demo/setup")
        login_response = session.post(f"{BASE_URL}/api/demo/login/admin")
        data = login_response.json()
        session_token = data.get("session_token")
        session.cookies.set("session_token", session_token)
        return session
    
    def test_dashboard_summary_matches_analytics(self, admin_session):
        """Verify dashboard summary data matches individual analytics endpoints"""
        session = admin_session
        
        # Get summary
        summary = session.get(f"{BASE_URL}/api/government/dashboard-summary").json()
        
        # Get compliance analytics
        compliance = session.get(f"{BASE_URL}/api/government/analytics/compliance").json()
        
        # Get dealer analytics
        dealers = session.get(f"{BASE_URL}/api/government/analytics/dealers").json()
        
        # Verify citizen count matches
        assert summary["overview"]["total_citizens"] == compliance["total_citizens"], \
            f"Citizen count mismatch: summary={summary['overview']['total_citizens']}, compliance={compliance['total_citizens']}"
        
        # Verify dealer count matches
        assert summary["overview"]["total_dealers"] == dealers["total_dealers"], \
            f"Dealer count mismatch: summary={summary['overview']['total_dealers']}, dealers={dealers['total_dealers']}"
        
        print("Data integrity verified between dashboard summary and analytics endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
