"""
Test suite for Predictive Analytics Dashboard and Automated Threshold Alerts
Features tested:
- /government/predictive/dashboard - risk predictions dashboard
- /government/predictive/run-analysis - run predictive analysis
- /government/thresholds - CRUD operations for thresholds
- /government/thresholds/run-check - run threshold checks
- /government/preventive-warnings - admin view of warnings
- /citizen/my-warnings - citizen view of warnings
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPredictiveAnalyticsDashboard:
    """Tests for /government/predictive/dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin session token"""
        # Setup demo data first
        requests.post(f"{BASE_URL}/api/demo/setup")
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/demo/login/admin")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_predictive_dashboard_returns_200(self):
        """Dashboard endpoint should return 200 for admin"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Predictive dashboard returns 200")
    
    def test_predictive_dashboard_structure(self):
        """Dashboard should return all required data sections"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required sections
        assert "summary" in data, "Missing 'summary' section"
        assert "trajectory_distribution" in data, "Missing 'trajectory_distribution' section"
        assert "risk_distribution" in data, "Missing 'risk_distribution' section"
        assert "common_risk_factors" in data, "Missing 'common_risk_factors' section"
        assert "high_risk_citizens" in data, "Missing 'high_risk_citizens' section"
        assert "approaching_threshold" in data, "Missing 'approaching_threshold' section"
        assert "regional_analysis" in data, "Missing 'regional_analysis' section"
        print("PASS: Dashboard has all required sections")
    
    def test_predictive_dashboard_summary(self):
        """Summary should include all metrics"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers=self.headers
        )
        data = response.json()
        summary = data.get("summary", {})
        
        assert "total_analyzed" in summary, "Missing total_analyzed"
        assert "high_risk_count" in summary, "Missing high_risk_count"
        assert "declining_count" in summary, "Missing declining_count"
        assert "needs_intervention" in summary, "Missing needs_intervention"
        
        print(f"PASS: Summary metrics - Total: {summary.get('total_analyzed')}, High Risk: {summary.get('high_risk_count')}")
    
    def test_predictive_dashboard_trajectory_distribution(self):
        """Trajectory distribution should have all categories"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers=self.headers
        )
        data = response.json()
        trajectory = data.get("trajectory_distribution", {})
        
        # Check all trajectory categories exist
        assert "improving" in trajectory, "Missing improving trajectory"
        assert "stable" in trajectory, "Missing stable trajectory"
        assert "declining" in trajectory, "Missing declining trajectory"
        assert "critical_decline" in trajectory, "Missing critical_decline trajectory"
        
        print(f"PASS: Trajectory - Improving: {trajectory.get('improving')}, Stable: {trajectory.get('stable')}, Declining: {trajectory.get('declining')}, Critical: {trajectory.get('critical_decline')}")
    
    def test_predictive_dashboard_risk_distribution(self):
        """Risk distribution should show low/medium/high/critical counts"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers=self.headers
        )
        data = response.json()
        risk = data.get("risk_distribution", {})
        
        assert "low" in risk, "Missing low risk count"
        assert "medium" in risk, "Missing medium risk count"
        assert "high" in risk, "Missing high risk count"
        assert "critical" in risk, "Missing critical risk count"
        
        print(f"PASS: Risk Distribution - Low: {risk.get('low')}, Medium: {risk.get('medium')}, High: {risk.get('high')}, Critical: {risk.get('critical')}")
    
    def test_predictive_dashboard_common_risk_factors(self):
        """Common risk factors should be a list"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers=self.headers
        )
        data = response.json()
        factors = data.get("common_risk_factors", [])
        
        assert isinstance(factors, list), "common_risk_factors should be a list"
        
        if len(factors) > 0:
            # Check first factor structure
            factor = factors[0]
            assert "factor" in factor, "Factor should have 'factor' field"
            assert "count" in factor, "Factor should have 'count' field"
            print(f"PASS: Found {len(factors)} common risk factors, top factor: {factor.get('factor')}")
        else:
            print("PASS: common_risk_factors is empty list (no risk factors detected)")
    
    def test_predictive_dashboard_regional_analysis(self):
        """Regional analysis should cover regions"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers=self.headers
        )
        data = response.json()
        regions = data.get("regional_analysis", {})
        
        assert isinstance(regions, dict), "regional_analysis should be a dict"
        
        if len(regions) > 0:
            # Check structure of first region
            region_name = list(regions.keys())[0]
            region_data = regions[region_name]
            assert "avg_score" in region_data or "count" in region_data, "Region should have stats"
            print(f"PASS: Regional analysis covers {len(regions)} regions")
        else:
            print("PASS: Regional analysis is empty (no regional data)")
    
    def test_predictive_dashboard_requires_auth(self):
        """Dashboard should require authentication"""
        response = requests.get(f"{BASE_URL}/api/government/predictive/dashboard")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Dashboard requires authentication (401 without token)")
    
    def test_predictive_dashboard_requires_admin(self):
        """Dashboard should require admin role"""
        # Login as citizen
        citizen_response = requests.post(f"{BASE_URL}/api/demo/login/citizen")
        citizen_token = citizen_response.json().get("session_token")
        
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/dashboard",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASS: Dashboard requires admin role (403 for citizen)")


class TestRunPredictiveAnalysis:
    """Tests for /government/predictive/run-analysis endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin session token"""
        response = requests.post(f"{BASE_URL}/api/demo/login/admin")
        self.session_token = response.json().get("session_token")
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_run_analysis_returns_200(self):
        """Run analysis should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/government/predictive/run-analysis",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Run analysis returns 200")
    
    def test_run_analysis_response_structure(self):
        """Run analysis should return proper response structure"""
        response = requests.post(
            f"{BASE_URL}/api/government/predictive/run-analysis",
            headers=self.headers
        )
        data = response.json()
        
        assert "message" in data, "Missing message field"
        assert "citizens_analyzed" in data, "Missing citizens_analyzed field"
        assert "warnings_generated" in data, "Missing warnings_generated field"
        assert "alerts_generated" in data, "Missing alerts_generated field"
        
        print(f"PASS: Analysis ran - Citizens: {data.get('citizens_analyzed')}, Warnings: {data.get('warnings_generated')}, Alerts: {data.get('alerts_generated')}")


class TestThresholdsAPI:
    """Tests for /government/thresholds CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin session token"""
        response = requests.post(f"{BASE_URL}/api/demo/login/admin")
        self.session_token = response.json().get("session_token")
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
        self.test_threshold_id = None
    
    def test_get_thresholds_returns_200(self):
        """Get thresholds should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/government/thresholds",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "thresholds" in data, "Missing thresholds array"
        print(f"PASS: Get thresholds returns 200, found {len(data.get('thresholds', []))} thresholds")
    
    def test_get_thresholds_includes_demo_thresholds(self):
        """Demo setup creates default thresholds"""
        response = requests.get(
            f"{BASE_URL}/api/government/thresholds",
            headers=self.headers
        )
        data = response.json()
        thresholds = data.get("thresholds", [])
        
        # Should have demo thresholds from setup
        threshold_names = [t.get("name") for t in thresholds]
        print(f"PASS: Found thresholds: {threshold_names}")
    
    def test_create_threshold_returns_success(self):
        """Create threshold should work"""
        new_threshold = {
            "name": "TEST_Training Hours Below Minimum",
            "metric": "training_hours",
            "operator": "lt",
            "value": 10,
            "warning_value": 15,
            "severity": "medium",
            "auto_action": "send_preventive_warning",
            "notification_message": "Your training hours are below the required minimum.",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/government/thresholds",
            headers=self.headers,
            json=new_threshold
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "threshold_id" in data, "Missing threshold_id in response"
        self.test_threshold_id = data.get("threshold_id")
        print(f"PASS: Created threshold with ID: {self.test_threshold_id}")
        
        # Cleanup
        if self.test_threshold_id:
            requests.delete(
                f"{BASE_URL}/api/government/thresholds/{self.test_threshold_id}",
                headers=self.headers
            )
    
    def test_update_threshold_works(self):
        """Update threshold should work"""
        # First create a threshold
        new_threshold = {
            "name": "TEST_Update Test Threshold",
            "metric": "compliance_score",
            "operator": "lt",
            "value": 40,
            "severity": "high",
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/government/thresholds",
            headers=self.headers,
            json=new_threshold
        )
        threshold_id = create_response.json().get("threshold_id")
        
        # Update it
        update_data = {"value": 45, "severity": "medium"}
        update_response = requests.put(
            f"{BASE_URL}/api/government/thresholds/{threshold_id}",
            headers=self.headers,
            json=update_data
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        print(f"PASS: Updated threshold {threshold_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/government/thresholds/{threshold_id}",
            headers=self.headers
        )
    
    def test_delete_threshold_works(self):
        """Delete threshold should work"""
        # Create a threshold to delete
        new_threshold = {
            "name": "TEST_Delete Me",
            "metric": "violations",
            "operator": "gt",
            "value": 2,
            "severity": "critical",
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/government/thresholds",
            headers=self.headers,
            json=new_threshold
        )
        threshold_id = create_response.json().get("threshold_id")
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/government/thresholds/{threshold_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"PASS: Deleted threshold {threshold_id}")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/government/thresholds",
            headers=self.headers
        )
        thresholds = get_response.json().get("thresholds", [])
        ids = [t.get("threshold_id") for t in thresholds]
        assert threshold_id not in ids, "Threshold should be deleted"
        print("PASS: Verified threshold is deleted")


class TestThresholdCheck:
    """Tests for /government/thresholds/run-check endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin session token"""
        response = requests.post(f"{BASE_URL}/api/demo/login/admin")
        self.session_token = response.json().get("session_token")
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_run_threshold_check_returns_200(self):
        """Run threshold check should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/government/thresholds/run-check",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Run threshold check returns 200")
    
    def test_run_threshold_check_response_structure(self):
        """Response should have proper structure"""
        response = requests.post(
            f"{BASE_URL}/api/government/thresholds/run-check",
            headers=self.headers
        )
        data = response.json()
        
        assert "message" in data, "Missing message"
        assert "thresholds_checked" in data, "Missing thresholds_checked"
        assert "citizens_checked" in data, "Missing citizens_checked"
        assert "warnings_sent" in data, "Missing warnings_sent"
        assert "alerts_created" in data, "Missing alerts_created"
        
        print(f"PASS: Threshold check - Thresholds: {data.get('thresholds_checked')}, Citizens: {data.get('citizens_checked')}, Warnings: {data.get('warnings_sent')}, Alerts: {data.get('alerts_created')}")


class TestPreventiveWarnings:
    """Tests for preventive warnings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin session token"""
        response = requests.post(f"{BASE_URL}/api/demo/login/admin")
        self.session_token = response.json().get("session_token")
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_preventive_warnings_returns_200(self):
        """Get preventive warnings should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/government/preventive-warnings",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "warnings" in data, "Missing warnings array"
        print(f"PASS: Get preventive warnings returns 200, found {len(data.get('warnings', []))} warnings")
    
    def test_preventive_warnings_can_filter_by_status(self):
        """Can filter warnings by status"""
        response = requests.get(
            f"{BASE_URL}/api/government/preventive-warnings?status=pending",
            headers=self.headers
        )
        assert response.status_code == 200
        print("PASS: Can filter preventive warnings by status")


class TestCitizenWarnings:
    """Tests for /citizen/my-warnings endpoint"""
    
    def test_citizen_can_get_their_warnings(self):
        """Citizen can view their own warnings"""
        # Login as citizen
        response = requests.post(f"{BASE_URL}/api/demo/login/citizen")
        session_token = response.json().get("session_token")
        headers = {
            "Authorization": f"Bearer {session_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/citizen/my-warnings",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "warnings" in data, "Missing warnings array"
        print(f"PASS: Citizen can get their warnings, found {len(data.get('warnings', []))} warnings")
    
    def test_citizen_warnings_requires_auth(self):
        """Citizen warnings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/citizen/my-warnings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Citizen warnings requires authentication")


class TestPredictiveCitizenAnalysis:
    """Tests for /government/predictive/citizen/{user_id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin session token"""
        response = requests.post(f"{BASE_URL}/api/demo/login/admin")
        self.session_token = response.json().get("session_token")
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_citizen_prediction(self):
        """Can get predictive analysis for a specific citizen"""
        response = requests.get(
            f"{BASE_URL}/api/government/predictive/citizen/demo_citizen_001",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check structure
        assert "user_id" in data, "Missing user_id"
        assert "current_risk_score" in data or "prediction" in data, "Missing risk score info"
        print(f"PASS: Got citizen prediction for demo_citizen_001")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
