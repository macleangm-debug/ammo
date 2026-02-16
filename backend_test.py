#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class AMNONewFeaturesTest:
    """
    Test suite specifically for the NEW features added:
    1. VAPID push notification system
    2. Marketplace products seeding (30+ products goal)
    3. PDF certificate generation and download
    """
    
    def __init__(self, base_url="https://ammo-pull.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.citizen_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.enrollment_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    json_data = response.json()
                    if isinstance(json_data, dict) and len(str(json_data)) < 200:
                        print(f"   Response: {json_data}")
                    return success, json_data
                except:
                    return success, response.text
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def setup_demo_and_login(self):
        """Setup demo data and login as admin"""
        print(f"\n{'='*60}")
        print("🏗️  SETUP AND AUTHENTICATION")
        print(f"{'='*60}")
        
        # Setup demo data
        success, _ = self.run_test("Demo Setup", "POST", "demo/setup", 200)
        if not success:
            print("⚠️  Demo setup failed, continuing anyway...")
        
        # Login as admin
        success, response = self.run_test("Admin Login", "POST", "demo/login/admin", 200)
        if success:
            self.admin_token = self.session.cookies.get('session_token')
            print(f"   🔑 Admin session established")
        
        # Login as citizen for certificate testing
        success, response = self.run_test("Citizen Login", "POST", "demo/login/citizen", 200)
        if success:
            self.citizen_token = self.session.cookies.get('session_token')
            print(f"   🔑 Citizen session established")
        
        return self.admin_token is not None

    def test_vapid_push_notifications(self):
        """Test NEW VAPID push notification features"""
        print(f"\n{'='*60}")
        print("🔔 VAPID PUSH NOTIFICATIONS (NEW FEATURE)")
        print(f"{'='*60}")
        
        # Test VAPID public key endpoint
        success, response = self.run_test(
            "GET VAPID Public Key", 
            "GET", 
            "push/vapid-public-key", 
            200
        )
        
        vapid_key = None
        if success and isinstance(response, dict):
            vapid_key = response.get('publicKey')
            if vapid_key:
                print(f"   🔑 VAPID key received: {vapid_key[:20]}...")
        
        # Test push subscription with VAPID
        mock_subscription = {
            "subscription": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-vapid-endpoint", 
                "keys": {
                    "p256dh": "test-p256dh-vapid-key",
                    "auth": "test-auth-vapid-key"
                }
            }
        }
        
        self.run_test(
            "POST Push Subscribe (VAPID)", 
            "POST", 
            "push/subscribe", 
            200, 
            data=mock_subscription
        )
        
        # Test admin-only push send
        if self.admin_token:
            self.session.cookies.set('session_token', self.admin_token)
            
            push_message = {
                "user_id": "demo_citizen_001",
                "title": "Test VAPID Notification",
                "body": "Testing new VAPID push system",
                "icon": "/icons/icon-192x192.png"
            }
            
            self.run_test(
                "POST Push Send (Admin Only)", 
                "POST", 
                "push/send", 
                200,
                data=push_message
            )
            
            # Test broadcast push
            broadcast_message = {
                "title": "AMMO System Alert", 
                "body": "Testing VAPID broadcast functionality",
                "icon": "/icons/icon-192x192.png"
            }
            
            self.run_test(
                "POST Push Broadcast (Admin Only)",
                "POST", 
                "push/broadcast",
                200,
                data=broadcast_message
            )
        else:
            print("⚠️  Admin session not available, skipping admin-only push tests")

    def test_marketplace_seeding(self):
        """Test NEW marketplace product seeding feature"""
        print(f"\n{'='*60}")
        print("🛒 MARKETPLACE PRODUCT SEEDING (NEW FEATURE)")
        print(f"{'='*60}")
        
        # First check current product count
        success, products_response = self.run_test(
            "GET Products (Before Seeding)",
            "GET",
            "marketplace/products", 
            200
        )
        
        initial_count = 0
        if success and isinstance(products_response, dict):
            products = products_response.get('products', [])
            initial_count = len(products)
            print(f"   📦 Current products: {initial_count}")
        
        # Test admin-only seed products endpoint  
        if self.admin_token:
            self.session.cookies.set('session_token', self.admin_token)
            
            self.run_test(
                "POST Seed Products (Admin Only)",
                "POST", 
                "marketplace/seed-products",
                200
            )
            
            # Check products after seeding
            success, products_response = self.run_test(
                "GET Products (After Seeding)",
                "GET",
                "marketplace/products",
                200 
            )
            
            if success and isinstance(products_response, dict):
                products = products_response.get('products', [])
                final_count = len(products)
                print(f"   📦 Products after seeding: {final_count}")
                
                # Check if we achieved the 30+ products goal
                if final_count >= 30:
                    print(f"✅ Goal achieved: {final_count} products (target: 30+)")
                else:
                    print(f"⚠️  Goal not met: {final_count} products (target: 30+)")
                    
                # Show sample products
                if products:
                    print(f"   Sample products:")
                    for i, product in enumerate(products[:3]):
                        print(f"     • {product.get('name', 'Unknown')} - ${product.get('price', 0)}")
        else:
            print("⚠️  Admin session not available, skipping seed products test")

    def test_pdf_certificates(self):
        """Test NEW PDF certificate generation and download"""
        print(f"\n{'='*60}")
        print("📜 PDF CERTIFICATE GENERATION (NEW FEATURE)")  
        print(f"{'='*60}")
        
        # Switch to citizen session for course enrollment
        if self.citizen_token:
            self.session.cookies.set('session_token', self.citizen_token)
            
            # Get available courses
            success, courses_data = self.run_test(
                "GET Available Courses",
                "GET",
                "member/courses",
                200
            )
            
            course_id = None
            if success and isinstance(courses_data, dict):
                courses = courses_data.get('courses', [])
                if courses:
                    course_id = courses[0].get('course_id')
                    print(f"   📚 Selected course: {course_id}")
            
            # Complete a course enrollment to test certificate generation
            if course_id:
                # Enroll in course
                success, enroll_data = self.run_test(
                    "POST Enroll in Course",
                    "POST",
                    f"member/courses/{course_id}/enroll", 
                    200
                )
                
                enrollment_id = None
                if success and isinstance(enroll_data, dict):
                    enrollment_id = enroll_data.get('enrollment_id')
                    self.enrollment_id = enrollment_id
                    print(f"   📝 Enrollment ID: {enrollment_id}")
                
                # Start course
                if enrollment_id:
                    self.run_test(
                        "POST Start Course",
                        "POST",
                        f"member/enrollments/{enrollment_id}/start",
                        200
                    )
                    
                    # Update progress to 100%
                    self.run_test(
                        "POST Update Progress (100%)",
                        "POST", 
                        f"member/enrollments/{enrollment_id}/progress",
                        200,
                        data={"progress": 100}
                    )
                    
                    # Complete course (should generate certificate)
                    success, complete_data = self.run_test(
                        "POST Complete Course (Generate Certificate)",
                        "POST",
                        f"member/enrollments/{enrollment_id}/complete",
                        200
                    )
                    
                    if success:
                        print(f"   🏆 Course completed, certificate should be generated")
                        
                        # Wait a moment for certificate generation
                        time.sleep(2)
                        
                        # Test PDF certificate download
                        self.run_test(
                            "GET Certificate PDF Download",
                            "GET", 
                            f"member/certificates/{enrollment_id}",
                            200
                        )
            else:
                print("⚠️  No courses available for certificate testing")
        else:
            print("⚠️  Citizen session not available, skipping certificate tests")

    def run_all_tests(self):
        """Run all new feature tests"""
        print(f"\n{'🚀'*20}")
        print("AMMO NEW FEATURES TEST SUITE") 
        print(f"Testing: VAPID Push, Marketplace Seeding, PDF Certificates")
        print(f"Backend URL: {self.base_url}")
        print(f"{'🚀'*20}")
        
        try:
            # Setup
            if not self.setup_demo_and_login():
                print("❌ Setup failed, some tests may not work properly")
            
            # Test new features
            self.test_vapid_push_notifications()
            self.test_marketplace_seeding()
            self.test_pdf_certificates()
            
        except KeyboardInterrupt:
            print("\n\n⏹️  Test interrupted by user")
        except Exception as e:
            print(f"\n\n💥 Test failed with error: {str(e)}")
        
        # Results
        print(f"\n{'='*60}")
        print("📊 TEST RESULTS")
        print(f"{'='*60}")
        print(f"✅ Passed: {self.tests_passed}")
        print(f"❌ Failed: {self.tests_run - self.tests_passed}")
        print(f"📋 Total: {self.tests_run}")
        success_rate = (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed, self.tests_run

def main():
    """Main test execution"""
    tester = AMNONewFeaturesTest()
    passed, total = tester.run_all_tests()
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
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

    def test_responsibility_endpoint(self):
        """Test new AMMO Responsibility endpoint"""
        # Use provided test token first
        headers = {"Authorization": f"Bearer {self.test_citizen_token}"}
        try:
            response = self.session.get(f"{self.api_url}/citizen/responsibility", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                ari_score = data.get('ari_score', 0)
                tier = data.get('tier', {})
                tier_name = tier.get('name', 'Unknown')
                details += f", ARI Score: {ari_score}, Tier: {tier_name}"
                # Check tier ranges
                if tier_name in ["Sentinel", "Guardian", "Elite Custodian"]:
                    details += " [✓ Valid Tier]"
                else:
                    details += " [⚠ Invalid Tier]"
                    success = False
            self.log_test("AMMO Responsibility Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("AMMO Responsibility Endpoint", False, str(e))
            return False

    def test_complete_challenge_endpoint(self):
        """Test complete challenge endpoint"""
        headers = {"Authorization": f"Bearer {self.test_citizen_token}"}
        try:
            # Try to complete a training challenge
            challenge_data = {"challenge_id": "refresher_course"}
            response = self.session.post(f"{self.api_url}/citizen/complete-challenge", 
                                       headers=headers, json=challenge_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                message = data.get('message', '')
                ari_boost = data.get('ari_boost', 0)
                details += f", Message: {message}, ARI Boost: +{ari_boost}"
            self.log_test("Complete Challenge Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Complete Challenge Endpoint", False, str(e))
            return False

    def test_verify_safe_storage_endpoint(self):
        """Test verify safe storage endpoint"""
        headers = {"Authorization": f"Bearer {self.test_citizen_token}"}
        try:
            response = self.session.post(f"{self.api_url}/citizen/verify-safe-storage", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                message = data.get('message', '')
                new_badge = data.get('new_badge')
                details += f", Message: {message}"
                if new_badge:
                    details += f", New Badge: {new_badge.get('name', 'Unknown')}"
            self.log_test("Verify Safe Storage Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Verify Safe Storage Endpoint", False, str(e))
            return False

    def test_log_training_endpoint(self):
        """Test log training hours endpoint"""
        headers = {"Authorization": f"Bearer {self.test_citizen_token}"}
        try:
            training_data = {
                "hours": 2,
                "module_id": "basic_safety",
                "module_name": "Basic Safety Training"
            }
            response = self.session.post(f"{self.api_url}/citizen/log-training", 
                                       headers=headers, json=training_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                message = data.get('message', '')
                total_hours = data.get('total_hours', 0)
                new_badges = data.get('new_badges', [])
                details += f", Message: {message}, Total Hours: {total_hours}"
                if new_badges:
                    details += f", New Badges: {len(new_badges)}"
            self.log_test("Log Training Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Log Training Endpoint", False, str(e))
            return False

    def test_training_leaderboard_endpoint(self):
        """Test admin training leaderboard endpoint"""
        headers = {"Authorization": f"Bearer {self.test_admin_token}"}
        try:
            response = self.session.get(f"{self.api_url}/admin/training-leaderboard", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                leaderboard = data.get('leaderboard', [])
                ranked_by = data.get('ranked_by', '')
                note = data.get('note', '')
                details += f", Entries: {len(leaderboard)}, Ranked by: {ranked_by}"
                # Verify it's NOT ranked by purchase volume
                if 'purchase' not in ranked_by.lower() and 'volume' not in ranked_by.lower():
                    details += " [✓ Not purchase-based]"
                else:
                    details += " [⚠ Still purchase-based]"
                    success = False
            self.log_test("Training Leaderboard Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Training Leaderboard Endpoint", False, str(e))
            return False
    
    def test_gamification_api(self):
        """Test legacy gamification API endpoints (should redirect to responsibility system)"""
        headers = {"Authorization": f"Bearer {self.test_citizen_token}"}
        try:
            response = self.session.get(f"{self.api_url}/citizen/gamification", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                points = data.get('points', 0)
                ari_score = data.get('ari_score', 0)
                note = data.get('note', '')
                details += f", Points/ARI: {points}, Legacy Redirect: {bool(note)}"
                # Check if it's redirecting to new system
                if 'AMMO rewards responsible behavior' in note:
                    details += " [✓ Redirects to AMMO system]"
                else:
                    details += " [⚠ Still old system]"
            self.log_test("Legacy Gamification API", success, details)
            return success
        except Exception as e:
            self.log_test("Legacy Gamification API", False, str(e))
            return False
    
    def test_daily_checkin_api(self):
        """Test daily check-in API endpoint"""
        if not self.citizen_token:
            success, token = self.test_auth_me_with_token("citizen")
            if not success:
                self.log_test("Daily Check-in API", False, "No valid citizen token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.citizen_token}"}
            response = self.session.post(f"{self.api_url}/citizen/check-in", headers=headers)
            # Can return 200 (successful check-in) or info message (already checked in)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', '')}, Streak: {data.get('streak', 0)}"
            self.log_test("Daily Check-in API", success, details)
            return success
        except Exception as e:
            self.log_test("Daily Check-in API", False, str(e))
            return False
    
    def test_license_alerts_api(self):
        """Test license alerts API endpoint"""
        if not self.citizen_token:
            success, token = self.test_auth_me_with_token("citizen")
            if not success:
                self.log_test("License Alerts API", False, "No valid citizen token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.citizen_token}"}
            response = self.session.get(f"{self.api_url}/citizen/license-alerts", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                alerts_count = len(data.get('alerts', []))
                details += f", Alerts: {alerts_count}, Days until expiry: {data.get('days_until_expiry', 'N/A')}"
            self.log_test("License Alerts API", success, details)
            return success
        except Exception as e:
            self.log_test("License Alerts API", False, str(e))
            return False
    
    def test_geographic_heatmap_api(self):
        """Test geographic heatmap API endpoint"""
        if not self.admin_token:
            success, token = self.test_auth_me_with_token("admin")
            if not success:
                self.log_test("Geographic Heatmap API", False, "No valid admin token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{self.api_url}/admin/heatmap/geographic", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                if isinstance(data, list):
                    details += f", Location points: {len(data)}"
                    if data:
                        details += f", Sample point: lat={data[0].get('lat', 'N/A')}, lng={data[0].get('lng', 'N/A')}"
                else:
                    details += ", Data: Invalid format"
            self.log_test("Geographic Heatmap API", success, details)
            return success
        except Exception as e:
            self.log_test("Geographic Heatmap API", False, str(e))
            return False
    
    def test_temporal_heatmap_api(self):
        """Test temporal heatmap API endpoint"""
        if not self.admin_token:
            success, token = self.test_auth_me_with_token("admin")
            if not success:
                self.log_test("Temporal Heatmap API", False, "No valid admin token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{self.api_url}/admin/heatmap/temporal", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                if isinstance(data, list):
                    details += f", Data cells: {len(data)} (Expected: 168 for 7 days x 24 hours)"
                    # Check if we have the expected 168 cells (7 days × 24 hours)
                    if len(data) == 168:
                        details += " ✓"
                    else:
                        details += f" (Expected 168, got {len(data)})"
                else:
                    details += ", Data: Invalid format"
                    success = False
            self.log_test("Temporal Heatmap API", success, details)
            return success
        except Exception as e:
            self.log_test("Temporal Heatmap API", False, str(e))
            return False
    
    def test_push_notification_subscribe_api(self):
        """Test push notification subscription API"""
        if not self.citizen_token:
            success, token = self.test_auth_me_with_token("citizen")
            if not success:
                self.log_test("Push Notification Subscribe API", False, "No valid citizen token")
                return False
                
        try:
            headers = {"Authorization": f"Bearer {self.citizen_token}"}
            # Mock subscription data
            subscription_data = {
                "subscription": {
                    "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
                    "keys": {
                        "p256dh": "test-p256dh-key",
                        "auth": "test-auth-key"
                    }
                }
            }
            response = self.session.post(f"{self.api_url}/notifications/subscribe", 
                                       headers=headers, json=subscription_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', '')}"
            self.log_test("Push Notification Subscribe API", success, details)
            return success
        except Exception as e:
            self.log_test("Push Notification Subscribe API", False, str(e))
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
        print("🔧 AMMO PLATFORM BACKEND API TESTS")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        print(f"Test Citizen Token: {self.test_citizen_token[:20]}...")
        print(f"Test Admin Token: {self.test_admin_token[:20]}...")
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
        
        # NEW AMMO RESPONSIBILITY SYSTEM TESTS
        print("\n🎯 AMMO RESPONSIBILITY SYSTEM TESTING:")
        print("-" * 40)
        self.test_responsibility_endpoint()
        self.test_complete_challenge_endpoint()
        self.test_verify_safe_storage_endpoint()
        self.test_log_training_endpoint()
        self.test_training_leaderboard_endpoint()
        
        # Legacy gamification (should redirect to new system)
        print("\n🔄 LEGACY GAMIFICATION (Should Redirect):")
        print("-" * 40)
        self.test_gamification_api()
        
        # Phase 2 Features Tests
        print("\n🚀 OTHER FEATURES TESTING:")
        print("-" * 40)
        self.test_daily_checkin_api() 
        self.test_license_alerts_api()
        self.test_geographic_heatmap_api()
        self.test_temporal_heatmap_api()
        self.test_push_notification_subscribe_api()
        
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
    tester = AmmoAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())