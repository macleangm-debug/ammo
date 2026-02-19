#!/usr/bin/env python3

import pytest
import requests
import sys
import json
from datetime import datetime

class TestAMMONewFeatures:
    """
    Comprehensive test suite for new AMMO features:
    1. PWA Implementation with offline support
    2. Course Enrollment Flow for members
    3. Real-time Push Notifications  
    4. SMS Environment Preparation (mocked)
    5. Dealer Marketplace enhancements (members only)
    """
    
    def __init__(self, base_url="https://compliance-check-51.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.frontend_url = "https://compliance-check-51.preview.emergentagent.com"
        self.session = requests.Session()
        self.admin_token = None
        self.citizen_token = None
        self.dealer_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        
        self.tests_run += 1
        print(f"\n🔍 {name}")
        if description:
            print(f"   {description}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        json_data = response.json()
                        if isinstance(json_data, dict) and len(json_data) <= 5:
                            print(f"   Response: {json_data}")
                    except:
                        pass
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    print(f"   Response: {response.text[:200]}")

            return success, response.json() if success and response.headers.get('content-type', '').startswith('application/json') else response.text

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_demo_setup(self):
        """Setup demo data including training courses"""
        print(f"\n{'='*60}")
        print("🏗️  DEMO SETUP")
        print(f"{'='*60}")
        
        success, response = self.run_test(
            "Demo Data Setup",
            "POST",
            "demo/setup",
            200,
            description="Creating demo users, courses, and data"
        )
        return success

    def test_demo_logins(self):
        """Test demo login system for different roles"""
        print(f"\n{'='*60}")
        print("🔐 DEMO LOGIN SYSTEM")
        print(f"{'='*60}")
        
        # Admin login
        success, response = self.run_test(
            "Admin Demo Login",
            "POST", 
            "demo/login/admin",
            200,
            description="Login as demo admin user"
        )
        
        if success:
            # Store admin credentials from cookies
            self.admin_token = self.session.cookies.get('session_token')
            print(f"   🔑 Admin session established")
        
        # Citizen login
        success, response = self.run_test(
            "Citizen Demo Login",
            "POST",
            "demo/login/citizen", 
            200,
            description="Login as demo citizen user"
        )
        
        if success:
            self.citizen_token = self.session.cookies.get('session_token')
            print(f"   🔑 Citizen session established")
        
        # Dealer login  
        success, response = self.run_test(
            "Dealer Demo Login",
            "POST",
            "demo/login/dealer",
            200,
            description="Login as demo dealer user"
        )
        
        if success:
            self.dealer_token = self.session.cookies.get('session_token')
            print(f"   🔑 Dealer session established")

        return self.admin_token is not None

    def test_pwa_assets(self):
        """Test PWA service worker and offline page accessibility"""
        print(f"\n{'='*60}")
        print("📱 PWA IMPLEMENTATION")
        print(f"{'='*60}")
        
        # Test service worker
        sw_response = requests.get(f"{self.frontend_url}/sw.js")
        sw_success = sw_response.status_code == 200
        print(f"\n🔍 Service Worker Registration")
        print(f"   GET /sw.js")
        if sw_success:
            self.tests_passed += 1 
            print(f"✅ PASSED - Status: {sw_response.status_code}")
            print(f"   Content-Type: {sw_response.headers.get('content-type')}")
        else:
            print(f"❌ FAILED - Expected 200, got {sw_response.status_code}")
        self.tests_run += 1
        
        # Test offline page
        offline_response = requests.get(f"{self.frontend_url}/offline.html")
        offline_success = offline_response.status_code == 200
        print(f"\n🔍 Offline Page")
        print(f"   GET /offline.html")
        if offline_success:
            self.tests_passed += 1
            print(f"✅ PASSED - Status: {offline_response.status_code}")
            print(f"   Content-Type: {offline_response.headers.get('content-type')}")
        else:
            print(f"❌ FAILED - Expected 200, got {offline_response.status_code}")
        self.tests_run += 1
        
        return sw_success and offline_success

    def test_member_courses_api(self):
        """Test course enrollment flow APIs"""
        print(f"\n{'='*60}")
        print("🎓 MEMBER COURSES API")
        print(f"{'='*60}")
        
        # Get available courses
        success, courses_data = self.run_test(
            "Get Training Courses",
            "GET",
            "member/courses",
            200,
            description="Retrieve all available training courses"
        )
        
        course_id = None
        if success and isinstance(courses_data, dict):
            courses = courses_data.get('courses', [])
            if courses:
                course_id = courses[0].get('course_id')
                print(f"   📚 Found {len(courses)} courses, selected: {course_id}")
        
        # Test course enrollment
        enrollment_id = None
        if course_id:
            success, enroll_data = self.run_test(
                "Enroll in Course",
                "POST",
                f"member/courses/{course_id}/enroll",
                200,
                description=f"Enroll citizen in course {course_id}"
            )
            
            if success and isinstance(enroll_data, dict):
                enrollment_id = enroll_data.get('enrollment_id')
                print(f"   📝 Enrollment created: {enrollment_id}")
        
        # Get user enrollments
        self.run_test(
            "Get User Enrollments",
            "GET",
            "member/enrollments",
            200,
            description="Retrieve user's course enrollments"
        )
        
        # Test enrollment progression if we have an enrollment
        if enrollment_id:
            # Start course
            self.run_test(
                "Start Course",
                "POST",
                f"member/enrollments/{enrollment_id}/start",
                200,
                description=f"Start enrolled course {enrollment_id}"
            )
            
            # Update progress
            self.run_test(
                "Update Progress",
                "POST",
                f"member/enrollments/{enrollment_id}/progress",
                200,
                data={"progress": 85},
                description="Update course progress to 85%"
            )
            
            # Complete course
            self.run_test(
                "Complete Course",
                "POST", 
                f"member/enrollments/{enrollment_id}/complete",
                200,
                description="Complete the course and earn ARI points"
            )
        
        return True

    def test_notifications_api(self):
        """Test push notification APIs"""
        print(f"\n{'='*60}")
        print("🔔 PUSH NOTIFICATIONS API") 
        print(f"{'='*60}")
        
        # Get notification status
        self.run_test(
            "Get Notification Status",
            "GET",
            "notifications/status",
            200,
            description="Check current push notification subscription status"
        )
        
        # Test subscribe to push notifications
        mock_subscription = {
            "subscription": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
                "keys": {
                    "p256dh": "test-p256dh-key",
                    "auth": "test-auth-key"
                }
            }
        }
        
        self.run_test(
            "Subscribe to Push Notifications",
            "POST",
            "notifications/subscribe",
            200,
            data=mock_subscription,
            description="Subscribe to push notifications with mock data"
        )
        
        return True

    def test_sms_api(self):
        """Test SMS APIs (mocked) - admin only"""
        print(f"\n{'='*60}")
        print("📱 SMS API (MOCKED)")
        print(f"{'='*60}")
        
        # Switch to admin session for SMS tests
        if self.admin_token:
            # Manually set admin session cookie
            self.session.cookies.set('session_token', self.admin_token)
            
            # Test send SMS (mocked)
            sms_data = {
                "recipients": ["+1234567890"],
                "message": "Test SMS from AMMO system",
                "type": "alert"
            }
            
            self.run_test(
                "Send SMS (Mocked)",
                "POST",
                "sms/send",
                200,
                data=sms_data,
                description="Send test SMS to phone number (mocked response)"
            )
            
            # Test SMS history
            self.run_test(
                "Get SMS History",
                "GET",
                "sms/history",
                200,
                description="Retrieve SMS history for admin"
            )
        else:
            print("⚠️  Admin session not available, skipping SMS tests")
        
        return True

    def test_marketplace_api(self):
        """Test marketplace products API"""
        print(f"\n{'='*60}")
        print("🛒 MARKETPLACE API")
        print(f"{'='*60}")
        
        # Get marketplace products
        success, products_data = self.run_test(
            "Get Marketplace Products",
            "GET", 
            "marketplace/products",
            200,
            description="Retrieve available marketplace products"
        )
        
        if success and isinstance(products_data, dict):
            products = products_data.get('products', [])
            print(f"   🛍️  Found {len(products)} marketplace products")
        
        return success

    def test_health_check(self):
        """Test basic health check"""
        print(f"\n{'='*60}")
        print("🏥 HEALTH CHECK")
        print(f"{'='*60}")
        
        self.run_test(
            "API Health Check",
            "GET",
            "health",
            200,
            description="Verify API is responding"
        )
        
        self.run_test(
            "API Root",
            "GET", 
            "",
            200,
            description="Test root API endpoint"
        )
        
        return True

    def run_all_tests(self):
        """Run complete test suite"""
        print(f"\n{'🚀'*20}")
        print("AMMO NEW FEATURES TEST SUITE")
        print(f"Backend URL: {self.base_url}")
        print(f"Frontend URL: {self.frontend_url}")
        print(f"{'🚀'*20}\n")
        
        try:
            # Run tests in order
            self.test_health_check()
            self.test_demo_setup()
            self.test_demo_logins()
            self.test_pwa_assets()
            self.test_member_courses_api()
            self.test_notifications_api()
            self.test_sms_api()
            self.test_marketplace_api()
            
        except KeyboardInterrupt:
            print("\n\n⏹️  Test suite interrupted by user")
        except Exception as e:
            print(f"\n\n💥 Test suite failed with error: {str(e)}")
        
        # Print final results
        print(f"\n{'='*60}")
        print("📊 FINAL RESULTS")
        print(f"{'='*60}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📋 Total Tests: {self.tests_run}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        return self.tests_passed, self.tests_run

def main():
    """Main test execution"""
    tester = TestAMMONewFeatures()
    passed, total = tester.run_all_tests()
    
    # Return exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())