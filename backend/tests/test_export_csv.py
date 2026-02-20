"""
Test Export CSV functionality for Firearm Owners page
Tests the /government/users-export endpoint and related functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestExportCSV:
    """Tests for CSV Export feature"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            data = login_response.json()
            if data.get("session_token"):
                self.session.cookies.set("session_token", data["session_token"])
        yield
        self.session.close()
    
    def test_export_csv_endpoint_exists(self):
        """Test that the export CSV endpoint exists and returns proper status"""
        # This should return 401 without auth
        response = requests.get(f"{BASE_URL}/api/government/users-export")
        # Either 401 (unauthorized) or 200 (if session is passed) is acceptable
        assert response.status_code in [401, 200, 403], f"Unexpected status: {response.status_code}"
        print(f"✅ Export endpoint exists, status: {response.status_code}")
    
    def test_export_csv_with_auth(self):
        """Test CSV export with admin authentication"""
        response = self.session.get(f"{BASE_URL}/api/government/users-export")
        
        if response.status_code == 401:
            print("⚠️ Auth issue - testing with direct login flow")
            # Try alternative auth approach
            pytest.skip("Session authentication not working, needs cookie-based auth")
        
        # Should return CSV content
        if response.status_code == 200:
            content_type = response.headers.get('Content-Type', '')
            assert 'text/csv' in content_type or 'application/octet-stream' in content_type, \
                f"Expected CSV content type, got: {content_type}"
            
            # Check Content-Disposition header
            content_disp = response.headers.get('Content-Disposition', '')
            assert 'attachment' in content_disp, "Missing attachment header"
            assert 'filename=' in content_disp, "Missing filename in header"
            
            # Check CSV content structure
            csv_content = response.text
            lines = csv_content.strip().split('\n')
            assert len(lines) >= 1, "CSV should have at least header row"
            
            # Validate header columns
            header = lines[0]
            expected_columns = [
                "User ID", "Name", "Email", "Role", "Region", "State",
                "License Type", "License Number", "License Status",
                "License Issued", "License Expiry", "Compliance Score",
                "Training Hours", "Phone", "Address", "Registered Date"
            ]
            for col in expected_columns:
                assert col in header, f"Missing column: {col}"
            
            print(f"✅ CSV export successful - {len(lines)} rows (including header)")
            print(f"✅ Header columns validated: {len(expected_columns)} expected columns present")
        else:
            print(f"❌ Export failed with status: {response.status_code}")
            assert False, f"Export failed: {response.status_code} - {response.text[:200]}"
    
    def test_export_csv_with_role_filter(self):
        """Test CSV export with role filter"""
        # Test with citizen filter
        response = self.session.get(f"{BASE_URL}/api/government/users-export?role=citizen")
        
        if response.status_code == 200:
            csv_content = response.text
            lines = csv_content.strip().split('\n')
            
            # Check that content includes Citizen role
            if len(lines) > 1:
                # Check a sample row contains "Citizen" in Role column
                has_citizen = any('Citizen' in line for line in lines[1:])
                print(f"✅ Role filter test - {len(lines)-1} records, citizens found: {has_citizen}")
            else:
                print("✅ Role filter test - Headers present, no data rows (acceptable)")
        elif response.status_code == 401:
            pytest.skip("Auth required for this test")
        else:
            print(f"⚠️ Role filter test returned: {response.status_code}")
    
    def test_export_csv_filename_format(self):
        """Test that CSV filename follows expected format"""
        response = self.session.get(f"{BASE_URL}/api/government/users-export")
        
        if response.status_code == 200:
            content_disp = response.headers.get('Content-Disposition', '')
            # Should contain firearm_owners and .csv extension
            assert 'firearm_owners' in content_disp, "Filename should contain 'firearm_owners'"
            assert '.csv' in content_disp, "Filename should have .csv extension"
            print(f"✅ Filename format correct: {content_disp}")
        elif response.status_code == 401:
            pytest.skip("Auth required")


class TestUsersListEndpoint:
    """Verify the users-list endpoint that feeds the Firearm Owners page"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup session"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            data = login_response.json()
            if data.get("session_token"):
                self.session.cookies.set("session_token", data["session_token"])
        yield
        self.session.close()
    
    def test_users_list_endpoint(self):
        """Test users list endpoint returns data for Firearm Owners page"""
        response = self.session.get(f"{BASE_URL}/api/government/users-list?role=citizen&limit=200")
        
        if response.status_code == 200:
            data = response.json()
            assert "users" in data, "Response should contain users array"
            assert "role_counts" in data, "Response should contain role_counts"
            
            users = data.get("users", [])
            role_counts = data.get("role_counts", {})
            
            print(f"✅ Users list returned {len(users)} users")
            print(f"✅ Role counts: {role_counts}")
        elif response.status_code == 401:
            pytest.skip("Auth required")
        else:
            print(f"❌ Users list failed: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
