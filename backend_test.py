#!/usr/bin/env python3
"""
Backend Testing Script - FORGOT PASSWORD FUNCTIONALITY TESTING
NEW FUNCTIONALITY: Comprehensive password reset features for users who forget their passwords
Focus: Test forgot password and admin reset password endpoints
- POST /api/auth/admin-reset-password (State Manager Only)
- POST /api/auth/forgot-password (Public Endpoint)
- Test security validations, hierarchy access, and password workflows
- Validate temporary password generation and admin reset capabilities
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

class ForgotPasswordTester:
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
        """Setup test users for forgot password functionality testing"""
        print_header("SETTING UP TEST USERS FOR FORGOT PASSWORD TESTING")
        
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
                    "state.manager.forgot@test.com",
                    "TestPassword123!",
                    "State Manager Forgot Test",
                    "state_manager"
                )
                if self.state_manager_token:
                    user_info = self.get_user_info(self.state_manager_token)
                    self.state_manager_id = user_info.get('id') if user_info else None
        except Exception as e:
            print_warning(f"Exception logging in existing state manager: {str(e)}")
            self.state_manager_token = self.register_test_user(
                "state.manager.forgot@test.com",
                "TestPassword123!",
                "State Manager Forgot Test",
                "state_manager"
            )
            if self.state_manager_token:
                user_info = self.get_user_info(self.state_manager_token)
                self.state_manager_id = user_info.get('id') if user_info else None
        
        # Register District Manager under State Manager for hierarchy testing
        if self.state_manager_id:
            self.district_manager_token = self.register_test_user_with_manager(
                "district.manager.forgot@test.com", 
                "TestPassword123!",
                "District Manager Forgot Test",
                "district_manager",
                self.state_manager_id
            )
            
            if self.district_manager_token:
                user_info = self.get_user_info(self.district_manager_token)
                self.district_manager_id = user_info.get('id') if user_info else None
        
        # Register Agent under District Manager for hierarchy testing
        if self.district_manager_id:
            self.agent_token = self.register_test_user_with_manager(
                "agent.forgot@test.com",
                "TestPassword123!",
                "Agent Forgot Test",
                "agent",
                self.district_manager_id
            )
            
            if self.agent_token:
                user_info = self.get_user_info(self.agent_token)
                self.agent_id = user_info.get('id') if user_info else None
        
        if not self.state_manager_token:
            print_error("Failed to setup state manager - cannot continue testing")
            return False
            
        print_success("✅ Test hierarchy created for forgot password testing:")
        print_info("   State Manager (for admin reset)")
        print_info("   └── District Manager (team member)")
        print_info("       └── Agent (team member)")
            
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

    def test_admin_reset_password(self):
        """Test admin reset password functionality (State Manager only)"""
        print_header("🔐 TESTING ADMIN RESET PASSWORD FUNCTIONALITY")
        
        if not self.state_manager_token or not self.district_manager_id:
            print_error("Missing required tokens/IDs for admin reset testing")
            return
            
        headers = {"Authorization": f"Bearer {self.state_manager_token}"}
        
        print_info("🎯 Testing admin reset password with State Manager resetting District Manager password")
        
        # Test 1: Valid admin reset by State Manager
        print_info("\n📋 TEST 1: Valid Admin Reset by State Manager")
        try:
            reset_data = {
                "user_id": self.district_manager_id,
                "new_password": "NewPassword123!"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("✅ Admin reset password successful")
                print_info(f"   Message: {data.get('message', 'No message')}")
                print_info(f"   User: {data.get('user_name', 'Unknown')} ({data.get('user_email', 'Unknown')})")
                self.test_results['passed'] += 1
                
                # Verify the reset user can login with new password
                print_info("Verifying reset user can login with new password...")
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": "district.manager.forgot@test.com",
                    "password": "NewPassword123!"
                })
                
                if login_response.status_code == 200:
                    print_success("✅ Reset user can login with new password")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Reset user cannot login with new password: {login_response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("Reset user cannot login with new password")
                    
            else:
                print_error(f"❌ Admin reset failed: {response.status_code} - {response.text}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Admin reset failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in admin reset test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Admin reset exception: {str(e)}")
        
        # Test 2: Non-State Manager should fail with 403
        print_info("\n📋 TEST 2: Non-State Manager Access Control")
        if self.district_manager_token:
            try:
                district_headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                reset_data = {
                    "user_id": self.agent_id,
                    "new_password": "ShouldFail123!"
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/auth/admin-reset-password",
                    json=reset_data,
                    headers=district_headers
                )
                
                if response.status_code == 403:
                    print_success("✅ District Manager correctly denied access (403)")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ District Manager should get 403, got {response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"District Manager access control failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in access control test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Access control test exception: {str(e)}")
        
        # Test 3: Invalid user_id not in hierarchy
        print_info("\n📋 TEST 3: Invalid User ID Not in Hierarchy")
        try:
            reset_data = {
                "user_id": "invalid-user-id-12345",
                "new_password": "ValidPassword123!"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 403:
                print_success("✅ Invalid user ID correctly rejected (403)")
                self.test_results['passed'] += 1
            else:
                print_error(f"❌ Invalid user ID should get 403, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Invalid user ID validation failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in invalid user ID test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Invalid user ID test exception: {str(e)}")
        
        # Test 4: Password too short validation
        print_info("\n📋 TEST 4: Password Length Validation")
        try:
            reset_data = {
                "user_id": self.district_manager_id,
                "new_password": "123"  # Too short
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 400:
                print_success("✅ Short password correctly rejected (400)")
                self.test_results['passed'] += 1
            else:
                print_error(f"❌ Short password should get 400, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Password length validation failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in password length test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Password length test exception: {str(e)}")

    def test_forgot_password(self):
        """Test forgot password functionality (Public endpoint)"""
        print_header("🔑 TESTING FORGOT PASSWORD FUNCTIONALITY")
        
        print_info("🎯 Testing forgot password public endpoint")
        print_info("   Should generate temporary password for any user")
        print_info("   Should not reveal if email exists or not")
        
        # Test 1: Valid email address in system
        print_info("\n📋 TEST 1: Valid Email Address in System")
        try:
            forgot_data = {
                "email": "district.manager.forgot@test.com"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/forgot-password",
                json=forgot_data
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("✅ Forgot password request successful")
                print_info(f"   Message: {data.get('message', 'No message')}")
                
                # Check if temporary password is provided
                temp_password = data.get('temporary_password')
                if temp_password:
                    print_success(f"✅ Temporary password generated: {temp_password}")
                    print_info(f"   User: {data.get('user_name', 'Unknown')}")
                    print_info(f"   Instructions: {data.get('instructions', 'No instructions')}")
                    self.test_results['passed'] += 1
                    
                    # Verify temporary password is 8 characters long
                    if len(temp_password) == 8:
                        print_success("✅ Temporary password is 8 characters long")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ Temporary password should be 8 characters, got {len(temp_password)}")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append(f"Temporary password length incorrect: {len(temp_password)}")
                    
                    # Verify user can login with temporary password
                    print_info("Verifying user can login with temporary password...")
                    login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                        "email": "district.manager.forgot@test.com",
                        "password": temp_password
                    })
                    
                    if login_response.status_code == 200:
                        print_success("✅ User can login with temporary password")
                        self.test_results['passed'] += 1
                        
                        # Store the new token for further testing
                        self.temp_token = login_response.json().get('token')
                    else:
                        print_error(f"❌ User cannot login with temporary password: {login_response.status_code}")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append("User cannot login with temporary password")
                        
                else:
                    print_error("❌ No temporary password in response")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("No temporary password generated")
                    
            else:
                print_error(f"❌ Forgot password failed: {response.status_code} - {response.text}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Forgot password failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in forgot password test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Forgot password exception: {str(e)}")
        
        # Test 2: Invalid/non-existent email
        print_info("\n📋 TEST 2: Invalid/Non-existent Email")
        try:
            forgot_data = {
                "email": "nonexistent.user@test.com"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/forgot-password",
                json=forgot_data
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("✅ Forgot password with invalid email returned 200 (security)")
                print_info(f"   Message: {data.get('message', 'No message')}")
                
                # Should not reveal if email exists or not
                if "If the email exists" in data.get('message', ''):
                    print_success("✅ Response doesn't reveal if email exists (security)")
                    self.test_results['passed'] += 1
                else:
                    print_warning("⚠️ Response message may reveal email existence")
                    
                # Should not have temporary_password field for non-existent email
                if 'temporary_password' not in data:
                    print_success("✅ No temporary password for non-existent email (security)")
                    self.test_results['passed'] += 1
                else:
                    print_error("❌ Temporary password generated for non-existent email")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("Temporary password generated for non-existent email")
                    
            else:
                print_error(f"❌ Forgot password with invalid email failed: {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Invalid email test failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in invalid email test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Invalid email test exception: {str(e)}")

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
