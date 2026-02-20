"""
Test Policy Enforcement System for AMMO Platform

Tests:
1. GET /api/government/enforcement/status - returns scheduler status and compliance counts
2. POST /api/government/enforcement/run - manually runs policy enforcement and returns results
3. GET /api/government/enforcement/history - returns enforcement execution history
4. POST /api/government/enforcement/scheduler/start - starts the enforcement scheduler
5. POST /api/government/enforcement/scheduler/stop - stops the enforcement scheduler
6. POST /api/government/enforcement/reinstate/{user_id} - reinstates a suspended user
7. GET /api/government/enforcement/user/{user_id} - gets enforcement history for specific user
8. Enforcement correctly applies late fees based on days overdue
9. Enforcement sends warnings at configured warning intervals
10. Enforcement suspends licenses after suspension trigger days
11. Dealer transactions blocked for suspended users
"""

import pytest
import requests
import os
from datetime import datetime, timedelta, timezone
import uuid

# Get the backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}
CITIZEN_CREDENTIALS = {"username": "citizen", "password": "demo123"}


@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    response = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    
    return session


@pytest.fixture(scope="module")
def citizen_session():
    """Login as citizen and return authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as citizen
    response = session.post(f"{BASE_URL}/api/auth/login", json=CITIZEN_CREDENTIALS)
    if response.status_code == 200:
        return session
    return None


class TestEnforcementStatus:
    """Test GET /api/government/enforcement/status endpoint"""
    
    def test_enforcement_status_returns_200(self, admin_session):
        """Test that enforcement status endpoint returns 200"""
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_enforcement_status_structure(self, admin_session):
        """Test enforcement status response structure"""
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/status")
        data = response.json()
        
        # Verify required fields
        assert "scheduler_running" in data, "Missing scheduler_running field"
        assert "check_interval" in data, "Missing check_interval field"
        assert "current_status" in data, "Missing current_status field"
        assert "recent_executions" in data, "Missing recent_executions field"
        
    def test_enforcement_status_compliance_counts(self, admin_session):
        """Test that current_status contains compliance counts"""
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/status")
        data = response.json()
        
        current_status = data["current_status"]
        assert "total" in current_status, "Missing total count"
        assert "paid" in current_status, "Missing paid count"
        assert "pending" in current_status, "Missing pending count"
        assert "overdue" in current_status, "Missing overdue count"
        assert "suspended" in current_status, "Missing suspended count"
        
        # All counts should be non-negative
        assert current_status["total"] >= 0
        assert current_status["paid"] >= 0
        assert current_status["pending"] >= 0
        assert current_status["overdue"] >= 0
        assert current_status["suspended"] >= 0
        
    def test_enforcement_status_requires_admin(self, citizen_session):
        """Test that enforcement status requires admin role"""
        if citizen_session is None:
            pytest.skip("Citizen session not available")
            
        response = citizen_session.get(f"{BASE_URL}/api/government/enforcement/status")
        assert response.status_code in [401, 403], "Expected 401 or 403 for non-admin"


class TestManualEnforcementRun:
    """Test POST /api/government/enforcement/run endpoint"""
    
    def test_manual_run_returns_200(self, admin_session):
        """Test that manual enforcement run returns 200"""
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/run")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_manual_run_returns_results(self, admin_session):
        """Test that manual enforcement run returns results"""
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/run")
        data = response.json()
        
        assert "message" in data, "Missing message field"
        assert "results" in data, "Missing results field"
        
        results = data["results"]
        assert "processed" in results, "Missing processed count"
        assert "warnings_sent" in results, "Missing warnings_sent count"
        assert "late_fees_applied" in results, "Missing late_fees_applied count"
        assert "suspensions_issued" in results, "Missing suspensions_issued count"
        
    def test_manual_run_processed_count(self, admin_session):
        """Test that manual enforcement run processes users"""
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/run")
        data = response.json()
        
        # Should process at least 0 users (may be 0 if no profiles exist)
        assert data["results"]["processed"] >= 0
        
    def test_manual_run_requires_admin(self, citizen_session):
        """Test that manual enforcement run requires admin role"""
        if citizen_session is None:
            pytest.skip("Citizen session not available")
            
        response = citizen_session.post(f"{BASE_URL}/api/government/enforcement/run")
        assert response.status_code in [401, 403], "Expected 401 or 403 for non-admin"


class TestEnforcementHistory:
    """Test GET /api/government/enforcement/history endpoint"""
    
    def test_history_returns_200(self, admin_session):
        """Test that enforcement history returns 200"""
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_history_structure(self, admin_session):
        """Test enforcement history response structure"""
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/history")
        data = response.json()
        
        assert "executions" in data, "Missing executions field"
        assert isinstance(data["executions"], list), "executions should be a list"
        
    def test_history_with_limit(self, admin_session):
        """Test enforcement history with limit parameter"""
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/history?limit=5")
        data = response.json()
        
        assert len(data["executions"]) <= 5, "Should respect limit parameter"
        
    def test_history_execution_structure(self, admin_session):
        """Test that execution records have required fields"""
        # First run enforcement to ensure we have history
        admin_session.post(f"{BASE_URL}/api/government/enforcement/run")
        
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/history?limit=1")
        data = response.json()
        
        if data["executions"]:
            execution = data["executions"][0]
            assert "execution_id" in execution, "Missing execution_id"
            assert "executed_at" in execution, "Missing executed_at"
            assert "results" in execution, "Missing results"
            
    def test_history_requires_admin(self, citizen_session):
        """Test that enforcement history requires admin role"""
        if citizen_session is None:
            pytest.skip("Citizen session not available")
            
        response = citizen_session.get(f"{BASE_URL}/api/government/enforcement/history")
        assert response.status_code in [401, 403], "Expected 401 or 403 for non-admin"


class TestSchedulerControl:
    """Test enforcement scheduler start/stop endpoints"""
    
    def test_scheduler_start_returns_200(self, admin_session):
        """Test that starting scheduler returns 200"""
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/start")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_scheduler_start_response(self, admin_session):
        """Test scheduler start response structure"""
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/start")
        data = response.json()
        
        assert "message" in data, "Missing message field"
        assert "status" in data, "Missing status field"
        assert data["status"] == "running", f"Expected status 'running', got {data['status']}"
        
    def test_scheduler_stop_returns_200(self, admin_session):
        """Test that stopping scheduler returns 200"""
        # First make sure scheduler is running
        admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/start")
        
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/stop")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_scheduler_stop_response(self, admin_session):
        """Test scheduler stop response structure"""
        # First start scheduler
        admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/start")
        
        # Then stop it
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/stop")
        data = response.json()
        
        assert "message" in data, "Missing message field"
        assert "status" in data, "Missing status field"
        assert data["status"] == "stopped", f"Expected status 'stopped', got {data['status']}"
        
    def test_scheduler_status_reflects_running(self, admin_session):
        """Test that status reflects scheduler state"""
        # Start scheduler
        admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/start")
        
        # Check status
        status_response = admin_session.get(f"{BASE_URL}/api/government/enforcement/status")
        status_data = status_response.json()
        
        assert status_data["scheduler_running"] == True, "Scheduler should be running"
        
        # Stop scheduler
        admin_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/stop")
        
        # Check status again
        status_response = admin_session.get(f"{BASE_URL}/api/government/enforcement/status")
        status_data = status_response.json()
        
        assert status_data["scheduler_running"] == False, "Scheduler should be stopped"
        
    def test_scheduler_requires_admin(self, citizen_session):
        """Test that scheduler controls require admin role"""
        if citizen_session is None:
            pytest.skip("Citizen session not available")
            
        start_response = citizen_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/start")
        stop_response = citizen_session.post(f"{BASE_URL}/api/government/enforcement/scheduler/stop")
        
        assert start_response.status_code in [401, 403], "Expected 401 or 403 for start"
        assert stop_response.status_code in [401, 403], "Expected 401 or 403 for stop"


class TestUserEnforcementHistory:
    """Test GET /api/government/enforcement/user/{user_id} endpoint"""
    
    def test_user_history_returns_200(self, admin_session):
        """Test that user enforcement history returns 200 for valid user"""
        # Get list of users first
        users_response = admin_session.get(f"{BASE_URL}/api/government/users-list")
        if users_response.status_code != 200:
            pytest.skip("Could not get users list")
            
        users = users_response.json().get("users", [])
        if not users:
            pytest.skip("No users available")
            
        # Test with first user
        user_id = users[0].get("user_id")
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/user/{user_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_user_history_structure(self, admin_session):
        """Test user enforcement history response structure"""
        # Get a user to test with
        users_response = admin_session.get(f"{BASE_URL}/api/government/users-list")
        if users_response.status_code != 200:
            pytest.skip("Could not get users list")
            
        users = users_response.json().get("users", [])
        if not users:
            pytest.skip("No users available")
            
        user_id = users[0].get("user_id")
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/user/{user_id}")
        data = response.json()
        
        assert "user_id" in data, "Missing user_id field"
        assert "profile" in data, "Missing profile field"
        assert "current_status" in data, "Missing current_status field"
        assert "enforcement_notifications" in data, "Missing enforcement_notifications field"
        
    def test_user_history_current_status(self, admin_session):
        """Test that current_status contains enforcement status fields"""
        users_response = admin_session.get(f"{BASE_URL}/api/government/users-list")
        if users_response.status_code != 200:
            pytest.skip("Could not get users list")
            
        users = users_response.json().get("users", [])
        if not users:
            pytest.skip("No users available")
            
        user_id = users[0].get("user_id")
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/user/{user_id}")
        data = response.json()
        
        current_status = data["current_status"]
        assert "fee_status" in current_status, "Missing fee_status"
        assert "license_status" in current_status, "Missing license_status"
        assert "days_overdue" in current_status, "Missing days_overdue"
        
    def test_user_history_not_found(self, admin_session):
        """Test that non-existent user returns 404"""
        response = admin_session.get(f"{BASE_URL}/api/government/enforcement/user/nonexistent_user_id_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
    def test_user_history_requires_admin(self, citizen_session):
        """Test that user enforcement history requires admin role"""
        if citizen_session is None:
            pytest.skip("Citizen session not available")
            
        response = citizen_session.get(f"{BASE_URL}/api/government/enforcement/user/some_user_id")
        assert response.status_code in [401, 403], "Expected 401 or 403 for non-admin"


class TestReinstateUser:
    """Test POST /api/government/enforcement/reinstate/{user_id} endpoint"""
    
    def test_reinstate_requires_admin(self, citizen_session):
        """Test that reinstate requires admin role"""
        if citizen_session is None:
            pytest.skip("Citizen session not available")
            
        response = citizen_session.post(f"{BASE_URL}/api/government/enforcement/reinstate/some_user_id")
        assert response.status_code in [401, 403], "Expected 401 or 403 for non-admin"
        
    def test_reinstate_not_found(self, admin_session):
        """Test that reinstating non-existent user returns 404"""
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/reinstate/nonexistent_user_id_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
    def test_reinstate_not_suspended_user(self, admin_session):
        """Test that reinstating non-suspended user returns 400"""
        # Get a user who is not suspended
        users_response = admin_session.get(f"{BASE_URL}/api/government/users-list")
        if users_response.status_code != 200:
            pytest.skip("Could not get users list")
            
        users = users_response.json().get("users", [])
        
        # Find an active user
        active_user = None
        for user in users:
            user_id = user.get("user_id")
            profile_response = admin_session.get(f"{BASE_URL}/api/government/enforcement/user/{user_id}")
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                if profile_data.get("current_status", {}).get("license_status") == "active":
                    active_user = user_id
                    break
                    
        if not active_user:
            pytest.skip("No active user found")
            
        response = admin_session.post(f"{BASE_URL}/api/government/enforcement/reinstate/{active_user}")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestDealerTransactionBlocking:
    """Test that dealer transactions are blocked for suspended users"""
    
    def test_dealer_transaction_blocked_for_suspended(self, admin_session):
        """Test that dealer transactions are blocked for suspended users"""
        # Find a suspended user or create one
        users_response = admin_session.get(f"{BASE_URL}/api/government/users-list")
        if users_response.status_code != 200:
            pytest.skip("Could not get users list")
            
        users = users_response.json().get("users", [])
        
        # Look for citizen_003 which should be suspended
        suspended_license = None
        for user in users:
            user_id = user.get("user_id")
            profile_response = admin_session.get(f"{BASE_URL}/api/government/enforcement/user/{user_id}")
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                if profile_data.get("current_status", {}).get("license_status") == "suspended":
                    profile = profile_data.get("profile", {})
                    suspended_license = profile.get("license_number")
                    break
                    
        if not suspended_license:
            pytest.skip("No suspended user found to test with")
            
        # Get dealer session
        dealer_session = requests.Session()
        dealer_session.headers.update({"Content-Type": "application/json"})
        dealer_response = dealer_session.post(f"{BASE_URL}/api/auth/login", json={"username": "dealer1", "password": "dealer123"})
        
        if dealer_response.status_code != 200:
            pytest.skip("Could not login as dealer")
            
        # Attempt to initiate a transaction for the suspended user
        transaction_data = {
            "citizen_license": suspended_license,
            "item_type": "ammunition",
            "item_category": "9mm",
            "quantity": 50
        }
        
        response = dealer_session.post(f"{BASE_URL}/api/dealer/initiate-transaction", json=transaction_data)
        
        # Should be blocked with 403
        assert response.status_code == 403, f"Expected 403 for suspended user, got {response.status_code}: {response.text}"
        
        # Verify error message
        if response.status_code == 403:
            error_data = response.json()
            assert "blocked" in error_data.get("detail", "").lower() or "suspended" in error_data.get("detail", "").lower()


class TestEnforcementIntegration:
    """Integration tests for enforcement flow"""
    
    def test_enforcement_flow(self, admin_session):
        """Test full enforcement flow: run -> check history -> check status"""
        # Run enforcement
        run_response = admin_session.post(f"{BASE_URL}/api/government/enforcement/run")
        assert run_response.status_code == 200
        
        # Check history was recorded
        history_response = admin_session.get(f"{BASE_URL}/api/government/enforcement/history?limit=1")
        assert history_response.status_code == 200
        history_data = history_response.json()
        assert len(history_data["executions"]) > 0, "Enforcement run should be recorded in history"
        
        # Check status is updated
        status_response = admin_session.get(f"{BASE_URL}/api/government/enforcement/status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert "current_status" in status_data
        

class TestUnauthenticatedAccess:
    """Test that all enforcement endpoints require authentication"""
    
    def test_status_unauthenticated(self):
        """Test that status endpoint rejects unauthenticated requests"""
        response = requests.get(f"{BASE_URL}/api/government/enforcement/status")
        assert response.status_code == 401
        
    def test_run_unauthenticated(self):
        """Test that run endpoint rejects unauthenticated requests"""
        response = requests.post(f"{BASE_URL}/api/government/enforcement/run")
        assert response.status_code == 401
        
    def test_history_unauthenticated(self):
        """Test that history endpoint rejects unauthenticated requests"""
        response = requests.get(f"{BASE_URL}/api/government/enforcement/history")
        assert response.status_code == 401
        
    def test_scheduler_start_unauthenticated(self):
        """Test that scheduler start rejects unauthenticated requests"""
        response = requests.post(f"{BASE_URL}/api/government/enforcement/scheduler/start")
        assert response.status_code == 401
        
    def test_scheduler_stop_unauthenticated(self):
        """Test that scheduler stop rejects unauthenticated requests"""
        response = requests.post(f"{BASE_URL}/api/government/enforcement/scheduler/stop")
        assert response.status_code == 401
        
    def test_reinstate_unauthenticated(self):
        """Test that reinstate rejects unauthenticated requests"""
        response = requests.post(f"{BASE_URL}/api/government/enforcement/reinstate/some_user")
        assert response.status_code == 401
        
    def test_user_history_unauthenticated(self):
        """Test that user history rejects unauthenticated requests"""
        response = requests.get(f"{BASE_URL}/api/government/enforcement/user/some_user")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
