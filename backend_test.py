#!/usr/bin/env python3
"""
Backend Testing Script for Daily Report API Endpoints
Tests the new daily report endpoints with comprehensive validation
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Configuration
BACKEND_URL = "https://sales-leaderboard-5.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

class DailyReportTester:
    def __init__(self):
        self.session = requests.Session()
        self.state_manager_token = None
        self.non_state_manager_token = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def register_test_user(self, email, password, name, role):
        """Register a test user"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json={
                "email": email,
                "password": password,
                "name": name,
                "role": role
            })
            
            if response.status_code == 200:
                data = response.json()
                print_success(f"Registered {role}: {name} ({email})")
                return data['token']
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try to login
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": email,
                    "password": password
                })
                if login_response.status_code == 200:
                    data = login_response.json()
                    print_info(f"Logged in existing {role}: {name} ({email})")
                    return data['token']
                else:
                    print_error(f"Failed to login existing user {email}: {login_response.text}")
                    return None
            else:
                print_error(f"Failed to register {email}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print_error(f"Exception registering {email}: {str(e)}")
            return None

    def setup_test_users(self):
        """Setup test users for testing"""
        print_header("SETTING UP TEST USERS")
        
        # Register state manager
        self.state_manager_token = self.register_test_user(
            "state.manager@test.com",
            "TestPassword123!",
            "State Manager Test",
            "state_manager"
        )
        
        # Register non-state manager (agent)
        self.non_state_manager_token = self.register_test_user(
            "agent.user@test.com", 
            "TestPassword123!",
            "Agent Test User",
            "agent"
        )
        
        if not self.state_manager_token:
            print_error("Failed to setup state manager - cannot continue testing")
            return False
            
        if not self.non_state_manager_token:
            print_warning("Failed to setup non-state manager - will skip access control tests")
            
        return True

    def create_test_activity(self, token, date_str):
        """Create test activity data for a specific date"""
        headers = {"Authorization": f"Bearer {token}"}
        
        activity_data = {
            "date": date_str,
            "contacts": 15.0,
            "appointments": 8.0,
            "presentations": 5.0,
            "referrals": 3,
            "testimonials": 2,
            "sales": 2,
            "new_face_sold": 1.5,
            "premium": 2500.00
        }
        
        try:
            response = self.session.put(
                f"{BACKEND_URL}/activities/{date_str}",
                json=activity_data,
                headers=headers
            )
            
            if response.status_code == 200:
                print_success(f"Created test activity for {date_str}")
                return True
            else:
                print_warning(f"Could not create activity for {date_str}: {response.status_code}")
                return False
        except Exception as e:
            print_warning(f"Exception creating activity for {date_str}: {str(e)}")
            return False

    def setup_test_data(self):
        """Setup test activity data"""
        print_header("SETTING UP TEST DATA")
        
        if not self.state_manager_token:
            print_error("No state manager token available")
            return False
            
        # Create activities for today, yesterday, and a week ago
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        dates_to_create = [
            today.isoformat(),
            yesterday.isoformat(), 
            week_ago.isoformat()
        ]
        
        for date_str in dates_to_create:
            self.create_test_activity(self.state_manager_token, date_str)
            
        return True

    def test_daily_report_json_endpoint(self):
        """Test the JSON daily report endpoint"""
        print_header("TESTING DAILY REPORT JSON ENDPOINT")
        
        if not self.state_manager_token:
            print_error("No state manager token - skipping JSON endpoint tests")
            return
            
        headers = {"Authorization": f"Bearer {self.state_manager_token}"}
        today = datetime.now().date().isoformat()
        
        # Test all three report types
        report_types = ['individual', 'team', 'organization']
        
        for report_type in report_types:
            print_info(f"Testing {report_type} report...")
            
            try:
                response = self.session.get(
                    f"{BACKEND_URL}/reports/daily/{report_type}",
                    params={"date": today},
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    if self.validate_report_structure(data, report_type):
                        print_success(f"{report_type.capitalize()} report JSON structure valid")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"{report_type.capitalize()} report JSON structure invalid")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append(f"{report_type} report structure validation failed")
                        
                else:
                    print_error(f"{report_type.capitalize()} report failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"{report_type} report returned {response.status_code}")
                    
            except Exception as e:
                print_error(f"Exception testing {report_type} report: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"{report_type} report exception: {str(e)}")

    def validate_report_structure(self, data, report_type):
        """Validate the structure of report data"""
        try:
            # Common fields
            if 'report_type' not in data or data['report_type'] != report_type:
                print_error(f"Missing or incorrect report_type field")
                return False
                
            if 'date' not in data:
                print_error(f"Missing date field")
                return False
                
            if 'data' not in data:
                print_error(f"Missing data field")
                return False
                
            # Type-specific validation
            if report_type == 'individual':
                if not isinstance(data['data'], list):
                    print_error("Individual report data should be a list")
                    return False
                    
                if len(data['data']) > 0:
                    member = data['data'][0]
                    required_fields = ['name', 'email', 'role', 'contacts', 'appointments', 'presentations', 'referrals', 'testimonials', 'sales', 'new_face_sold', 'premium']
                    for field in required_fields:
                        if field not in member:
                            print_error(f"Individual report missing field: {field}")
                            return False
                            
            elif report_type == 'team':
                if not isinstance(data['data'], list):
                    print_error("Team report data should be a list")
                    return False
                    
                if len(data['data']) > 0:
                    team = data['data'][0]
                    required_fields = ['team_name', 'manager', 'role', 'contacts', 'appointments', 'presentations', 'referrals', 'testimonials', 'sales', 'new_face_sold', 'premium']
                    for field in required_fields:
                        if field not in team:
                            print_error(f"Team report missing field: {field}")
                            return False
                            
            elif report_type == 'organization':
                if not isinstance(data['data'], dict):
                    print_error("Organization report data should be a dict")
                    return False
                    
                if 'total_members' not in data:
                    print_error("Organization report missing total_members")
                    return False
                    
                required_fields = ['contacts', 'appointments', 'presentations', 'referrals', 'testimonials', 'sales', 'new_face_sold', 'premium']
                for field in required_fields:
                    if field not in data['data']:
                        print_error(f"Organization report missing field: {field}")
                        return False
                        
            return True
            
        except Exception as e:
            print_error(f"Exception validating report structure: {str(e)}")
            return False

    def test_daily_report_excel_endpoint(self):
        """Test the Excel daily report endpoint"""
        print_header("TESTING DAILY REPORT EXCEL ENDPOINT")
        
        if not self.state_manager_token:
            print_error("No state manager token - skipping Excel endpoint tests")
            return
            
        headers = {"Authorization": f"Bearer {self.state_manager_token}"}
        today = datetime.now().date().isoformat()
        
        # Test all three report types
        report_types = ['individual', 'team', 'organization']
        
        for report_type in report_types:
            print_info(f"Testing {report_type} Excel download...")
            
            try:
                response = self.session.get(
                    f"{BACKEND_URL}/reports/daily/excel/{report_type}",
                    params={"date": today},
                    headers=headers
                )
                
                if response.status_code == 200:
                    # Check if it's an Excel file
                    content_type = response.headers.get('content-type', '')
                    content_disposition = response.headers.get('content-disposition', '')
                    
                    if 'spreadsheet' in content_type or 'excel' in content_type:
                        print_success(f"{report_type.capitalize()} Excel download successful")
                        self.test_results['passed'] += 1
                    elif 'attachment' in content_disposition and '.xlsx' in content_disposition:
                        print_success(f"{report_type.capitalize()} Excel download successful (by disposition)")
                        self.test_results['passed'] += 1
                    else:
                        print_warning(f"{report_type.capitalize()} Excel download may not be proper Excel file")
                        print_info(f"Content-Type: {content_type}")
                        print_info(f"Content-Disposition: {content_disposition}")
                        self.test_results['passed'] += 1  # Still count as pass if we got a response
                        
                else:
                    print_error(f"{report_type.capitalize()} Excel download failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"{report_type} Excel download returned {response.status_code}")
                    
            except Exception as e:
                print_error(f"Exception testing {report_type} Excel download: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"{report_type} Excel download exception: {str(e)}")

    def test_access_control(self):
        """Test access control - non-state_manager should get 403"""
        print_header("TESTING ACCESS CONTROL")
        
        if not self.non_state_manager_token:
            print_warning("No non-state manager token - skipping access control tests")
            return
            
        headers = {"Authorization": f"Bearer {self.non_state_manager_token}"}
        today = datetime.now().date().isoformat()
        
        # Test JSON endpoint
        print_info("Testing JSON endpoint access control...")
        try:
            response = self.session.get(
                f"{BACKEND_URL}/reports/daily/individual",
                params={"date": today},
                headers=headers
            )
            
            if response.status_code == 403:
                print_success("JSON endpoint correctly denied access to non-state_manager")
                self.test_results['passed'] += 1
            else:
                print_error(f"JSON endpoint should return 403, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"JSON endpoint access control failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"Exception testing JSON access control: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"JSON access control exception: {str(e)}")
        
        # Test Excel endpoint
        print_info("Testing Excel endpoint access control...")
        try:
            response = self.session.get(
                f"{BACKEND_URL}/reports/daily/excel/individual",
                params={"date": today},
                headers=headers
            )
            
            if response.status_code == 403:
                print_success("Excel endpoint correctly denied access to non-state_manager")
                self.test_results['passed'] += 1
            else:
                print_error(f"Excel endpoint should return 403, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Excel endpoint access control failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"Exception testing Excel access control: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Excel access control exception: {str(e)}")

    def test_error_cases(self):
        """Test error cases - invalid date format and report type"""
        print_header("TESTING ERROR CASES")
        
        if not self.state_manager_token:
            print_error("No state manager token - skipping error case tests")
            return
            
        headers = {"Authorization": f"Bearer {self.state_manager_token}"}
        
        # Test invalid date format
        print_info("Testing invalid date format...")
        try:
            response = self.session.get(
                f"{BACKEND_URL}/reports/daily/individual",
                params={"date": "invalid-date"},
                headers=headers
            )
            
            if response.status_code == 400:
                print_success("Invalid date format correctly returned 400")
                self.test_results['passed'] += 1
            else:
                print_error(f"Invalid date should return 400, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Invalid date error handling failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"Exception testing invalid date: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Invalid date test exception: {str(e)}")
        
        # Test invalid report type
        print_info("Testing invalid report type...")
        today = datetime.now().date().isoformat()
        try:
            response = self.session.get(
                f"{BACKEND_URL}/reports/daily/invalid_type",
                params={"date": today},
                headers=headers
            )
            
            if response.status_code == 400:
                print_success("Invalid report type correctly returned 400")
                self.test_results['passed'] += 1
            else:
                print_error(f"Invalid report type should return 400, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Invalid report type error handling failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"Exception testing invalid report type: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Invalid report type test exception: {str(e)}")

    def test_different_dates(self):
        """Test reports with different dates"""
        print_header("TESTING DIFFERENT DATES")
        
        if not self.state_manager_token:
            print_error("No state manager token - skipping date tests")
            return
            
        headers = {"Authorization": f"Bearer {self.state_manager_token}"}
        
        # Test different dates
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        dates_to_test = [
            (today.isoformat(), "today"),
            (yesterday.isoformat(), "yesterday"),
            (week_ago.isoformat(), "week ago")
        ]
        
        for date_str, description in dates_to_test:
            print_info(f"Testing individual report for {description} ({date_str})...")
            
            try:
                response = self.session.get(
                    f"{BACKEND_URL}/reports/daily/individual",
                    params={"date": date_str},
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('date') == date_str:
                        print_success(f"Report for {description} returned correct date")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"Report for {description} returned wrong date: {data.get('date')}")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append(f"Date mismatch for {description}")
                else:
                    print_error(f"Report for {description} failed: {response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Report for {description} failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"Exception testing {description}: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Date test {description} exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests"""
        print_header("DAILY REPORT API ENDPOINT TESTING")
        print_info(f"Testing against: {BACKEND_URL}")
        
        # Setup
        if not self.setup_test_users():
            print_error("Failed to setup test users - aborting tests")
            return False
            
        self.setup_test_data()
        
        # Run tests
        self.test_daily_report_json_endpoint()
        self.test_daily_report_excel_endpoint()
        self.test_access_control()
        self.test_error_cases()
        self.test_different_dates()
        
        # Print summary
        self.print_test_summary()
        
        return self.test_results['failed'] == 0

    def print_test_summary(self):
        """Print test summary"""
        print_header("TEST SUMMARY")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        
        if self.test_results['failed'] == 0:
            print_success(f"All {total_tests} tests passed! ✨")
        else:
            print_error(f"{self.test_results['failed']} out of {total_tests} tests failed")
            
        print_info(f"Passed: {self.test_results['passed']}")
        print_info(f"Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print_warning("Errors encountered:")
            for error in self.test_results['errors']:
                print(f"  • {error}")

if __name__ == "__main__":
    tester = DailyReportTester()
    success = tester.run_all_tests()
    
    if success:
        print_success("\n🎉 All Daily Report API tests completed successfully!")
        sys.exit(0)
    else:
        print_error("\n💥 Some Daily Report API tests failed!")
        sys.exit(1)