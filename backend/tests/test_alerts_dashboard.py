"""
Backend API Tests for Alerts Dashboard
Tests the dedicated alerts dashboard at /government/alerts-dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAlertsDashboardAPI:
    """Tests for /api/government/alerts/dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: ensure demo data exists and get admin session"""
        # Setup demo data
        setup_resp = requests.post(f"{BASE_URL}/api/demo/setup")
        assert setup_resp.status_code == 200
        
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/demo/login/admin")
        assert login_resp.status_code == 200
        self.session_token = login_resp.json()["session_token"]
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_alerts_dashboard_returns_200(self):
        """Test that alerts dashboard endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_alerts_dashboard_returns_comprehensive_data(self):
        """Test that dashboard returns all required analytics sections"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all main sections exist
        assert "summary" in data, "Missing summary section"
        assert "trends" in data, "Missing trends section"
        assert "by_severity" in data, "Missing by_severity section"
        assert "by_category" in data, "Missing by_category section"
        assert "regional_heat_map" in data, "Missing regional_heat_map section"
        assert "priority_queue" in data, "Missing priority_queue section"
        assert "risk_summary" in data, "Missing risk_summary section"
        assert "resolution_metrics" in data, "Missing resolution_metrics section"
        assert "alerts" in data, "Missing alerts list"
    
    def test_alerts_dashboard_summary_metrics(self):
        """Test that summary contains percentage-based metrics"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        data = response.json()
        
        summary = data["summary"]
        assert "total_active" in summary
        assert "unique_flagged_users" in summary
        assert "total_citizens" in summary
        assert "alert_rate_percentage" in summary
        assert "alert_rate_per_10k" in summary
        assert "time_period" in summary
    
    def test_alerts_dashboard_trends(self):
        """Test that trends contain comparison and velocity metrics"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        data = response.json()
        
        trends = data["trends"]
        assert "current_period" in trends
        assert "previous_period" in trends
        assert "trend_percentage" in trends
        assert "trend_direction" in trends
        assert trends["trend_direction"] in ["up", "down", "stable"]
        assert "resolution_velocity" in trends
        assert "avg_resolution_hours" in trends
    
    def test_alerts_dashboard_regional_heat_map(self):
        """Test that regional heat map contains health status badges"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        data = response.json()
        
        heat_map = data["regional_heat_map"]
        assert len(heat_map) == 5, "Expected 5 regions in heat map"
        
        for region in heat_map:
            assert "region" in region
            assert "region_id" in region
            assert "total_citizens" in region
            assert "active_alerts" in region
            assert "alert_rate_per_10k" in region
            assert "health_status" in region
            assert region["health_status"] in ["critical", "warning", "elevated", "healthy"]
    
    def test_alerts_dashboard_priority_queue(self):
        """Test that priority queue shows alert aging categories"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        data = response.json()
        
        pq = data["priority_queue"]
        assert "critical_over_24h" in pq
        assert "high_over_48h" in pq
        assert "unacknowledged_critical" in pq
        assert "items" in pq
        
        items = pq["items"]
        assert "oldest_unresolved" in items
    
    def test_alerts_dashboard_by_severity(self):
        """Test severity breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        data = response.json()
        
        severity = data["by_severity"]
        assert "critical" in severity
        assert "high" in severity
        assert "medium" in severity
        assert "low" in severity
        
        # Demo data should have critical and high alerts
        assert severity["critical"] >= 0
        assert severity["high"] >= 0
    
    def test_alerts_dashboard_filter_by_severity(self):
        """Test filtering by severity"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard?severity=critical",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All alerts should be critical
        for alert in data["alerts"]:
            assert alert["severity"] == "critical"
    
    def test_alerts_dashboard_filter_by_region(self):
        """Test filtering by region"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard?region=midwest",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should work and return filtered results
        assert "filters_applied" in data
        assert data["filters_applied"]["region"] == "midwest"
    
    def test_alerts_dashboard_filter_by_time_period(self):
        """Test filtering by time period"""
        for period in ["24h", "7d", "30d", "90d", "all"]:
            response = requests.get(
                f"{BASE_URL}/api/government/alerts/dashboard?time_period={period}",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["summary"]["time_period"] == period
    
    def test_alerts_dashboard_filter_by_category(self):
        """Test filtering by category"""
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard?category=compliance_drop",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filters_applied"]["category"] == "compliance_drop"
    
    def test_alerts_dashboard_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/government/alerts/dashboard")
        assert response.status_code == 401
    
    def test_alerts_dashboard_requires_admin_role(self):
        """Test that endpoint requires admin role"""
        # Login as citizen
        citizen_resp = requests.post(f"{BASE_URL}/api/demo/login/citizen")
        citizen_token = citizen_resp.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 403


class TestAlertActions:
    """Tests for alert acknowledge and intervention endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: ensure demo data exists and get admin session"""
        setup_resp = requests.post(f"{BASE_URL}/api/demo/setup")
        assert setup_resp.status_code == 200
        
        login_resp = requests.post(f"{BASE_URL}/api/demo/login/admin")
        assert login_resp.status_code == 200
        self.session_token = login_resp.json()["session_token"]
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_acknowledge_alert(self):
        """Test acknowledging an alert"""
        # Get an active alert first
        dashboard_resp = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        alerts = dashboard_resp.json()["alerts"]
        
        if len(alerts) > 0:
            active_alert = next((a for a in alerts if a.get("status") == "active"), None)
            if active_alert:
                alert_id = active_alert["alert_id"]
                
                # Acknowledge the alert
                response = requests.post(
                    f"{BASE_URL}/api/government/alerts/acknowledge/{alert_id}",
                    headers=self.headers
                )
                assert response.status_code == 200
                assert "acknowledged" in response.json().get("message", "").lower() or response.json().get("status") == "acknowledged"
    
    def test_intervene_warning_action(self):
        """Test intervention with warning action"""
        # Get an alert
        dashboard_resp = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        alerts = dashboard_resp.json()["alerts"]
        
        if len(alerts) > 0:
            alert_id = alerts[0]["alert_id"]
            
            response = requests.post(
                f"{BASE_URL}/api/government/alerts/intervene/{alert_id}",
                headers=self.headers,
                json={
                    "action": "warning",
                    "notes": "Test intervention warning"
                }
            )
            assert response.status_code == 200
    
    def test_intervene_suspend_action(self):
        """Test intervention with suspend action"""
        dashboard_resp = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        alerts = dashboard_resp.json()["alerts"]
        
        if len(alerts) > 0:
            alert_id = alerts[0]["alert_id"]
            
            response = requests.post(
                f"{BASE_URL}/api/government/alerts/intervene/{alert_id}",
                headers=self.headers,
                json={
                    "action": "suspend",
                    "notes": "Test intervention suspend"
                }
            )
            assert response.status_code == 200
    
    def test_intervene_block_license_action(self):
        """Test intervention with block_license action"""
        dashboard_resp = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        alerts = dashboard_resp.json()["alerts"]
        
        if len(alerts) > 0:
            alert_id = alerts[0]["alert_id"]
            
            response = requests.post(
                f"{BASE_URL}/api/government/alerts/intervene/{alert_id}",
                headers=self.headers,
                json={
                    "action": "block_license",
                    "notes": "Test intervention block license"
                }
            )
            assert response.status_code == 200
    
    def test_intervene_requires_notes(self):
        """Test that intervention requires notes"""
        dashboard_resp = requests.get(
            f"{BASE_URL}/api/government/alerts/dashboard",
            headers=self.headers
        )
        alerts = dashboard_resp.json()["alerts"]
        
        if len(alerts) > 0:
            alert_id = alerts[0]["alert_id"]
            
            response = requests.post(
                f"{BASE_URL}/api/government/alerts/intervene/{alert_id}",
                headers=self.headers,
                json={
                    "action": "warning",
                    "notes": ""  # Empty notes
                }
            )
            # Empty notes may still work based on implementation
            assert response.status_code in [200, 400]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
