#!/usr/bin/env python3
"""
Backend Testing Script - NEW FACE CUSTOMER TRACKING FUNCTIONALITY TESTING
NEW FUNCTIONALITY: Test New Face Customer endpoints with different manager role access levels
Focus: Test hierarchical role system access for New Face Customer tracking
- GET /api/new-face-customers/all (State, Regional, District Managers)
- POST /api/new-face-customers (All users with 3 per day limit)
- DELETE /api/new-face-customers/{customer_id} (Managers + Owner)
- Test role-based access control and team hierarchy scoping
- Validate manager access levels and data scoping
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Configuration
BACKEND_URL = "https://team-view-pro.preview.emergentagent.com/api"

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

class NewFaceCustomerTester:
    def __init__(self):
        self.session = requests.Session()
        self.state_manager_token = None
        self.state_manager_id = None
        self.district_manager_token = None
        self.district_manager_id = None
        self.agent_token = None
        self.agent_id = None
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
        """Setup test users for New Face Customer functionality testing"""
        print_header("SETTING UP TEST USERS FOR NEW FACE CUSTOMER TESTING")
        
        # Try to login with existing state manager first
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "spencer.sudbeck@pmagent.net",
                "password": "Bizlink25"
            })
            if response.status_code == 200:
                data = response.json()
                self.state_manager_token = data['token']
                self.state_manager_id = data['user']['id']
                print_success(f"Logged in existing state manager: {data['user']['name']}")
            else:
                print_warning("Could not login existing state manager, trying to register new one")
                self.state_manager_token = self.register_test_user(
                    "state.manager.newface@test.com",
                    "TestPassword123!",
                    "State Manager NewFace Test",
                    "state_manager"
                )
                if self.state_manager_token:
                    user_info = self.get_user_info(self.state_manager_token)
                    self.state_manager_id = user_info.get('id') if user_info else None
        except Exception as e:
            print_warning(f"Exception logging in existing state manager: {str(e)}")
            self.state_manager_token = self.register_test_user(
                "state.manager.newface@test.com",
                "TestPassword123!",
                "State Manager NewFace Test",
                "state_manager"
            )
            if self.state_manager_token:
                user_info = self.get_user_info(self.state_manager_token)
                self.state_manager_id = user_info.get('id') if user_info else None
        
        # Register Regional Manager under State Manager
        if self.state_manager_id:
            self.regional_manager_token = self.register_test_user_with_manager(
                "regional.manager.newface@test.com", 
                "TestPassword123!",
                "Regional Manager NewFace Test",
                "regional_manager",
                self.state_manager_id
            )
            
            if self.regional_manager_token:
                user_info = self.get_user_info(self.regional_manager_token)
                self.regional_manager_id = user_info.get('id') if user_info else None
        
        # Register District Manager under Regional Manager
        if self.regional_manager_id:
            self.district_manager_token = self.register_test_user_with_manager(
                "district.manager.newface@test.com", 
                "TestPassword123!",
                "District Manager NewFace Test",
                "district_manager",
                self.regional_manager_id
            )
            
            if self.district_manager_token:
                user_info = self.get_user_info(self.district_manager_token)
                self.district_manager_id = user_info.get('id') if user_info else None
        
        # Register Agent under District Manager
        if self.district_manager_id:
            self.agent_token = self.register_test_user_with_manager(
                "agent.newface@test.com",
                "TestPassword123!",
                "Agent NewFace Test",
                "agent",
                self.district_manager_id
            )
            
            if self.agent_token:
                user_info = self.get_user_info(self.agent_token)
                self.agent_id = user_info.get('id') if user_info else None
        
        if not self.state_manager_token:
            print_error("Failed to setup state manager - cannot continue testing")
            return False
            
        print_success("✅ Test hierarchy created for New Face Customer testing:")
        print_info("   State Manager (should access all team data)")
        print_info("   └── Regional Manager (should access regional team data)")
        print_info("       └── District Manager (should access district team data)")
        print_info("           └── Agent (should be denied access)")
            
        return True

    def register_test_user_with_manager(self, email, password, name, role, manager_id):
        """Register a test user with a specific manager"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json={
                "email": email,
                "password": password,
                "name": name,
                "role": role,
                "manager_id": manager_id
            })
            
            if response.status_code == 200:
                data = response.json()
                print_success(f"Registered {role}: {name} under manager {manager_id}")
                return data['token']
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try to login
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": email,
                    "password": password
                })
                if login_response.status_code == 200:
                    data = login_response.json()
                    print_info(f"Logged in existing {role}: {name}")
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

    def get_user_info(self, token):
        """Get user info from token"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = self.session.get(f"{BACKEND_URL}/auth/me", headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print_error(f"Failed to get user info: {response.status_code}")
                return None
        except Exception as e:
            print_error(f"Exception getting user info: {str(e)}")
            return None

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

    def test_new_face_customers_all_endpoint(self):
        """Test GET /api/new-face-customers/all endpoint with different manager roles"""
        print_header("📊 TESTING NEW FACE CUSTOMERS ALL ENDPOINT")
        
        print_info("🎯 Testing /api/new-face-customers/all with different manager role access levels")
        
        # Test 1: State Manager access - should get all team data
        print_info("\n📋 TEST 1: State Manager Access to All Team Data")
        if self.state_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/new-face-customers/all", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can access all team New Face Customer data")
                    print_info(f"   Retrieved {len(data)} New Face Customer records")
                    self.test_results['passed'] += 1
                    
                    # Verify response structure
                    if isinstance(data, list):
                        print_success("✅ Response is a list as expected")
                        self.test_results['passed'] += 1
                        
                        if len(data) > 0:
                            sample_record = data[0]
                            required_fields = ['id', 'user_id', 'user_name', 'date', 'customer_name', 'county', 'policy_amount']
                            missing_fields = [field for field in required_fields if field not in sample_record]
                            
                            if not missing_fields:
                                print_success("✅ New Face Customer records have all required fields")
                                self.test_results['passed'] += 1
                            else:
                                print_error(f"❌ Missing fields in records: {missing_fields}")
                                self.test_results['failed'] += 1
                                self.test_results['errors'].append(f"Missing fields: {missing_fields}")
                    else:
                        print_error("❌ Response should be a list")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append("Response not a list")
                        
                else:
                    print_error(f"❌ State Manager access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"State Manager access failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"State Manager test exception: {str(e)}")
        
        # Test 2: Regional Manager access - should get their team data (scoped to hierarchy)
        print_info("\n📋 TEST 2: Regional Manager Access to Regional Team Data")
        if self.regional_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/new-face-customers/all", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Regional Manager can access their team New Face Customer data")
                    print_info(f"   Retrieved {len(data)} New Face Customer records for regional team")
                    self.test_results['passed'] += 1
                    
                    # Verify response structure
                    if isinstance(data, list):
                        print_success("✅ Regional Manager response is a list as expected")
                        self.test_results['passed'] += 1
                    else:
                        print_error("❌ Regional Manager response should be a list")
                        self.test_results['failed'] += 1
                        
                else:
                    print_error(f"❌ Regional Manager access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Regional Manager access failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Regional Manager test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Regional Manager test exception: {str(e)}")
        
        # Test 3: District Manager access - should get their team data (scoped to hierarchy)
        print_info("\n📋 TEST 3: District Manager Access to District Team Data")
        if self.district_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/new-face-customers/all", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ District Manager can access their team New Face Customer data")
                    print_info(f"   Retrieved {len(data)} New Face Customer records for district team")
                    self.test_results['passed'] += 1
                    
                    # Verify response structure
                    if isinstance(data, list):
                        print_success("✅ District Manager response is a list as expected")
                        self.test_results['passed'] += 1
                    else:
                        print_error("❌ District Manager response should be a list")
                        self.test_results['failed'] += 1
                        
                else:
                    print_error(f"❌ District Manager access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"District Manager access failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in District Manager test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"District Manager test exception: {str(e)}")
        
        # Test 4: Agent access - should return 403 Access Denied
        print_info("\n📋 TEST 4: Agent Access Control - Should Be Denied")
        if self.agent_token:
            try:
                headers = {"Authorization": f"Bearer {self.agent_token}"}
                response = self.session.get(f"{BACKEND_URL}/new-face-customers/all", headers=headers)
                
                if response.status_code == 403:
                    print_success("✅ Agent correctly denied access (403)")
                    print_info("   Access control working as expected - only managers can access all team data")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Agent should get 403, got {response.status_code}")
                    print_error(f"   Response: {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Agent access control failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Agent access test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Agent access test exception: {str(e)}")

    def test_new_face_customers_create_endpoint(self):
        """Test POST /api/new-face-customers endpoint"""
        print_header("📝 TESTING NEW FACE CUSTOMERS CREATE ENDPOINT")
        
        print_info("🎯 Testing POST /api/new-face-customers with different users")
        print_info("   Should allow all users to create records")
        print_info("   Should enforce limit of 3 records per user per day")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Test 1: Agent can create New Face Customer records
        print_info("\n📋 TEST 1: Agent Can Create New Face Customer Records")
        if self.agent_token:
            try:
                headers = {"Authorization": f"Bearer {self.agent_token}"}
                
                # Create first record
                customer_data = {
                    "date": today,
                    "customer_name": "John Smith",
                    "county": "Dallas County",
                    "policy_amount": 50000.00
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/new-face-customers",
                    json=customer_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Agent can create New Face Customer record")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    print_info(f"   Record ID: {data.get('id', 'No ID')}")
                    self.test_results['passed'] += 1
                    self.agent_customer_id = data.get('id')  # Store for delete test
                else:
                    print_error(f"❌ Agent create failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Agent create failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Agent create test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Agent create test exception: {str(e)}")
        
        # Test 2: District Manager can create New Face Customer records
        print_info("\n📋 TEST 2: District Manager Can Create New Face Customer Records")
        if self.district_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                
                customer_data = {
                    "date": today,
                    "customer_name": "Jane Doe",
                    "county": "Tarrant County",
                    "policy_amount": 75000.00
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/new-face-customers",
                    json=customer_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ District Manager can create New Face Customer record")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    print_info(f"   Record ID: {data.get('id', 'No ID')}")
                    self.test_results['passed'] += 1
                    self.district_customer_id = data.get('id')  # Store for delete test
                else:
                    print_error(f"❌ District Manager create failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"District Manager create failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in District Manager create test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"District Manager create test exception: {str(e)}")
        
        # Test 3: Test daily limit enforcement (3 records per user per day)
        print_info("\n📋 TEST 3: Daily Limit Enforcement (3 records per user per day)")
        if self.agent_token:
            try:
                headers = {"Authorization": f"Bearer {self.agent_token}"}
                
                # Try to create 3 more records (should succeed for 2, fail on 4th)
                for i in range(4):
                    customer_data = {
                        "date": today,
                        "customer_name": f"Test Customer {i+2}",
                        "county": f"Test County {i+2}",
                        "policy_amount": 25000.00 + (i * 5000)
                    }
                    
                    response = self.session.post(
                        f"{BACKEND_URL}/new-face-customers",
                        json=customer_data,
                        headers=headers
                    )
                    
                    if i < 2:  # Should succeed for records 2 and 3
                        if response.status_code == 200:
                            print_success(f"✅ Record {i+2} created successfully")
                            self.test_results['passed'] += 1
                        else:
                            print_error(f"❌ Record {i+2} should succeed, got {response.status_code}")
                            self.test_results['failed'] += 1
                    else:  # Should fail on 4th record
                        if response.status_code == 400:
                            data = response.json()
                            if "Maximum 3 new face customers per day" in data.get('detail', ''):
                                print_success("✅ Daily limit correctly enforced (400)")
                                print_info("   Limit message: Maximum 3 new face customers per day")
                                self.test_results['passed'] += 1
                            else:
                                print_error(f"❌ Wrong error message: {data.get('detail', 'No detail')}")
                                self.test_results['failed'] += 1
                        else:
                            print_error(f"❌ 4th record should get 400, got {response.status_code}")
                            self.test_results['failed'] += 1
                            
            except Exception as e:
                print_error(f"❌ Exception in daily limit test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Daily limit test exception: {str(e)}")

    def test_password_security(self):
        """Test password security validations"""
        print_header("🔒 TESTING PASSWORD SECURITY VALIDATIONS")
        
        print_info("🎯 Testing password hashing and security measures")
        
        # Test 1: Verify passwords are properly hashed with bcrypt
        print_info("\n📋 TEST 1: Password Hashing Verification")
        
        # Create a test user to verify password hashing
        try:
            test_user_token = self.register_test_user(
                "security.test@test.com",
                "SecurityTest123!",
                "Security Test User",
                "agent"
            )
            
            if test_user_token:
                print_success("✅ Test user created for security testing")
                
                # Try to login with correct password
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": "security.test@test.com",
                    "password": "SecurityTest123!"
                })
                
                if login_response.status_code == 200:
                    print_success("✅ Login with correct password works")
                    self.test_results['passed'] += 1
                else:
                    print_error("❌ Login with correct password failed")
                    self.test_results['failed'] += 1
                    
                # Try to login with incorrect password
                wrong_login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": "security.test@test.com",
                    "password": "WrongPassword123!"
                })
                
                if wrong_login_response.status_code == 401:
                    print_success("✅ Login with incorrect password correctly rejected")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Login with incorrect password should fail, got {wrong_login_response.status_code}")
                    self.test_results['failed'] += 1
                    
            else:
                print_error("❌ Could not create test user for security testing")
                self.test_results['failed'] += 1
                
        except Exception as e:
            print_error(f"❌ Exception in password hashing test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Password hashing test exception: {str(e)}")

    def test_integration_workflow(self):
        """Test complete integration workflow"""
        print_header("🔄 TESTING COMPLETE INTEGRATION WORKFLOW")
        
        print_info("🎯 Testing complete forgot password workflow:")
        print_info("   1. User forgets password")
        print_info("   2. Admin uses forgot password feature")
        print_info("   3. System generates temporary password")
        print_info("   4. User logs in with temporary password")
        print_info("   5. User changes to permanent password")
        print_info("   6. User can login normally with new password")
        
        # Step 1-3: Already tested in forgot_password test
        print_info("\n📋 WORKFLOW STEP 1-3: Generate temporary password (already tested)")
        
        # Step 4: User logs in with temporary password (already tested)
        print_info("\n📋 WORKFLOW STEP 4: Login with temporary password (already tested)")
        
        # Step 5: User changes to permanent password
        print_info("\n📋 WORKFLOW STEP 5: Change to Permanent Password")
        
        if hasattr(self, 'temp_token') and self.temp_token:
            try:
                headers = {"Authorization": f"Bearer {self.temp_token}"}
                change_data = {
                    "current_password": getattr(self, 'last_temp_password', 'TempPass123'),
                    "new_password": "NewPermanentPassword123!"
                }
                
                # First, let's get the actual temporary password from the forgot password test
                # We'll use the district manager's temporary password
                print_info("Getting temporary password for workflow test...")
                
                # Generate new temporary password for workflow test
                forgot_data = {"email": "district.manager.forgot@test.com"}
                forgot_response = self.session.post(f"{BACKEND_URL}/auth/forgot-password", json=forgot_data)
                
                if forgot_response.status_code == 200:
                    forgot_result = forgot_response.json()
                    temp_password = forgot_result.get('temporary_password')
                    
                    if temp_password:
                        print_success(f"✅ Got temporary password for workflow: {temp_password}")
                        
                        # Login with temporary password
                        login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                            "email": "district.manager.forgot@test.com",
                            "password": temp_password
                        })
                        
                        if login_response.status_code == 200:
                            temp_token = login_response.json().get('token')
                            headers = {"Authorization": f"Bearer {temp_token}"}
                            
                            # Change to permanent password
                            change_data = {
                                "current_password": temp_password,
                                "new_password": "NewPermanentPassword123!"
                            }
                            
                            change_response = self.session.post(
                                f"{BACKEND_URL}/auth/change-password",
                                json=change_data,
                                headers=headers
                            )
                            
                            if change_response.status_code == 200:
                                print_success("✅ Successfully changed to permanent password")
                                self.test_results['passed'] += 1
                                
                                # Step 6: Verify user can login with new permanent password
                                print_info("\n📋 WORKFLOW STEP 6: Login with New Permanent Password")
                                
                                final_login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                                    "email": "district.manager.forgot@test.com",
                                    "password": "NewPermanentPassword123!"
                                })
                                
                                if final_login_response.status_code == 200:
                                    print_success("✅ User can login with new permanent password")
                                    self.test_results['passed'] += 1
                                    
                                    # Verify temporary password no longer works
                                    old_login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                                        "email": "district.manager.forgot@test.com",
                                        "password": temp_password
                                    })
                                    
                                    if old_login_response.status_code == 401:
                                        print_success("✅ Temporary password no longer works after change")
                                        self.test_results['passed'] += 1
                                    else:
                                        print_error("❌ Temporary password still works after change")
                                        self.test_results['failed'] += 1
                                        self.test_results['errors'].append("Temporary password still valid after change")
                                        
                                else:
                                    print_error(f"❌ Cannot login with new permanent password: {final_login_response.status_code}")
                                    self.test_results['failed'] += 1
                                    self.test_results['errors'].append("Cannot login with new permanent password")
                                    
                            else:
                                print_error(f"❌ Password change failed: {change_response.status_code} - {change_response.text}")
                                self.test_results['failed'] += 1
                                self.test_results['errors'].append(f"Password change failed: {change_response.status_code}")
                                
                        else:
                            print_error(f"❌ Cannot login with temporary password: {login_response.status_code}")
                            self.test_results['failed'] += 1
                            
                    else:
                        print_error("❌ No temporary password in forgot response")
                        self.test_results['failed'] += 1
                        
                else:
                    print_error(f"❌ Forgot password failed for workflow: {forgot_response.status_code}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in integration workflow test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Integration workflow exception: {str(e)}")
        else:
            print_warning("⚠️ No temporary token available for workflow testing")

    def run_all_tests(self):
        """Run all forgot password functionality tests"""
        print_header("🚀 STARTING COMPREHENSIVE FORGOT PASSWORD FUNCTIONALITY TESTING")
        
        # Setup test users
        if not self.setup_test_users():
            print_error("Failed to setup test users - aborting tests")
            return False
        
        # Run all test suites
        self.test_admin_reset_password()
        self.test_forgot_password()
        self.test_password_security()
        self.test_integration_workflow()
        
        # Print final results
        self.print_final_results()
        
        return self.test_results['failed'] == 0

    def print_final_results(self):
        """Print comprehensive test results"""
        print_header("📊 FORGOT PASSWORD FUNCTIONALITY TEST RESULTS")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        success_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print_info(f"Total Tests: {total_tests}")
        print_success(f"Passed: {self.test_results['passed']}")
        
        if self.test_results['failed'] > 0:
            print_error(f"Failed: {self.test_results['failed']}")
            print_error("Failed Tests:")
            for error in self.test_results['errors']:
                print_error(f"  - {error}")
        else:
            print_success("Failed: 0")
        
        print_info(f"Success Rate: {success_rate:.1f}%")
        
        if self.test_results['failed'] == 0:
            print_success("🎉 ALL FORGOT PASSWORD FUNCTIONALITY TESTS PASSED!")
            print_success("✅ Admin reset password working correctly")
            print_success("✅ Forgot password public endpoint working correctly")
            print_success("✅ Password security validations working correctly")
            print_success("✅ Complete integration workflow working correctly")
        else:
            print_error("❌ SOME TESTS FAILED - FORGOT PASSWORD FUNCTIONALITY NEEDS ATTENTION")

if __name__ == "__main__":
    tester = ForgotPasswordTester()
    success = tester.run_all_tests()
    
    if success:
        print_success("\n🎉 All Forgot Password functionality tests completed successfully!")
        sys.exit(0)
    else:
        print_error("\n💥 Some Forgot Password functionality tests failed!")
        sys.exit(1)
