"""
Test Government Notification Management System
- Manual notification sending (all users, specific roles, individual users)
- Automated notification triggers (CRUD operations)
- Notification templates (CRUD operations)
- Notification history and statistics
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGovernmentNotifications:
    """Government Notification Management API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for tests - login as admin"""
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
        assert self.session_token, "No session token returned"
        
        # Set session cookie
        self.session.cookies.set("session_token", self.session_token)
        
    # ===================== NOTIFICATION STATS =====================
    
    def test_get_notification_stats(self):
        """GET /api/government/notification-stats - returns stats"""
        response = self.session.get(f"{BASE_URL}/api/government/notification-stats")
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        # Verify stats structure
        assert "total_sent" in data, "Missing total_sent"
        assert "total_read" in data, "Missing total_read"
        assert "read_rate" in data, "Missing read_rate"
        assert "by_category" in data, "Missing by_category"
        assert "recent_7_days" in data, "Missing recent_7_days"
        assert "active_triggers" in data, "Missing active_triggers"
        
        print(f"Stats: total_sent={data['total_sent']}, read_rate={data['read_rate']}%, active_triggers={data['active_triggers']}")

    # ===================== USERS LIST =====================
    
    def test_get_users_list(self):
        """GET /api/government/users-list - returns users and role counts"""
        response = self.session.get(f"{BASE_URL}/api/government/users-list")
        assert response.status_code == 200, f"Failed to get users list: {response.text}"
        
        data = response.json()
        assert "users" in data, "Missing users"
        assert "role_counts" in data, "Missing role_counts"
        assert isinstance(data["users"], list), "users should be a list"
        assert isinstance(data["role_counts"], dict), "role_counts should be a dict"
        
        print(f"Users: {len(data['users'])} users, roles: {data['role_counts']}")

    def test_get_users_list_by_role(self):
        """GET /api/government/users-list?role=citizen - filter by role"""
        response = self.session.get(f"{BASE_URL}/api/government/users-list?role=citizen")
        assert response.status_code == 200, f"Failed to get users by role: {response.text}"
        
        data = response.json()
        # All returned users should be citizens
        for user in data.get("users", []):
            assert user.get("role") == "citizen", f"User {user.get('user_id')} is not a citizen"

    # ===================== SEND NOTIFICATIONS =====================
    
    def test_send_notification_to_all(self):
        """POST /api/government/notifications/send - send to all users"""
        payload = {
            "target": "all",
            "title": "TEST_System Maintenance Notice",
            "message": "This is a test notification sent to all users.",
            "type": "announcement",
            "category": "system",
            "priority": "normal"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/notifications/send", json=payload)
        assert response.status_code == 200, f"Failed to send notification: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message"
        assert "notification_ids" in data, "Missing notification_ids"
        assert len(data["notification_ids"]) > 0, "No notifications created"
        
        print(f"Sent to all: {data['message']}, ids count: {len(data['notification_ids'])}")

    def test_send_notification_to_citizens(self):
        """POST /api/government/notifications/send - send to all citizens"""
        payload = {
            "target": "role:citizen",
            "title": "TEST_Citizen Update",
            "message": "This message is for citizens only.",
            "type": "announcement",
            "category": "compliance",
            "priority": "high"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/notifications/send", json=payload)
        assert response.status_code == 200, f"Failed to send to citizens: {response.text}"
        
        data = response.json()
        assert "notification_ids" in data
        print(f"Sent to citizens: {len(data['notification_ids'])} notifications")

    def test_send_notification_to_dealers(self):
        """POST /api/government/notifications/send - send to all dealers"""
        payload = {
            "target": "role:dealer",
            "title": "TEST_Dealer Notice",
            "message": "This message is for dealers only.",
            "type": "announcement",
            "category": "license",
            "priority": "normal"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/notifications/send", json=payload)
        assert response.status_code == 200, f"Failed to send to dealers: {response.text}"
        
        data = response.json()
        assert "notification_ids" in data
        print(f"Sent to dealers: {len(data['notification_ids'])} notifications")

    def test_send_notification_to_specific_user(self):
        """POST /api/government/notifications/send - send to specific user"""
        payload = {
            "target": "demo_citizen_001",
            "title": "TEST_Personal Message",
            "message": "This is a direct message to you.",
            "type": "alert",
            "category": "general",
            "priority": "urgent",
            "action_url": "/dashboard",
            "action_label": "View Dashboard"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/notifications/send", json=payload)
        assert response.status_code == 200, f"Failed to send to user: {response.text}"
        
        data = response.json()
        assert len(data["notification_ids"]) == 1, "Should create exactly 1 notification"
        print(f"Sent to specific user: {data['notification_ids'][0]}")

    def test_send_notification_validation(self):
        """POST /api/government/notifications/send - validation fails without title/message"""
        payload = {
            "target": "all",
            "title": "",
            "message": ""
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/notifications/send", json=payload)
        assert response.status_code == 400, "Should fail validation"
        print("Validation correctly rejects empty title/message")

    # ===================== NOTIFICATION TRIGGERS =====================
    
    def test_get_triggers(self):
        """GET /api/government/notification-triggers - list triggers"""
        response = self.session.get(f"{BASE_URL}/api/government/notification-triggers")
        assert response.status_code == 200, f"Failed to get triggers: {response.text}"
        
        data = response.json()
        assert "triggers" in data, "Missing triggers"
        assert isinstance(data["triggers"], list), "triggers should be a list"
        print(f"Found {len(data['triggers'])} triggers")

    def test_create_trigger(self):
        """POST /api/government/notification-triggers - create trigger"""
        payload = {
            "name": "TEST_Training Reminder",
            "description": "Remind users about incomplete training",
            "event_type": "training_incomplete",
            "conditions": {"days_overdue": 7},
            "template_title": "Complete Your Training",
            "template_message": "Dear {{user_name}}, please complete your required training within 7 days.",
            "notification_type": "reminder",
            "notification_category": "training",
            "priority": "high",
            "target_roles": ["citizen"],
            "enabled": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/notification-triggers", json=payload)
        assert response.status_code == 200, f"Failed to create trigger: {response.text}"
        
        data = response.json()
        assert "trigger_id" in data, "Missing trigger_id"
        assert "message" in data, "Missing message"
        
        self.created_trigger_id = data["trigger_id"]
        print(f"Created trigger: {data['trigger_id']}")
        
        return data["trigger_id"]

    def test_update_trigger(self):
        """PUT /api/government/notification-triggers/{id} - update trigger"""
        # First create a trigger
        create_payload = {
            "name": "TEST_Update Test Trigger",
            "description": "Trigger to be updated",
            "event_type": "license_expiring",
            "conditions": {"days_before": 30},
            "template_title": "Original Title",
            "template_message": "Original message",
            "notification_type": "reminder",
            "notification_category": "license",
            "priority": "normal",
            "target_roles": ["citizen"],
            "enabled": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/government/notification-triggers", json=create_payload)
        assert create_response.status_code == 200, f"Failed to create trigger: {create_response.text}"
        trigger_id = create_response.json()["trigger_id"]
        
        # Now update it
        update_payload = {
            "name": "TEST_Updated Trigger Name",
            "description": "Updated description",
            "priority": "urgent",
            "enabled": False
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/government/notification-triggers/{trigger_id}", json=update_payload)
        assert update_response.status_code == 200, f"Failed to update trigger: {update_response.text}"
        
        # Verify the update
        get_response = self.session.get(f"{BASE_URL}/api/government/notification-triggers")
        assert get_response.status_code == 200
        
        triggers = get_response.json()["triggers"]
        updated_trigger = next((t for t in triggers if t["trigger_id"] == trigger_id), None)
        assert updated_trigger is not None, "Updated trigger not found"
        assert updated_trigger["name"] == "TEST_Updated Trigger Name", "Name not updated"
        assert updated_trigger["priority"] == "urgent", "Priority not updated"
        assert updated_trigger["enabled"] == False, "Enabled flag not updated"
        
        print(f"Updated trigger {trigger_id}")

    def test_toggle_trigger_enabled(self):
        """PUT /api/government/notification-triggers/{id} - toggle enabled status"""
        # Create a trigger
        create_payload = {
            "name": "TEST_Toggle Trigger",
            "description": "Test toggling",
            "event_type": "compliance_warning",
            "conditions": {},
            "template_title": "Compliance Alert",
            "template_message": "Your compliance score needs attention.",
            "notification_type": "alert",
            "notification_category": "compliance",
            "priority": "high",
            "target_roles": ["citizen"],
            "enabled": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/government/notification-triggers", json=create_payload)
        assert create_response.status_code == 200
        trigger_id = create_response.json()["trigger_id"]
        
        # Toggle to disabled
        toggle_response = self.session.put(f"{BASE_URL}/api/government/notification-triggers/{trigger_id}", json={"enabled": False})
        assert toggle_response.status_code == 200, f"Failed to toggle: {toggle_response.text}"
        
        # Toggle back to enabled
        toggle_response2 = self.session.put(f"{BASE_URL}/api/government/notification-triggers/{trigger_id}", json={"enabled": True})
        assert toggle_response2.status_code == 200
        
        print(f"Toggle trigger {trigger_id} worked")

    def test_delete_trigger(self):
        """DELETE /api/government/notification-triggers/{id} - delete trigger"""
        # Create a trigger to delete
        create_payload = {
            "name": "TEST_Delete Me",
            "description": "To be deleted",
            "event_type": "custom",
            "conditions": {},
            "template_title": "Delete Test",
            "template_message": "This will be deleted",
            "notification_type": "system",
            "notification_category": "system",
            "priority": "low",
            "target_roles": ["admin"],
            "enabled": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/government/notification-triggers", json=create_payload)
        assert create_response.status_code == 200
        trigger_id = create_response.json()["trigger_id"]
        
        # Delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/government/notification-triggers/{trigger_id}")
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/government/notification-triggers")
        triggers = get_response.json()["triggers"]
        deleted_trigger = next((t for t in triggers if t["trigger_id"] == trigger_id), None)
        assert deleted_trigger is None, "Trigger should be deleted"
        
        print(f"Deleted trigger {trigger_id}")

    def test_delete_trigger_not_found(self):
        """DELETE /api/government/notification-triggers/{id} - returns 404 for non-existent"""
        response = self.session.delete(f"{BASE_URL}/api/government/notification-triggers/non_existent_id")
        assert response.status_code == 404, "Should return 404 for non-existent trigger"

    def test_test_trigger(self):
        """POST /api/government/notification-triggers/{id}/test - test trigger"""
        # Create a trigger
        create_payload = {
            "name": "TEST_Test Trigger Send",
            "description": "For testing",
            "event_type": "license_expiring",
            "conditions": {"days_before": 14},
            "template_title": "License Expiring Soon",
            "template_message": "Dear {{user_name}}, your license will expire in {{days_remaining}} days.",
            "notification_type": "reminder",
            "notification_category": "license",
            "priority": "high",
            "target_roles": ["citizen"],
            "enabled": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/government/notification-triggers", json=create_payload)
        assert create_response.status_code == 200
        trigger_id = create_response.json()["trigger_id"]
        
        # Test it
        test_response = self.session.post(f"{BASE_URL}/api/government/notification-triggers/{trigger_id}/test")
        assert test_response.status_code == 200, f"Failed to test trigger: {test_response.text}"
        
        data = test_response.json()
        assert "message" in data, "Missing message"
        assert "notification_id" in data, "Missing notification_id"
        
        print(f"Test trigger sent notification: {data['notification_id']}")

    # ===================== NOTIFICATION TEMPLATES =====================
    
    def test_get_templates(self):
        """GET /api/government/notification-templates - list templates"""
        response = self.session.get(f"{BASE_URL}/api/government/notification-templates")
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        data = response.json()
        assert "templates" in data, "Missing templates"
        assert isinstance(data["templates"], list), "templates should be a list"
        print(f"Found {len(data['templates'])} templates")

    def test_create_template(self):
        """POST /api/government/notification-templates - create template"""
        payload = {
            "name": "TEST_Monthly Newsletter",
            "title": "Monthly Safety Update",
            "message": "This month's safety tips and compliance reminders.",
            "type": "announcement",
            "category": "general",
            "priority": "low",
            "action_url": "/training",
            "action_label": "View Training"
        }
        
        response = self.session.post(f"{BASE_URL}/api/government/notification-templates", json=payload)
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        
        data = response.json()
        assert "template_id" in data, "Missing template_id"
        assert "message" in data, "Missing message"
        
        print(f"Created template: {data['template_id']}")
        return data["template_id"]

    def test_delete_template(self):
        """DELETE /api/government/notification-templates/{id} - delete template"""
        # Create a template to delete
        create_payload = {
            "name": "TEST_Delete Template",
            "title": "To Be Deleted",
            "message": "This template will be deleted.",
            "type": "announcement",
            "category": "system",
            "priority": "normal"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/government/notification-templates", json=create_payload)
        assert create_response.status_code == 200
        template_id = create_response.json()["template_id"]
        
        # Delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/government/notification-templates/{template_id}")
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/government/notification-templates")
        templates = get_response.json()["templates"]
        deleted_template = next((t for t in templates if t["template_id"] == template_id), None)
        assert deleted_template is None, "Template should be deleted"
        
        print(f"Deleted template {template_id}")

    def test_delete_template_not_found(self):
        """DELETE /api/government/notification-templates/{id} - returns 404 for non-existent"""
        response = self.session.delete(f"{BASE_URL}/api/government/notification-templates/non_existent_id")
        assert response.status_code == 404, "Should return 404 for non-existent template"

    # ===================== NOTIFICATION HISTORY =====================
    
    def test_get_notification_history(self):
        """GET /api/government/notifications - get sent notifications history"""
        response = self.session.get(f"{BASE_URL}/api/government/notifications?limit=20")
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        
        data = response.json()
        assert "notifications" in data, "Missing notifications"
        assert "total" in data, "Missing total count"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        
        print(f"Found {data['total']} notifications, showing {len(data['notifications'])}")

    def test_get_notification_history_by_category(self):
        """GET /api/government/notifications?category=system - filter by category"""
        response = self.session.get(f"{BASE_URL}/api/government/notifications?category=system&limit=10")
        assert response.status_code == 200, f"Failed to filter: {response.text}"
        
        data = response.json()
        # All returned notifications should have system category
        for notif in data.get("notifications", []):
            assert notif.get("category") == "system", f"Notification {notif.get('notification_id')} is not system category"

    # ===================== UNAUTHORIZED ACCESS =====================
    
    def test_endpoints_require_auth(self):
        """Verify all endpoints require admin authentication"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        endpoints = [
            ("GET", f"{BASE_URL}/api/government/notification-stats"),
            ("GET", f"{BASE_URL}/api/government/notification-triggers"),
            ("GET", f"{BASE_URL}/api/government/notification-templates"),
            ("GET", f"{BASE_URL}/api/government/notifications"),
            ("GET", f"{BASE_URL}/api/government/users-list"),
            ("POST", f"{BASE_URL}/api/government/notifications/send"),
            ("POST", f"{BASE_URL}/api/government/notification-triggers"),
            ("POST", f"{BASE_URL}/api/government/notification-templates"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = unauth_session.get(url)
            else:
                response = unauth_session.post(url, json={})
            
            assert response.status_code == 401, f"{method} {url} should require auth, got {response.status_code}"
        
        print("All endpoints correctly require authentication")


class TestCitizenNotifications:
    """Test citizen notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for tests - login as citizen"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as citizen
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "citizen",
            "password": "demo123"
        })
        assert response.status_code == 200, f"Citizen login failed: {response.text}"
        
        data = response.json()
        self.session_token = data.get("session_token")
        self.session.cookies.set("session_token", self.session_token)

    def test_citizen_cannot_access_government_endpoints(self):
        """Citizens should not be able to access government notification endpoints"""
        response = self.session.get(f"{BASE_URL}/api/government/notification-stats")
        assert response.status_code == 403, "Citizens should be forbidden from government endpoints"
        
        print("Citizens correctly blocked from government endpoints")

    def test_citizen_can_view_own_notifications(self):
        """GET /api/citizen/notifications - citizen can view their notifications"""
        response = self.session.get(f"{BASE_URL}/api/citizen/notifications")
        assert response.status_code == 200, f"Failed to get citizen notifications: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of notifications"
        print(f"Citizen has {len(data)} notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
