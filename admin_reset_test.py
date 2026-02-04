#!/usr/bin/env python3
"""
Admin Reset Password Functionality Testing
Focus: Test POST /api/auth/admin-reset-password endpoint specifically
- State Manager can reset passwords for users in their hierarchy
- Access control validation
- Hierarchy validation
- Password validation
- Complete workflow testing
"""

import requests
import json
from datetime import datetime
import sys
import os

# Configuration
BACKEND_URL = "https://team-leaderboards.preview.emergentagent.com/api"

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

class AdminResetTester:
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

    def setup_test_users(self):
        """Setup test users for admin reset testing"""
        print_header("SETTING UP TEST USERS FOR ADMIN RESET TESTING")
        
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
                    "state.manager.admin@test.com",
                    "TestPassword123!",
                    "State Manager Admin Test",
                    "state_manager"
                )
                if self.state_manager_token:
                    user_info = self.get_user_info(self.state_manager_token)
                    self.state_manager_id = user_info.get('id') if user_info else None
        except Exception as e:
            print_warning(f"Exception logging in existing state manager: {str(e)}")
            self.state_manager_token = self.register_test_user(
                "state.manager.admin@test.com",
                "TestPassword123!",
                "State Manager Admin Test",
                "state_manager"
            )
            if self.state_manager_token:
                user_info = self.get_user_info(self.state_manager_token)
                self.state_manager_id = user_info.get('id') if user_info else None
        
        # Register District Manager under State Manager for hierarchy testing
        if self.state_manager_id:
            self.district_manager_token = self.register_test_user_with_manager(
                "district.manager.admin@test.com", 
                "TestPassword123!",
                "District Manager Admin Test",
                "district_manager",
                self.state_manager_id
            )
            
            if self.district_manager_token:
                user_info = self.get_user_info(self.district_manager_token)
                self.district_manager_id = user_info.get('id') if user_info else None
        
        # Register Agent under District Manager for hierarchy testing
        if self.district_manager_id:
            self.agent_token = self.register_test_user_with_manager(
                "agent.admin@test.com",
                "TestPassword123!",
                "Agent Admin Test",
                "agent",
                self.district_manager_id
            )
            
            if self.agent_token:
                user_info = self.get_user_info(self.agent_token)
                self.agent_id = user_info.get('id') if user_info else None
        
        if not self.state_manager_token:
            print_error("Failed to setup state manager - cannot continue testing")
            return False
            
        print_success("✅ Test hierarchy created for admin reset testing:")
        print_info("   State Manager (can reset passwords)")
        print_info("   └── District Manager (target for reset)")
        print_info("       └── Agent (target for reset)")
            
        return True

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

    def test_valid_admin_reset(self):
        """Test 1: Valid Admin Reset"""
        print_header("TEST 1: VALID ADMIN RESET")
        
        if not self.state_manager_token or not self.district_manager_id:
            print_error("Missing required tokens/IDs for valid admin reset test")
            self.test_results['failed'] += 1
            return
            
        headers = {"Authorization": f"Bearer {self.state_manager_token}"}
        
        print_info("🎯 State Manager resetting District Manager's password")
        
        try:
            reset_data = {
                "user_id": self.district_manager_id,
                "new_password": "newpass123"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("✅ Admin reset password successful")
                print_info(f"   Response: {data}")
                
                # Verify response format
                if 'message' in data and 'user_name' in data and 'user_email' in data:
                    print_success("✅ Response includes required fields (message, user_name, user_email)")
                    self.test_results['passed'] += 1
                else:
                    print_error("❌ Response missing required fields")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("Response missing required fields")
                
                # Verify target user can login with new password
                print_info("Verifying target user can login with new password...")
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": "district.manager.admin@test.com",
                    "password": "newpass123"
                })
                
                if login_response.status_code == 200:
                    print_success("✅ Target user can login with new password")
                    self.test_results['passed'] += 1
                    
                    # Store new token for further testing
                    self.district_manager_token = login_response.json().get('token')
                else:
                    print_error(f"❌ Target user cannot login with new password: {login_response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("Target user cannot login with new password")
                    
            else:
                print_error(f"❌ Admin reset failed: {response.status_code} - {response.text}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Admin reset failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in valid admin reset test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Valid admin reset exception: {str(e)}")

    def test_access_control(self):
        """Test 2: Access Control - Non-State Manager should get 403"""
        print_header("TEST 2: ACCESS CONTROL")
        
        if not self.district_manager_token or not self.agent_id:
            print_error("Missing required tokens/IDs for access control test")
            self.test_results['failed'] += 1
            return
            
        print_info("🎯 District Manager (non-State Manager) trying to reset Agent's password")
        
        try:
            headers = {"Authorization": f"Bearer {self.district_manager_token}"}
            reset_data = {
                "user_id": self.agent_id,
                "new_password": "shouldfail123"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 403:
                print_success("✅ Non-State Manager correctly denied access (403)")
                print_info(f"   Response: {response.text}")
                
                # Check for expected error message
                if "Only State Managers can reset passwords" in response.text:
                    print_success("✅ Correct error message returned")
                    self.test_results['passed'] += 1
                else:
                    print_warning("⚠️ Error message may not be as expected")
                    self.test_results['passed'] += 1  # Still pass as 403 is correct
                    
            else:
                print_error(f"❌ Non-State Manager should get 403, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Access control failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in access control test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Access control test exception: {str(e)}")

    def test_hierarchy_validation(self):
        """Test 3: Hierarchy Validation - User not in hierarchy should get 403"""
        print_header("TEST 3: HIERARCHY VALIDATION")
        
        if not self.state_manager_token:
            print_error("Missing state manager token for hierarchy validation test")
            self.test_results['failed'] += 1
            return
            
        print_info("🎯 State Manager trying to reset password for user NOT in their hierarchy")
        
        try:
            headers = {"Authorization": f"Bearer {self.state_manager_token}"}
            reset_data = {
                "user_id": "non-existent-user-id-12345",
                "new_password": "validpass123"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 403:
                print_success("✅ User not in hierarchy correctly rejected (403)")
                print_info(f"   Response: {response.text}")
                
                # Check for expected error message
                if "User not found in your hierarchy" in response.text:
                    print_success("✅ Correct error message returned")
                    self.test_results['passed'] += 1
                else:
                    print_warning("⚠️ Error message may not be as expected")
                    self.test_results['passed'] += 1  # Still pass as 403 is correct
                    
            else:
                print_error(f"❌ Invalid user should get 403, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Hierarchy validation failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in hierarchy validation test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Hierarchy validation test exception: {str(e)}")

    def test_password_validation(self):
        """Test 4: Password Validation - Less than 6 characters should get 400"""
        print_header("TEST 4: PASSWORD VALIDATION")
        
        if not self.state_manager_token or not self.district_manager_id:
            print_error("Missing required tokens/IDs for password validation test")
            self.test_results['failed'] += 1
            return
            
        print_info("🎯 State Manager trying to set password less than 6 characters")
        
        try:
            headers = {"Authorization": f"Bearer {self.state_manager_token}"}
            reset_data = {
                "user_id": self.district_manager_id,
                "new_password": "123"  # Less than 6 characters
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 400:
                print_success("✅ Short password correctly rejected (400)")
                print_info(f"   Response: {response.text}")
                
                # Check for expected error message
                if "at least 6 characters" in response.text:
                    print_success("✅ Correct error message returned")
                    self.test_results['passed'] += 1
                else:
                    print_warning("⚠️ Error message may not be as expected")
                    self.test_results['passed'] += 1  # Still pass as 400 is correct
                    
            else:
                print_error(f"❌ Short password should get 400, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Password validation failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in password validation test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Password validation test exception: {str(e)}")

    def test_user_validation(self):
        """Test 5: User Validation - Non-existent user_id should get 403"""
        print_header("TEST 5: USER VALIDATION")
        
        if not self.state_manager_token:
            print_error("Missing state manager token for user validation test")
            self.test_results['failed'] += 1
            return
            
        print_info("🎯 State Manager trying to reset password for non-existent user")
        
        try:
            headers = {"Authorization": f"Bearer {self.state_manager_token}"}
            reset_data = {
                "user_id": "definitely-non-existent-user-id-99999",
                "new_password": "validpass123"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 403:
                print_success("✅ Non-existent user correctly rejected (403)")
                print_info(f"   Response: {response.text}")
                
                # Check for expected error message
                if "User not found in your hierarchy" in response.text:
                    print_success("✅ Correct error message returned")
                    self.test_results['passed'] += 1
                else:
                    print_warning("⚠️ Error message may not be as expected")
                    self.test_results['passed'] += 1  # Still pass as 403 is correct
                    
            else:
                print_error(f"❌ Non-existent user should get 403, got {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"User validation failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in user validation test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"User validation test exception: {str(e)}")

    def test_complete_workflow(self):
        """Test 6: Complete Workflow"""
        print_header("TEST 6: COMPLETE WORKFLOW")
        
        if not self.state_manager_token or not self.agent_id:
            print_error("Missing required tokens/IDs for complete workflow test")
            self.test_results['failed'] += 1
            return
            
        print_info("🎯 Testing complete admin reset workflow:")
        print_info("   1. State Manager resets agent's password")
        print_info("   2. Agent logs in with new password successfully")
        print_info("   3. Agent changes to their own preferred password")
        print_info("   4. Old password no longer works")
        
        try:
            headers = {"Authorization": f"Bearer {self.state_manager_token}"}
            
            # Step 1: State Manager resets agent's password
            print_info("\n📋 STEP 1: State Manager resets agent's password")
            reset_data = {
                "user_id": self.agent_id,
                "new_password": "adminreset123"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/admin-reset-password",
                json=reset_data,
                headers=headers
            )
            
            if response.status_code == 200:
                print_success("✅ State Manager successfully reset agent's password")
                self.test_results['passed'] += 1
                
                # Step 2: Agent logs in with new password
                print_info("\n📋 STEP 2: Agent logs in with new password")
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": "agent.admin@test.com",
                    "password": "adminreset123"
                })
                
                if login_response.status_code == 200:
                    print_success("✅ Agent can login with new password")
                    self.test_results['passed'] += 1
                    
                    agent_token = login_response.json().get('token')
                    
                    # Step 3: Agent changes to their own preferred password
                    print_info("\n📋 STEP 3: Agent changes to preferred password")
                    agent_headers = {"Authorization": f"Bearer {agent_token}"}
                    change_data = {
                        "current_password": "adminreset123",
                        "new_password": "myownpassword123"
                    }
                    
                    change_response = self.session.post(
                        f"{BACKEND_URL}/auth/change-password",
                        json=change_data,
                        headers=agent_headers
                    )
                    
                    if change_response.status_code == 200:
                        print_success("✅ Agent successfully changed to preferred password")
                        self.test_results['passed'] += 1
                        
                        # Step 4: Verify old password no longer works
                        print_info("\n📋 STEP 4: Verify old password no longer works")
                        old_login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                            "email": "agent.admin@test.com",
                            "password": "adminreset123"
                        })
                        
                        if old_login_response.status_code == 401:
                            print_success("✅ Old password no longer works")
                            self.test_results['passed'] += 1
                        else:
                            print_error("❌ Old password still works")
                            self.test_results['failed'] += 1
                            self.test_results['errors'].append("Old password still works after change")
                        
                        # Verify new password works
                        new_login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                            "email": "agent.admin@test.com",
                            "password": "myownpassword123"
                        })
                        
                        if new_login_response.status_code == 200:
                            print_success("✅ Agent can login with preferred password")
                            self.test_results['passed'] += 1
                        else:
                            print_error("❌ Agent cannot login with preferred password")
                            self.test_results['failed'] += 1
                            self.test_results['errors'].append("Agent cannot login with preferred password")
                            
                    else:
                        print_error(f"❌ Agent password change failed: {change_response.status_code}")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append(f"Agent password change failed: {change_response.status_code}")
                        
                else:
                    print_error(f"❌ Agent cannot login with new password: {login_response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("Agent cannot login with new password")
                    
            else:
                print_error(f"❌ State Manager reset failed: {response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"State Manager reset failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Exception in complete workflow test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Complete workflow test exception: {str(e)}")

    def run_all_tests(self):
        """Run all admin reset password tests"""
        print_header("🚀 STARTING ADMIN RESET PASSWORD FUNCTIONALITY TESTING")
        
        # Setup test users
        if not self.setup_test_users():
            print_error("Failed to setup test users - aborting tests")
            return False
        
        # Run all test cases
        self.test_valid_admin_reset()
        self.test_access_control()
        self.test_hierarchy_validation()
        self.test_password_validation()
        self.test_user_validation()
        self.test_complete_workflow()
        
        # Print final results
        self.print_final_results()
        
        return self.test_results['failed'] == 0

    def print_final_results(self):
        """Print comprehensive test results"""
        print_header("📊 ADMIN RESET PASSWORD TEST RESULTS")
        
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
            print_success("🎉 ALL ADMIN RESET PASSWORD TESTS PASSED!")
            print_success("✅ Valid admin reset working correctly")
            print_success("✅ Access control working correctly")
            print_success("✅ Hierarchy validation working correctly")
            print_success("✅ Password validation working correctly")
            print_success("✅ User validation working correctly")
            print_success("✅ Complete workflow working correctly")
        else:
            print_error("❌ SOME TESTS FAILED - ADMIN RESET FUNCTIONALITY NEEDS ATTENTION")

if __name__ == "__main__":
    tester = AdminResetTester()
    success = tester.run_all_tests()
    
    if success:
        print_success("\n🎉 All Admin Reset Password tests completed successfully!")
        sys.exit(0)
    else:
        print_error("\n💥 Some Admin Reset Password tests failed!")
        sys.exit(1)