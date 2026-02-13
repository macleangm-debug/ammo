import requests
import sys
from datetime import datetime
import json

class AegisAPITester:
    def __init__(self, base_url="https://license-buy.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        
        # Store auth tokens for different user types
        self.citizen_token = None
        self.dealer_token = None
        self.admin_token = None

    def log_test(self, test_name, passed, details=""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ PASS: {test_name}")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ FAIL: {test_name}")
            if details:
                print(f"   Error: {details}")
        print()

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', '')}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, str(e))
            return False

    def test_health_endpoint(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/health")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Status: {data.get('status', '')}"
            self.log_test("Health Check Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check Endpoint", False, str(e))
            return False

    def test_demo_setup(self):
        """Test demo data setup"""
        try:
            response = self.session.post(f"{self.api_url}/demo/setup")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', '')}"
                details += f", Demo License: {data.get('citizen_license', '')}"
            self.log_test("Demo Data Setup", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Demo Data Setup", False, str(e))
            return False, {}

    def test_auth_me_without_token(self):
        """Test /api/auth/me endpoint without authentication"""
        try:
            response = self.session.get(f"{self.api_url}/auth/me")
            # Should return 401 for unauthenticated request
            success = response.status_code == 401
            details = f"Status: {response.status_code} (Expected 401)"
            self.log_test("Auth Me (Unauthenticated)", success, details)
            return success
        except Exception as e:
            self.log_test("Auth Me (Unauthenticated)", False, str(e))
            return False

    def create_test_session_direct(self, role="citizen"):
        """Create test session directly in MongoDB using mongosh"""
        import subprocess
        import time
        
        timestamp = int(time.time() * 1000)
        user_id = f"test_{role}_{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        mongo_script = f"""
        use('test_database');
        db.users.insertOne({{
          user_id: '{user_id}',
          email: 'test.{role}.{timestamp}@aegis.gov',
          name: 'Test {role.title()}',
          picture: 'https://via.placeholder.com/150',
          role: '{role}',
          created_at: new Date()
        }});
        db.user_sessions.insertOne({{
          user_id: '{user_id}',
          session_token: '{session_token}',
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        }});
        print('SUCCESS: {session_token}');
        """
        
        try:
            result = subprocess.run(
                ["mongosh", "--eval", mongo_script],
                capture_output=True,
                text=True
            )
            if "SUCCESS:" in result.stdout:
                return session_token, user_id
            else:
                print(f"MongoDB script failed: {result.stderr}")
                return None, None
        except Exception as e:
            print(f"Failed to create test session: {e}")
            return None, None

    def test_auth_me_with_token(self, role="citizen"):
        """Test /api/auth/me with valid session token"""
        session_token, user_id = self.create_test_session_direct(role)
        if not session_token:
            self.log_test(f"Auth Me ({role})", False, "Failed to create test session")
            return False, None
            
        try:
            headers = {"Authorization": f"Bearer {session_token}"}
            response = self.session.get(f"{self.api_url}/auth/me", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Role: {data.get('role', '')}, User ID: {data.get('user_id', '')}"
                # Store token for role-based testing
                if role == "citizen":
                    self.citizen_token = session_token
                elif role == "dealer":
                    self.dealer_token = session_token
                elif role == "admin":
                    self.admin_token = session_token
                    
            self.log_test(f"Auth Me ({role})", success, details)
            return success, session_token
        except Exception as e:
            self.log_test(f"Auth Me ({role})", False, str(e))
            return False, None

    def test_citizen_profile_endpoint(self):
        """Test citizen profile endpoint"""
        if not self.citizen_token:
            success, token = self.test_auth_me_with_token("citizen")
            if not success:
                self.log_test("Citizen Profile", False, "No valid citizen token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.citizen_token}"}
            response = self.session.get(f"{self.api_url}/citizen/profile", headers=headers)
            # Can return 200 (profile exists) or 200 with null (no profile yet)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                if data:
                    details += f", License: {data.get('license_number', 'N/A')}"
                else:
                    details += ", Profile: None (expected for new user)"
            self.log_test("Citizen Profile Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Citizen Profile Endpoint", False, str(e))
            return False

    def test_dealer_profile_endpoint(self):
        """Test dealer profile endpoint"""
        if not self.dealer_token:
            success, token = self.test_auth_me_with_token("dealer")
            if not success:
                self.log_test("Dealer Profile", False, "No valid dealer token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.dealer_token}"}
            response = self.session.get(f"{self.api_url}/dealer/profile", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                if data:
                    details += f", Business: {data.get('business_name', 'N/A')}"
                else:
                    details += ", Profile: None (expected for new dealer)"
            self.log_test("Dealer Profile Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Dealer Profile Endpoint", False, str(e))
            return False

    def test_admin_dashboard_stats(self):
        """Test admin dashboard stats endpoint"""
        if not self.admin_token:
            success, token = self.test_auth_me_with_token("admin")
            if not success:
                self.log_test("Admin Dashboard Stats", False, "No valid admin token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{self.api_url}/admin/dashboard-stats", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Citizens: {data.get('total_citizens', 0)}, Dealers: {data.get('total_dealers', 0)}, Transactions: {data.get('total_transactions', 0)}"
            self.log_test("Admin Dashboard Stats", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Dashboard Stats", False, str(e))
            return False

    def test_cors_headers(self):
        """Test CORS configuration"""
        try:
            response = self.session.options(f"{self.api_url}/health")
            cors_headers = {
                'access-control-allow-origin': response.headers.get('Access-Control-Allow-Origin'),
                'access-control-allow-methods': response.headers.get('Access-Control-Allow-Methods'),
                'access-control-allow-credentials': response.headers.get('Access-Control-Allow-Credentials')
            }
            
            success = bool(cors_headers['access-control-allow-origin'])
            details = f"CORS Headers: {cors_headers}"
            self.log_test("CORS Configuration", success, details)
            return success
        except Exception as e:
            self.log_test("CORS Configuration", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("🔧 AEGIS PLATFORM BACKEND API TESTS")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        print()
        
        # Public endpoint tests
        self.test_api_root()
        self.test_health_endpoint()
        demo_success, demo_data = self.test_demo_setup()
        
        # Auth tests
        self.test_auth_me_without_token()
        self.test_auth_me_with_token("citizen")
        self.test_auth_me_with_token("dealer") 
        self.test_auth_me_with_token("admin")
        
        # Role-specific endpoint tests
        self.test_citizen_profile_endpoint()
        self.test_dealer_profile_endpoint()
        self.test_admin_dashboard_stats()
        
        # Infrastructure tests
        self.test_cors_headers()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "0%")
        
        if demo_success and demo_data:
            print(f"\n🔑 Demo Credentials:")
            print(f"Demo License: {demo_data.get('citizen_license', 'LIC-DEMO-001')}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AegisAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())