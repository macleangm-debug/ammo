"""
Test Suite for Government Notification Trigger Scheduler Feature
Tests:
- Scheduler start/stop/status endpoints
- Single trigger execution
- Run all triggers manually
- Trigger executions history
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNotificationScheduler:
    """Tests for the Notification Trigger Scheduler feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - get admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
        
    # ==================== SCHEDULER STATUS TESTS ====================
    
    def test_get_scheduler_status(self):
        """Test GET /api/government/triggers/scheduler-status"""
        response = self.session.get(f"{BASE_URL}/api/government/triggers/scheduler-status")
        assert response.status_code == 200, f"Failed to get scheduler status: {response.text}"
        
        data = response.json()
        assert "scheduler_running" in data, "Response should contain scheduler_running"
        assert "check_interval" in data, "Response should contain check_interval"
        assert "enabled_triggers" in data, "Response should contain enabled_triggers"
        assert "triggers" in data, "Response should contain triggers list"
        assert "recent_executions" in data, "Response should contain recent_executions"
        
        assert isinstance(data["scheduler_running"], bool), "scheduler_running should be boolean"
        assert isinstance(data["enabled_triggers"], int), "enabled_triggers should be integer"
        assert isinstance(data["triggers"], list), "triggers should be a list"
        print(f"✓ Scheduler status: running={data['scheduler_running']}, enabled_triggers={data['enabled_triggers']}")
    
    def test_scheduler_status_shows_trigger_details(self):
        """Test that scheduler status includes trigger details"""
        response = self.session.get(f"{BASE_URL}/api/government/triggers/scheduler-status")
        assert response.status_code == 200
        
        data = response.json()
        if data["triggers"]:
            trigger = data["triggers"][0]
            assert "trigger_id" in trigger, "Each trigger should have trigger_id"
            assert "name" in trigger, "Each trigger should have name"
            print(f"✓ Found {len(data['triggers'])} enabled triggers in scheduler status")
        else:
            print("✓ No enabled triggers found (scheduler status still working)")
    
    # ==================== SCHEDULER START/STOP TESTS ====================
    
    def test_start_scheduler(self):
        """Test POST /api/government/triggers/scheduler/start"""
        response = self.session.post(f"{BASE_URL}/api/government/triggers/scheduler/start")
        assert response.status_code == 200, f"Failed to start scheduler: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "status" in data, "Response should contain status"
        assert data["status"] == "running", f"Expected status 'running', got '{data['status']}'"
        print(f"✓ Scheduler start response: {data['message']}")
        
        # Verify scheduler is actually running
        status_response = self.session.get(f"{BASE_URL}/api/government/triggers/scheduler-status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["scheduler_running"] == True, "Scheduler should be running after start"
        print(f"✓ Verified scheduler is running: {status_data['scheduler_running']}")
    
    def test_start_scheduler_when_already_running(self):
        """Test starting scheduler when it's already running"""
        # First ensure it's started
        self.session.post(f"{BASE_URL}/api/government/triggers/scheduler/start")
        
        # Try to start again
        response = self.session.post(f"{BASE_URL}/api/government/triggers/scheduler/start")
        assert response.status_code == 200, f"Should handle already running gracefully: {response.text}"
        
        data = response.json()
        assert "already running" in data["message"].lower() or data["status"] == "running", \
            "Should indicate scheduler is already running"
        print(f"✓ Starting already-running scheduler handled gracefully: {data['message']}")
    
    def test_stop_scheduler(self):
        """Test POST /api/government/triggers/scheduler/stop"""
        # First start the scheduler to ensure it's running
        self.session.post(f"{BASE_URL}/api/government/triggers/scheduler/start")
        
        # Now stop it
        response = self.session.post(f"{BASE_URL}/api/government/triggers/scheduler/stop")
        assert response.status_code == 200, f"Failed to stop scheduler: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "status" in data, "Response should contain status"
        assert data["status"] == "stopped", f"Expected status 'stopped', got '{data['status']}'"
        print(f"✓ Scheduler stop response: {data['message']}")
        
        # Verify scheduler is actually stopped
        status_response = self.session.get(f"{BASE_URL}/api/government/triggers/scheduler-status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["scheduler_running"] == False, "Scheduler should be stopped after stop"
        print(f"✓ Verified scheduler is stopped: {status_data['scheduler_running']}")
    
    def test_stop_scheduler_when_not_running(self):
        """Test stopping scheduler when it's not running"""
        # First ensure it's stopped
        self.session.post(f"{BASE_URL}/api/government/triggers/scheduler/stop")
        
        # Try to stop again
        response = self.session.post(f"{BASE_URL}/api/government/triggers/scheduler/stop")
        assert response.status_code == 200, f"Should handle not running gracefully: {response.text}"
        
        data = response.json()
        assert "not running" in data["message"].lower() or data["status"] == "stopped", \
            "Should indicate scheduler is not running"
        print(f"✓ Stopping already-stopped scheduler handled gracefully: {data['message']}")
    
    # ==================== TRIGGER EXECUTION TESTS ====================
    
    def test_execute_single_trigger(self):
        """Test POST /api/government/triggers/{trigger_id}/execute"""
        # First get a trigger
        triggers_response = self.session.get(f"{BASE_URL}/api/government/notification-triggers")
        assert triggers_response.status_code == 200
        triggers = triggers_response.json().get("triggers", [])
        
        if not triggers:
            pytest.skip("No triggers available to test execution")
        
        trigger_id = triggers[0]["trigger_id"]
        trigger_name = triggers[0]["name"]
        
        # Execute the trigger manually
        response = self.session.post(f"{BASE_URL}/api/government/triggers/{trigger_id}/execute")
        assert response.status_code == 200, f"Failed to execute trigger: {response.text}"
        
        data = response.json()
        assert "execution_id" in data, "Response should contain execution_id"
        assert "status" in data, "Response should contain status"
        assert data["status"] in ["completed", "failed"], f"Unexpected status: {data['status']}"
        
        if data["status"] == "completed":
            assert "users_matched" in data, "Completed execution should have users_matched"
            assert "notifications_sent" in data, "Completed execution should have notifications_sent"
            print(f"✓ Trigger '{trigger_name}' executed: {data['notifications_sent']} notifications sent to {data['users_matched']} users")
        else:
            print(f"✓ Trigger '{trigger_name}' execution failed (expected if no matching users): {data.get('error', 'Unknown error')}")
    
    def test_execute_nonexistent_trigger(self):
        """Test executing a trigger that doesn't exist"""
        response = self.session.post(f"{BASE_URL}/api/government/triggers/nonexistent_trigger_id/execute")
        assert response.status_code == 404, f"Expected 404 for nonexistent trigger, got {response.status_code}"
        print("✓ Executing nonexistent trigger returns 404")
    
    def test_run_all_triggers(self):
        """Test POST /api/government/triggers/run-all"""
        response = self.session.post(f"{BASE_URL}/api/government/triggers/run-all")
        assert response.status_code == 200, f"Failed to run all triggers: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "results" in data, "Response should contain results"
        assert isinstance(data["results"], list), "Results should be a list"
        
        # Verify each result has expected fields
        for result in data["results"]:
            assert "trigger_id" in result, "Each result should have trigger_id"
            assert "trigger_name" in result, "Each result should have trigger_name"
            assert "status" in result, "Each result should have status"
        
        print(f"✓ Run all triggers completed: {data['message']}")
        print(f"  Results: {len(data['results'])} triggers executed")
        for result in data["results"]:
            print(f"    - {result['trigger_name']}: {result['status']} ({result.get('notifications_sent', 0)} sent)")
    
    # ==================== TRIGGER EXECUTIONS HISTORY TESTS ====================
    
    def test_get_executions_history(self):
        """Test GET /api/government/triggers/executions"""
        response = self.session.get(f"{BASE_URL}/api/government/triggers/executions")
        assert response.status_code == 200, f"Failed to get executions: {response.text}"
        
        data = response.json()
        assert "executions" in data, "Response should contain executions"
        assert isinstance(data["executions"], list), "Executions should be a list"
        
        if data["executions"]:
            execution = data["executions"][0]
            assert "execution_id" in execution, "Each execution should have execution_id"
            assert "trigger_id" in execution, "Each execution should have trigger_id"
            assert "trigger_name" in execution, "Each execution should have trigger_name"
            assert "status" in execution, "Each execution should have status"
            assert "started_at" in execution, "Each execution should have started_at"
            print(f"✓ Found {len(data['executions'])} execution records")
            print(f"  Latest: {execution['trigger_name']} - {execution['status']} at {execution['started_at']}")
        else:
            print("✓ No execution records found (expected if no triggers have been executed)")
    
    def test_get_executions_filter_by_trigger_id(self):
        """Test filtering executions by trigger_id"""
        # Get a trigger first
        triggers_response = self.session.get(f"{BASE_URL}/api/government/notification-triggers")
        triggers = triggers_response.json().get("triggers", [])
        
        if not triggers:
            pytest.skip("No triggers available to test filtering")
        
        trigger_id = triggers[0]["trigger_id"]
        
        response = self.session.get(f"{BASE_URL}/api/government/triggers/executions?trigger_id={trigger_id}")
        assert response.status_code == 200
        
        data = response.json()
        for execution in data["executions"]:
            assert execution["trigger_id"] == trigger_id, \
                f"Filtered execution should have trigger_id={trigger_id}, got {execution['trigger_id']}"
        
        print(f"✓ Filtered executions by trigger_id: {len(data['executions'])} records")
    
    def test_get_executions_filter_by_status(self):
        """Test filtering executions by status"""
        response = self.session.get(f"{BASE_URL}/api/government/triggers/executions?status=completed")
        assert response.status_code == 200
        
        data = response.json()
        for execution in data["executions"]:
            assert execution["status"] == "completed", \
                f"Filtered execution should have status=completed, got {execution['status']}"
        
        print(f"✓ Filtered executions by status=completed: {len(data['executions'])} records")
    
    def test_get_executions_with_limit(self):
        """Test limiting executions results"""
        response = self.session.get(f"{BASE_URL}/api/government/triggers/executions?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["executions"]) <= 5, f"Expected at most 5 results, got {len(data['executions'])}"
        print(f"✓ Executions with limit=5: {len(data['executions'])} records returned")
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_scheduler_endpoints_require_auth(self):
        """Test that scheduler endpoints require authentication"""
        no_auth_session = requests.Session()
        
        endpoints = [
            ("GET", f"{BASE_URL}/api/government/triggers/scheduler-status"),
            ("POST", f"{BASE_URL}/api/government/triggers/scheduler/start"),
            ("POST", f"{BASE_URL}/api/government/triggers/scheduler/stop"),
            ("POST", f"{BASE_URL}/api/government/triggers/run-all"),
            ("GET", f"{BASE_URL}/api/government/triggers/executions"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = no_auth_session.get(url)
            else:
                response = no_auth_session.post(url)
            
            assert response.status_code == 401, \
                f"Expected 401 for unauthenticated {method} {url}, got {response.status_code}"
        
        print("✓ All scheduler endpoints properly require authentication")
    
    def test_scheduler_endpoints_require_admin_role(self):
        """Test that scheduler endpoints require admin role"""
        # Login as citizen
        citizen_session = requests.Session()
        citizen_session.headers.update({"Content-Type": "application/json"})
        
        login_response = citizen_session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "citizen",
            "password": "demo123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as citizen")
        
        token = login_response.json().get("session_token")
        citizen_session.headers.update({"Authorization": f"Bearer {token}"})
        
        endpoints = [
            ("GET", f"{BASE_URL}/api/government/triggers/scheduler-status"),
            ("POST", f"{BASE_URL}/api/government/triggers/scheduler/start"),
            ("POST", f"{BASE_URL}/api/government/triggers/scheduler/stop"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = citizen_session.get(url)
            else:
                response = citizen_session.post(url)
            
            assert response.status_code == 403, \
                f"Expected 403 for citizen accessing {method} {url}, got {response.status_code}"
        
        print("✓ Scheduler endpoints properly require admin role (citizens get 403)")


class TestTriggerExecutionFlow:
    """End-to-end test of trigger execution flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - get admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        
        data = response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_e2e_create_execute_verify_trigger(self):
        """End-to-end test: Create trigger -> Execute -> Verify execution history"""
        # 1. Create a test trigger
        trigger_data = {
            "name": "TEST_E2E_Scheduler_Trigger",
            "description": "Test trigger for E2E scheduler testing",
            "event_type": "custom",
            "conditions": {},
            "template_title": "Test Notification",
            "template_message": "This is a test notification from E2E testing",
            "notification_type": "system",
            "notification_category": "system",
            "priority": "low",
            "target_roles": ["citizen"],
            "schedule_interval": "daily",
            "enabled": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/government/notification-triggers", json=trigger_data)
        assert create_response.status_code in [200, 201], f"Failed to create trigger: {create_response.text}"
        
        trigger = create_response.json()
        trigger_id = trigger.get("trigger_id")
        print(f"✓ Created test trigger: {trigger_id}")
        
        try:
            # 2. Execute the trigger
            execute_response = self.session.post(f"{BASE_URL}/api/government/triggers/{trigger_id}/execute")
            assert execute_response.status_code == 200, f"Failed to execute trigger: {execute_response.text}"
            
            exec_result = execute_response.json()
            execution_id = exec_result.get("execution_id")
            print(f"✓ Executed trigger: execution_id={execution_id}, status={exec_result.get('status')}")
            
            # 3. Verify execution appears in history
            history_response = self.session.get(f"{BASE_URL}/api/government/triggers/executions?trigger_id={trigger_id}")
            assert history_response.status_code == 200
            
            executions = history_response.json().get("executions", [])
            assert any(e.get("execution_id") == execution_id for e in executions), \
                "Execution should appear in history"
            print(f"✓ Verified execution {execution_id} appears in history")
            
            # 4. Verify trigger's last_executed_at was updated
            triggers_response = self.session.get(f"{BASE_URL}/api/government/notification-triggers")
            triggers = triggers_response.json().get("triggers", [])
            updated_trigger = next((t for t in triggers if t.get("trigger_id") == trigger_id), None)
            
            if updated_trigger:
                assert updated_trigger.get("last_executed_at") is not None, \
                    "Trigger's last_executed_at should be set after execution"
                assert updated_trigger.get("last_execution_result") is not None, \
                    "Trigger's last_execution_result should be set"
                print(f"✓ Verified trigger metadata updated: last_executed_at={updated_trigger.get('last_executed_at')}")
            
        finally:
            # Cleanup: Delete the test trigger
            delete_response = self.session.delete(f"{BASE_URL}/api/government/notification-triggers/{trigger_id}")
            print(f"✓ Cleaned up test trigger: {trigger_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
