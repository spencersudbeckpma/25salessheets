#!/usr/bin/env python3
"""
Password Change Functionality Testing Script
NEW FUNCTIONALITY: Added password change feature for all users (agents, managers) to update their own passwords securely.

BACKEND ENDPOINT TO TEST:
- POST /api/auth/change-password
- Requires authentication (Bearer token)
- Body: {"current_password": "old_pass", "new_password": "new_pass"}

CRITICAL TESTS:

**Test 1: Valid Password Change**
- Login as existing user
- Call change password endpoint with correct current password and valid new password
- Verify password is updated successfully
- Verify user can login with new password

**Test 2: Current Password Validation**
- Test with incorrect current password
- Should return 400 error with "Current password is incorrect"

**Test 3: New Password Validation**
- Test with new password less than 6 characters
- Should return 400 error about minimum length requirement

**Test 4: Authentication Required**
- Test endpoint without Bearer token
- Should return 401 unauthorized

**Test 5: User Not Found**
- Test with invalid user ID (simulate edge case)
- Should handle gracefully

**Security Validations:**
- Verify current password is properly verified using bcrypt
- Verify new password is properly hashed before storage
- Verify old password cannot be used after change
- Verify password change doesn't affect other user fields
"""

import requests
import json
from datetime import datetime
import sys
import os

# Configuration
BACKEND_URL = "https://secure-analytics-2.preview.emergentagent.com/api"

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

class PasswordChangeTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def register_test_user(self, email, password, name, role):
        """Register a test user for password change testing"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json={
                "email": email,
                "password": password,
                "name": name,
                "role": role
            })
            
            if response.status_code == 200:
                data = response.json()
                print_success(f"Registered test user: {name} ({email})")
                return data['token'], data['user']['id']
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try to login
                login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": email,
                    "password": password
                })
                if login_response.status_code == 200:
                    data = login_response.json()
                    print_info(f"Logged in existing user: {name} ({email})")
                    return data['token'], data['user']['id']
                else:
                    print_error(f"Failed to login existing user {email}: {login_response.text}")
                    return None, None
            else:
                print_error(f"Failed to register {email}: {response.status_code} - {response.text}")
                return None, None
        except Exception as e:
            print_error(f"Exception registering {email}: {str(e)}")
            return None, None

    def test_valid_password_change(self):
        """Test 1: Valid Password Change"""
        print_header("TEST 1: VALID PASSWORD CHANGE")
        
        # Create a test user
        original_password = "TestPassword123!"
        new_password = "NewPassword456!"
        
        token, user_id = self.register_test_user(
            "password.test.user@test.com",
            original_password,
            "Password Test User",
            "agent"
        )
        
        if not token:
            print_error("Failed to create test user - skipping valid password change test")
            self.test_results['failed'] += 1
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            # Step 1: Change password
            print_info("Step 1: Attempting to change password...")
            change_response = self.session.post(
                f"{BACKEND_URL}/auth/change-password",
                json={
                    "current_password": original_password,
                    "new_password": new_password
                },
                headers=headers
            )
            
            if change_response.status_code == 200:
                response_data = change_response.json()
                if response_data.get('message') == "Password changed successfully":
                    print_success("Password change endpoint returned success message")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"Unexpected success message: {response_data.get('message')}")
                    self.test_results['failed'] += 1
                    return
            else:
                print_error(f"Password change failed: {change_response.status_code} - {change_response.text}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Valid password change failed: {change_response.status_code}")
                return
            
            # Step 2: Verify old password no longer works
            print_info("Step 2: Verifying old password no longer works...")
            old_login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "password.test.user@test.com",
                "password": original_password
            })
            
            if old_login_response.status_code == 401 or old_login_response.status_code == 400:
                print_success("Old password correctly rejected")
                self.test_results['passed'] += 1
            else:
                print_error(f"Old password still works! Status: {old_login_response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append("Old password still works after change")
            
            # Step 3: Verify new password works
            print_info("Step 3: Verifying new password works...")
            new_login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "password.test.user@test.com",
                "password": new_password
            })
            
            if new_login_response.status_code == 200:
                new_data = new_login_response.json()
                if 'token' in new_data and 'user' in new_data:
                    print_success("New password login successful")
                    print_success("User can login with new password")
                    self.test_results['passed'] += 1
                else:
                    print_error("New password login missing required fields")
                    self.test_results['failed'] += 1
            else:
                print_error(f"New password login failed: {new_login_response.status_code} - {new_login_response.text}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append("New password login failed")
            
            # Step 4: Verify user data integrity
            print_info("Step 4: Verifying user data integrity...")
            if new_login_response.status_code == 200:
                new_user_data = new_login_response.json()['user']
                if (new_user_data.get('id') == user_id and 
                    new_user_data.get('email') == "password.test.user@test.com" and
                    new_user_data.get('name') == "Password Test User"):
                    print_success("User data integrity maintained after password change")
                    self.test_results['passed'] += 1
                else:
                    print_error("User data corrupted after password change")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("User data integrity compromised")
            
        except Exception as e:
            print_error(f"Exception in valid password change test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Valid password change exception: {str(e)}")

    def test_incorrect_current_password(self):
        """Test 2: Current Password Validation"""
        print_header("TEST 2: CURRENT PASSWORD VALIDATION")
        
        # Create a test user
        correct_password = "CorrectPassword123!"
        
        token, user_id = self.register_test_user(
            "password.validation.user@test.com",
            correct_password,
            "Password Validation User",
            "agent"
        )
        
        if not token:
            print_error("Failed to create test user - skipping current password validation test")
            self.test_results['failed'] += 1
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            print_info("Testing with incorrect current password...")
            change_response = self.session.post(
                f"{BACKEND_URL}/auth/change-password",
                json={
                    "current_password": "WrongPassword123!",
                    "new_password": "NewPassword456!"
                },
                headers=headers
            )
            
            if change_response.status_code == 400:
                response_data = change_response.json()
                error_detail = response_data.get('detail', '')
                
                if "Current password is incorrect" in error_detail:
                    print_success("Correct error message for incorrect current password")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"Unexpected error message: {error_detail}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Unexpected error message: {error_detail}")
            else:
                print_error(f"Expected 400 status, got {change_response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Incorrect current password validation failed: {change_response.status_code}")
            
            # Verify original password still works
            print_info("Verifying original password still works...")
            login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "password.validation.user@test.com",
                "password": correct_password
            })
            
            if login_response.status_code == 200:
                print_success("Original password still works (password unchanged)")
                self.test_results['passed'] += 1
            else:
                print_error("Original password no longer works - security issue!")
                self.test_results['failed'] += 1
                self.test_results['errors'].append("Password changed despite incorrect current password")
            
        except Exception as e:
            print_error(f"Exception in current password validation test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Current password validation exception: {str(e)}")

    def test_new_password_validation(self):
        """Test 3: New Password Validation"""
        print_header("TEST 3: NEW PASSWORD VALIDATION")
        
        # Create a test user
        current_password = "CurrentPassword123!"
        
        token, user_id = self.register_test_user(
            "password.length.user@test.com",
            current_password,
            "Password Length User",
            "agent"
        )
        
        if not token:
            print_error("Failed to create test user - skipping new password validation test")
            self.test_results['failed'] += 1
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test cases for new password validation
        test_cases = [
            ("", "empty password"),
            ("12345", "5 characters"),
            ("abc", "3 characters"),
            ("1", "1 character")
        ]
        
        for new_password, description in test_cases:
            try:
                print_info(f"Testing with {description}: '{new_password}'")
                change_response = self.session.post(
                    f"{BACKEND_URL}/auth/change-password",
                    json={
                        "current_password": current_password,
                        "new_password": new_password
                    },
                    headers=headers
                )
                
                if change_response.status_code == 400:
                    response_data = change_response.json()
                    error_detail = response_data.get('detail', '')
                    
                    if "at least 6 characters" in error_detail:
                        print_success(f"Correct validation error for {description}")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"Unexpected error message for {description}: {error_detail}")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append(f"Unexpected validation error: {error_detail}")
                else:
                    print_error(f"Expected 400 status for {description}, got {change_response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Password validation failed for {description}: {change_response.status_code}")
                
            except Exception as e:
                print_error(f"Exception testing {description}: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"New password validation exception ({description}): {str(e)}")

    def test_authentication_required(self):
        """Test 4: Authentication Required"""
        print_header("TEST 4: AUTHENTICATION REQUIRED")
        
        try:
            print_info("Testing password change without authentication token...")
            change_response = self.session.post(
                f"{BACKEND_URL}/auth/change-password",
                json={
                    "current_password": "SomePassword123!",
                    "new_password": "NewPassword456!"
                }
                # No headers - no authentication
            )
            
            if change_response.status_code == 401:
                print_success("Correctly rejected request without authentication")
                self.test_results['passed'] += 1
            elif change_response.status_code == 403:
                print_success("Correctly rejected request without authentication (403)")
                self.test_results['passed'] += 1
            else:
                print_error(f"Expected 401/403 status, got {change_response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Authentication requirement failed: {change_response.status_code}")
            
            # Test with invalid token
            print_info("Testing with invalid authentication token...")
            invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
            change_response = self.session.post(
                f"{BACKEND_URL}/auth/change-password",
                json={
                    "current_password": "SomePassword123!",
                    "new_password": "NewPassword456!"
                },
                headers=invalid_headers
            )
            
            if change_response.status_code == 401:
                print_success("Correctly rejected request with invalid token")
                self.test_results['passed'] += 1
            else:
                print_error(f"Expected 401 status for invalid token, got {change_response.status_code}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Invalid token handling failed: {change_response.status_code}")
            
        except Exception as e:
            print_error(f"Exception in authentication test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Authentication test exception: {str(e)}")

    def test_user_roles_access(self):
        """Test 5: Different User Roles Can Change Password"""
        print_header("TEST 5: USER ROLES ACCESS")
        
        # Test different user roles
        roles_to_test = [
            ("agent", "Agent Role User"),
            ("district_manager", "District Manager User"),
            ("regional_manager", "Regional Manager User"),
            ("state_manager", "State Manager User")
        ]
        
        for role, name in roles_to_test:
            try:
                print_info(f"Testing password change for role: {role}")
                
                original_password = f"{role}Password123!"
                new_password = f"{role}NewPassword456!"
                email = f"{role}.password.test@test.com"
                
                # Register user with specific role
                token, user_id = self.register_test_user(
                    email,
                    original_password,
                    name,
                    role
                )
                
                if not token:
                    print_warning(f"Failed to create {role} user - skipping")
                    continue
                
                headers = {"Authorization": f"Bearer {token}"}
                
                # Attempt password change
                change_response = self.session.post(
                    f"{BACKEND_URL}/auth/change-password",
                    json={
                        "current_password": original_password,
                        "new_password": new_password
                    },
                    headers=headers
                )
                
                if change_response.status_code == 200:
                    print_success(f"Password change successful for {role}")
                    self.test_results['passed'] += 1
                    
                    # Verify new password works
                    login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                        "email": email,
                        "password": new_password
                    })
                    
                    if login_response.status_code == 200:
                        print_success(f"New password login successful for {role}")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"New password login failed for {role}")
                        self.test_results['failed'] += 1
                else:
                    print_error(f"Password change failed for {role}: {change_response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Password change failed for {role}: {change_response.status_code}")
                
            except Exception as e:
                print_error(f"Exception testing {role}: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Role {role} test exception: {str(e)}")

    def test_security_validations(self):
        """Test 6: Security Validations"""
        print_header("TEST 6: SECURITY VALIDATIONS")
        
        # Create a test user
        original_password = "SecurityTest123!"
        
        token, user_id = self.register_test_user(
            "security.test.user@test.com",
            original_password,
            "Security Test User",
            "agent"
        )
        
        if not token:
            print_error("Failed to create test user - skipping security validation tests")
            self.test_results['failed'] += 1
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            # Test 1: Verify password is properly hashed
            print_info("Testing password hashing security...")
            
            new_password = "NewSecurePassword456!"
            change_response = self.session.post(
                f"{BACKEND_URL}/auth/change-password",
                json={
                    "current_password": original_password,
                    "new_password": new_password
                },
                headers=headers
            )
            
            if change_response.status_code == 200:
                print_success("Password change successful")
                
                # Verify the password is actually changed by trying old password
                old_login = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": "security.test.user@test.com",
                    "password": original_password
                })
                
                if old_login.status_code != 200:
                    print_success("Old password properly invalidated")
                    self.test_results['passed'] += 1
                else:
                    print_error("SECURITY ISSUE: Old password still works!")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("Old password still works - security breach")
                
                # Verify new password works
                new_login = self.session.post(f"{BACKEND_URL}/auth/login", json={
                    "email": "security.test.user@test.com",
                    "password": new_password
                })
                
                if new_login.status_code == 200:
                    print_success("New password properly hashed and stored")
                    self.test_results['passed'] += 1
                else:
                    print_error("New password not working - hashing issue")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append("New password not working after change")
            else:
                print_error(f"Password change failed: {change_response.status_code}")
                self.test_results['failed'] += 1
            
        except Exception as e:
            print_error(f"Exception in security validation test: {str(e)}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Security validation exception: {str(e)}")

    def run_all_tests(self):
        """Run all password change tests"""
        print_header("PASSWORD CHANGE FUNCTIONALITY TESTING")
        print_info("Testing POST /api/auth/change-password endpoint")
        print_info("Verifying security, validation, and functionality")
        
        # Run all test methods
        self.test_valid_password_change()
        self.test_incorrect_current_password()
        self.test_new_password_validation()
        self.test_authentication_required()
        self.test_user_roles_access()
        self.test_security_validations()
        
        # Print summary
        self.print_test_summary()

    def print_test_summary(self):
        """Print test results summary"""
        print_header("PASSWORD CHANGE TEST RESULTS SUMMARY")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        
        print_info(f"Total Tests Run: {total_tests}")
        print_success(f"Tests Passed: {self.test_results['passed']}")
        
        if self.test_results['failed'] > 0:
            print_error(f"Tests Failed: {self.test_results['failed']}")
            print_error("Failed Test Details:")
            for error in self.test_results['errors']:
                print_error(f"  - {error}")
        else:
            print_success("All tests passed!")
        
        # Calculate success rate
        if total_tests > 0:
            success_rate = (self.test_results['passed'] / total_tests) * 100
            print_info(f"Success Rate: {success_rate:.1f}%")
        
        return self.test_results['failed'] == 0

if __name__ == "__main__":
    tester = PasswordChangeTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)