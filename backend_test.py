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
    
    def __init__(self, base_url="https://ammo-doc-verify.preview.emergentagent.com/api"):
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