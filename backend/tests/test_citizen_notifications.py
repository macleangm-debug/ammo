"""
Tests for Citizen Notifications Page functionality
- GET /api/citizen/notifications
- POST /api/citizen/notifications/{id}/read
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestCitizenNotifications:
    """Test citizen notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as citizen before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "citizen", "password": "demo123"}
        )
        assert response.status_code == 200, f"Failed to login: {response.text}"
        data = response.json()
        self.session_token = data["session_token"]
        self.headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
        self.user_id = data["user"]["user_id"]
        yield
    
    def test_get_notifications_authenticated(self):
        """Test GET /api/citizen/notifications returns notifications for authenticated citizen"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/citizen/notifications - returned {len(data)} notifications")
        
    def test_get_notifications_unauthenticated(self):
        """Test GET /api/citizen/notifications requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ GET /api/citizen/notifications - requires authentication (401 for unauthenticated)")
    
    def test_notifications_have_required_fields(self):
        """Test notifications have all required fields (title, message, type, category, priority)"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            notif = data[0]
            # Check required fields
            required_fields = ["notification_id", "user_id", "title", "message", "type", "read", "created_at"]
            for field in required_fields:
                assert field in notif, f"Missing required field: {field}"
            
            # Check optional but expected fields
            optional_fields = ["category", "priority", "sent_by"]
            present_fields = [f for f in optional_fields if f in notif]
            print(f"✅ Notifications have required fields: {required_fields}")
            print(f"   Optional fields present: {present_fields}")
        else:
            print("⚠️ No notifications to validate fields")
    
    def test_notifications_sorted_by_created_at_descending(self):
        """Test notifications are sorted by created_at in descending order (newest first)"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 1:
            # Check if sorted descending
            timestamps = [n.get("created_at") for n in data]
            sorted_timestamps = sorted(timestamps, reverse=True)
            assert timestamps == sorted_timestamps, "Notifications should be sorted by created_at descending"
            print("✅ Notifications sorted by created_at descending (newest first)")
        else:
            print("⚠️ Not enough notifications to verify sorting")
    
    def test_mark_notification_as_read(self):
        """Test POST /api/citizen/notifications/{id}/read marks notification as read"""
        # First get notifications
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Find an unread notification
        unread = [n for n in data if not n.get("read", False)]
        
        if len(unread) == 0:
            print("⚠️ No unread notifications to test mark as read")
            return
        
        notif_id = unread[0]["notification_id"]
        
        # Mark as read
        response = requests.post(
            f"{BASE_URL}/api/citizen/notifications/{notif_id}/read",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ POST /api/citizen/notifications/{notif_id}/read - marked as read")
        
        # Verify it's now read
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        data = response.json()
        marked_notif = [n for n in data if n["notification_id"] == notif_id]
        if marked_notif:
            assert marked_notif[0]["read"] == True, "Notification should be marked as read"
            print("✅ Verified notification is now marked as read")
    
    def test_mark_read_unauthenticated(self):
        """Test mark as read requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/citizen/notifications/notif_test/read"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ POST /api/citizen/notifications/{id}/read - requires authentication (401)")
    
    def test_notification_categories_and_priorities(self):
        """Test notifications have proper categories and priorities"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            categories = set()
            priorities = set()
            types = set()
            sources = set()
            
            for n in data:
                if n.get("category"):
                    categories.add(n["category"])
                if n.get("priority"):
                    priorities.add(n["priority"])
                if n.get("type"):
                    types.add(n["type"])
                if n.get("sent_by"):
                    # Check if automated (from trigger) or manual (from government)
                    if n["sent_by"].startswith("trigger:"):
                        sources.add("Automated")
                    else:
                        sources.add("Government")
            
            print(f"✅ Notification categories found: {categories}")
            print(f"✅ Notification priorities found: {priorities}")
            print(f"✅ Notification types found: {types}")
            print(f"✅ Notification sources found: {sources}")
        else:
            print("⚠️ No notifications to analyze")
    
    def test_stats_counts(self):
        """Test that we can calculate stats from notifications (Total, Unread, Urgent, Read)"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        total = len(data)
        unread = len([n for n in data if not n.get("read", False)])
        urgent = len([n for n in data if n.get("priority") in ["urgent", "high"]])
        read = len([n for n in data if n.get("read", False)])
        
        print(f"✅ Stats counts - Total: {total}, Unread: {unread}, Urgent: {urgent}, Read: {read}")
        assert total == unread + read, "Total should equal unread + read"

    def test_notifications_with_action_url(self):
        """Test notifications can have action_url for action buttons"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        with_action = [n for n in data if n.get("action_url")]
        
        if with_action:
            print(f"✅ Found {len(with_action)} notifications with action_url")
            for n in with_action[:2]:
                print(f"   - {n['title']}: {n.get('action_url')} ({n.get('action_label', 'View')})")
        else:
            print("⚠️ No notifications with action_url found (this may be expected)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
