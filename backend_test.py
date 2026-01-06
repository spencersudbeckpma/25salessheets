#!/usr/bin/env python3
"""
Backend Testing Script - INTERVIEW MANAGEMENT FUNCTIONALITY TESTING
NEW FUNCTIONALITY: Test Interview Management endpoints with different manager role access levels
Focus: Test Interview Management system for Sales Tracker application
- GET /api/interviews (State Manager sees all, others see their own)
- GET /api/interviews/stats (Interview statistics)
- POST /api/interviews (Create new interview with comprehensive fields)
- PUT /api/interviews/{interview_id} (Update interview, status changes, 2nd interview scheduling)
- DELETE /api/interviews/{interview_id} (Delete interview - State Manager only)
- POST /api/interviews/{interview_id}/add-to-recruiting (Add completed interview to recruiting pipeline)
- Test role-based access control and interview workflow
- Validate manager access levels and interview status transitions
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Configuration
BACKEND_URL = "https://sales-pipeline-64.preview.emergentagent.com/api"

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

class InterviewManagementTester:
    def __init__(self):
        self.session = requests.Session()
        self.state_manager_token = None
        self.state_manager_id = None
        self.regional_manager_token = None
        self.regional_manager_id = None
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
        """Setup test users for Interview Management functionality testing"""
        print_header("SETTING UP TEST USERS FOR INTERVIEW MANAGEMENT TESTING")
        
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
                    "state.manager.interview@test.com",
                    "TestPassword123!",
                    "State Manager Interview Test",
                    "state_manager"
                )
                if self.state_manager_token:
                    user_info = self.get_user_info(self.state_manager_token)
                    self.state_manager_id = user_info.get('id') if user_info else None
        except Exception as e:
            print_warning(f"Exception logging in existing state manager: {str(e)}")
            self.state_manager_token = self.register_test_user(
                "state.manager.interview@test.com",
                "TestPassword123!",
                "State Manager Interview Test",
                "state_manager"
            )
            if self.state_manager_token:
                user_info = self.get_user_info(self.state_manager_token)
                self.state_manager_id = user_info.get('id') if user_info else None
        
        # Register Regional Manager under State Manager
        if self.state_manager_id:
            self.regional_manager_token = self.register_test_user_with_manager(
                "regional.manager.interview@test.com", 
                "TestPassword123!",
                "Regional Manager Interview Test",
                "regional_manager",
                self.state_manager_id
            )
            
            if self.regional_manager_token:
                user_info = self.get_user_info(self.regional_manager_token)
                self.regional_manager_id = user_info.get('id') if user_info else None
        
        # Register District Manager under Regional Manager
        if self.regional_manager_id:
            self.district_manager_token = self.register_test_user_with_manager(
                "district.manager.interview@test.com", 
                "TestPassword123!",
                "District Manager Interview Test",
                "district_manager",
                self.regional_manager_id
            )
            
            if self.district_manager_token:
                user_info = self.get_user_info(self.district_manager_token)
                self.district_manager_id = user_info.get('id') if user_info else None
        
        # Register Agent under District Manager
        if self.district_manager_id:
            self.agent_token = self.register_test_user_with_manager(
                "agent.interview@test.com",
                "TestPassword123!",
                "Agent Interview Test",
                "agent",
                self.district_manager_id
            )
            
            if self.agent_token:
                user_info = self.get_user_info(self.agent_token)
                self.agent_id = user_info.get('id') if user_info else None
        
        if not self.state_manager_token:
            print_error("Failed to setup state manager - cannot continue testing")
            return False
            
        print_success("✅ Test hierarchy created for Interview Management testing:")
        print_info("   State Manager (full access to all interviews)")
        print_info("   └── Regional Manager (can conduct interviews, see own only)")
        print_info("       └── District Manager (can conduct interviews, see own only)")
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

    def test_interviews_get_endpoint(self):
        """Test GET /api/interviews endpoint with different manager roles"""
        print_header("📊 TESTING INTERVIEWS GET ENDPOINT")
        
        print_info("🎯 Testing /api/interviews with different manager role access levels")
        
        # Test 1: State Manager access - should get all interviews
        print_info("\n📋 TEST 1: State Manager Access to All Interviews")
        if self.state_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/interviews", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can access all interviews")
                    print_info(f"   Retrieved {len(data)} interview records")
                    self.test_results['passed'] += 1
                    
                    # Verify response structure
                    if isinstance(data, list):
                        print_success("✅ Response is a list as expected")
                        self.test_results['passed'] += 1
                        
                        if len(data) > 0:
                            sample_record = data[0]
                            required_fields = ['id', 'candidate_name', 'interviewer_id', 'interview_date', 'status']
                            missing_fields = [field for field in required_fields if field not in sample_record]
                            
                            if not missing_fields:
                                print_success("✅ Interview records have all required fields")
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
        
        # Test 2: Regional Manager access - should get their own interviews only
        print_info("\n📋 TEST 2: Regional Manager Access to Own Interviews")
        if self.regional_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/interviews", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Regional Manager can access their own interviews")
                    print_info(f"   Retrieved {len(data)} interview records for regional manager")
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
        
        # Test 3: District Manager access - should get their own interviews only
        print_info("\n📋 TEST 3: District Manager Access to Own Interviews")
        if self.district_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/interviews", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ District Manager can access their own interviews")
                    print_info(f"   Retrieved {len(data)} interview records for district manager")
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
                response = self.session.get(f"{BACKEND_URL}/interviews", headers=headers)
                
                if response.status_code == 403:
                    print_success("✅ Agent correctly denied access (403)")
                    print_info("   Access control working as expected - only managers can access interviews")
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

    def test_interviews_stats_endpoint(self):
        """Test GET /api/interviews/stats endpoint"""
        print_header("📈 TESTING INTERVIEWS STATS ENDPOINT")
        
        print_info("🎯 Testing /api/interviews/stats with different manager roles")
        
        # Test 1: State Manager can access stats
        print_info("\n📋 TEST 1: State Manager Access to Interview Stats")
        if self.state_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/interviews/stats", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can access interview stats")
                    self.test_results['passed'] += 1
                    
                    # Verify response structure
                    required_fields = ['total', 'this_week', 'this_month', 'this_year', 'moving_forward', 'not_moving_forward', 'second_interview_scheduled', 'completed']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        print_success("✅ Stats response has all required fields")
                        print_info(f"   Total: {data.get('total', 0)}, This Week: {data.get('this_week', 0)}")
                        print_info(f"   Moving Forward: {data.get('moving_forward', 0)}, Completed: {data.get('completed', 0)}")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ Missing fields in stats: {missing_fields}")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append(f"Missing stats fields: {missing_fields}")
                        
                else:
                    print_error(f"❌ State Manager stats access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"State Manager stats access failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager stats test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"State Manager stats test exception: {str(e)}")
        
        # Test 2: Regional Manager can access their own stats
        print_info("\n📋 TEST 2: Regional Manager Access to Own Interview Stats")
        if self.regional_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/interviews/stats", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Regional Manager can access their interview stats")
                    print_info(f"   Total: {data.get('total', 0)}, This Week: {data.get('this_week', 0)}")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Regional Manager stats access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Regional Manager stats access failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Regional Manager stats test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Regional Manager stats test exception: {str(e)}")

    def test_interviews_create_endpoint(self):
        """Test POST /api/interviews endpoint"""
        print_header("📝 TESTING INTERVIEWS CREATE ENDPOINT")
        
        print_info("🎯 Testing POST /api/interviews with comprehensive interview data")
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Test 1: Regional Manager can create interview with "moving_forward" status
        print_info("\n📋 TEST 1: Regional Manager Creates Interview - Moving Forward")
        if self.regional_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                
                interview_data = {
                    "candidate_name": "Sarah Johnson",
                    "candidate_location": "Dallas, TX",
                    "candidate_phone": "555-123-4567",
                    "interview_date": f"{today}T10:00:00",
                    "hobbies_interests": "Reading, hiking, volunteering at local shelter",
                    "must_have_commission": True,
                    "must_have_travel": False,
                    "must_have_background": True,
                    "must_have_car": True,
                    "work_history": "5 years in retail management, 2 years in customer service",
                    "what_would_change": "Better work-life balance and growth opportunities",
                    "why_left_recent": "Limited advancement opportunities",
                    "other_interviews": "Interviewed with 2 other insurance companies",
                    "top_3_looking_for": "Growth potential, good compensation, supportive team",
                    "why_important": "Want to build a stable career in insurance",
                    "situation_6_12_months": "Looking to establish myself and start building client base",
                    "family_impact": "Supportive spouse, no major family constraints",
                    "competitiveness_scale": 8,
                    "competitiveness_example": "Always exceeded sales targets in previous roles",
                    "work_ethic_scale": 9,
                    "work_ethic_example": "Consistently worked extra hours to help team meet goals",
                    "career_packet_sent": True,
                    "candidate_strength": 4,
                    "red_flags_notes": "None identified",
                    "status": "moving_forward"
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/interviews",
                    json=interview_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Regional Manager can create interview (moving forward)")
                    print_info(f"   Interview ID: {data.get('id', 'No ID')}")
                    print_info(f"   Candidate: {data.get('candidate_name', 'Unknown')}")
                    print_info(f"   Status: {data.get('status', 'Unknown')}")
                    self.test_results['passed'] += 1
                    self.regional_interview_id = data.get('id')  # Store for update tests
                else:
                    print_error(f"❌ Regional Manager create failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Regional Manager create failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Regional Manager create test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Regional Manager create test exception: {str(e)}")
        
        # Test 2: District Manager can create interview with "not_moving_forward" status
        print_info("\n📋 TEST 2: District Manager Creates Interview - Not Moving Forward")
        if self.district_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                
                interview_data = {
                    "candidate_name": "Mike Thompson",
                    "candidate_location": "Austin, TX",
                    "candidate_phone": "555-987-6543",
                    "interview_date": f"{today}T14:00:00",
                    "hobbies_interests": "Sports, gaming",
                    "must_have_commission": False,
                    "must_have_travel": True,
                    "must_have_background": False,
                    "must_have_car": False,
                    "work_history": "Various part-time jobs",
                    "what_would_change": "More stability",
                    "why_left_recent": "Job ended",
                    "other_interviews": "None",
                    "top_3_looking_for": "Steady income, benefits, easy work",
                    "why_important": "Need a job",
                    "situation_6_12_months": "Just want to work",
                    "family_impact": "No issues",
                    "competitiveness_scale": 3,
                    "competitiveness_example": "Not very competitive",
                    "work_ethic_scale": 4,
                    "work_ethic_example": "Do what's required",
                    "career_packet_sent": False,
                    "candidate_strength": 2,
                    "red_flags_notes": "Lacks motivation and drive",
                    "status": "not_moving_forward"
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/interviews",
                    json=interview_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ District Manager can create interview (not moving forward)")
                    print_info(f"   Interview ID: {data.get('id', 'No ID')}")
                    print_info(f"   Candidate: {data.get('candidate_name', 'Unknown')}")
                    print_info(f"   Status: {data.get('status', 'Unknown')}")
                    self.test_results['passed'] += 1
                    self.district_interview_id = data.get('id')  # Store for delete test
                else:
                    print_error(f"❌ District Manager create failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"District Manager create failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in District Manager create test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"District Manager create test exception: {str(e)}")
        
        # Test 3: Agent access - should return 403 Access Denied
        print_info("\n📋 TEST 3: Agent Create Access Control - Should Be Denied")
        if self.agent_token:
            try:
                headers = {"Authorization": f"Bearer {self.agent_token}"}
                
                interview_data = {
                    "candidate_name": "Test Candidate",
                    "candidate_location": "Test City",
                    "candidate_phone": "555-000-0000",
                    "interview_date": f"{today}T16:00:00",
                    "status": "moving_forward"
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/interviews",
                    json=interview_data,
                    headers=headers
                )
                
                if response.status_code == 403:
                    print_success("✅ Agent correctly denied create access (403)")
                    print_info("   Access control working as expected - only managers can create interviews")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Agent should get 403, got {response.status_code}")
                    print_error(f"   Response: {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Agent create access control failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Agent create access test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Agent create access test exception: {str(e)}")

    def test_interviews_update_endpoint(self):
        """Test PUT /api/interviews/{interview_id} endpoint"""
        print_header("✏️ TESTING INTERVIEWS UPDATE ENDPOINT")
        
        print_info("🎯 Testing PUT /api/interviews/{interview_id} for status changes and 2nd interview scheduling")
        
        # Test 1: State Manager can schedule 2nd interview
        print_info("\n📋 TEST 1: State Manager Schedules 2nd Interview")
        if self.state_manager_token and hasattr(self, 'regional_interview_id'):
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                
                update_data = {
                    "second_interview_date": f"{tomorrow}T10:00:00",
                    "second_interview_notes": "Scheduled for final interview with state manager",
                    "status": "second_interview_scheduled"
                }
                
                response = self.session.put(
                    f"{BACKEND_URL}/interviews/{self.regional_interview_id}",
                    json=update_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can schedule 2nd interview")
                    print_info(f"   Status: {data.get('status', 'Unknown')}")
                    print_info(f"   2nd Interview Date: {data.get('second_interview_date', 'Not set')}")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ State Manager update failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"State Manager update failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager update test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"State Manager update test exception: {str(e)}")
        
        # Test 2: Regional Manager can update their own interview
        print_info("\n📋 TEST 2: Regional Manager Updates Own Interview")
        if self.regional_manager_token and hasattr(self, 'regional_interview_id'):
            try:
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                
                update_data = {
                    "red_flags_notes": "Updated after further consideration - very strong candidate",
                    "candidate_strength": 5
                }
                
                response = self.session.put(
                    f"{BACKEND_URL}/interviews/{self.regional_interview_id}",
                    json=update_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Regional Manager can update their own interview")
                    print_info(f"   Candidate Strength: {data.get('candidate_strength', 'Unknown')}")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Regional Manager update failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Regional Manager update failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Regional Manager update test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Regional Manager update test exception: {str(e)}")
        
        # Test 3: Mark interview as completed
        print_info("\n📋 TEST 3: Mark Interview as Completed")
        if self.state_manager_token and hasattr(self, 'regional_interview_id'):
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                
                update_data = {
                    "status": "completed",
                    "second_interview_notes": "Completed successfully - ready for recruiting pipeline"
                }
                
                response = self.session.put(
                    f"{BACKEND_URL}/interviews/{self.regional_interview_id}",
                    json=update_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Interview marked as completed")
                    print_info(f"   Status: {data.get('status', 'Unknown')}")
                    self.test_results['passed'] += 1
                    self.completed_interview_id = data.get('id')  # Store for recruiting test
                else:
                    print_error(f"❌ Mark completed failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Mark completed failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in mark completed test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Mark completed test exception: {str(e)}")

    def test_interviews_delete_endpoint(self):
        """Test DELETE /api/interviews/{interview_id} endpoint"""
        print_header("🗑️ TESTING INTERVIEWS DELETE ENDPOINT")
        
        print_info("🎯 Testing DELETE /api/interviews/{interview_id} - State Manager only")
        
        # Test 1: State Manager can delete interview
        print_info("\n📋 TEST 1: State Manager Can Delete Interview")
        if self.state_manager_token and hasattr(self, 'district_interview_id'):
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.delete(
                    f"{BACKEND_URL}/interviews/{self.district_interview_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can delete interview")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ State Manager delete failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"State Manager delete failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager delete test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"State Manager delete test exception: {str(e)}")
        
        # Test 2: Regional Manager should be denied delete access
        print_info("\n📋 TEST 2: Regional Manager Delete Access Control - Should Be Denied")
        if self.regional_manager_token:
            try:
                # First create an interview to try to delete
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                today = datetime.now().strftime('%Y-%m-%d')
                
                interview_data = {
                    "candidate_name": "Delete Test Candidate",
                    "candidate_location": "Test City",
                    "candidate_phone": "555-999-9999",
                    "interview_date": f"{today}T12:00:00",
                    "status": "not_moving_forward"
                }
                
                create_response = self.session.post(
                    f"{BACKEND_URL}/interviews",
                    json=interview_data,
                    headers=headers
                )
                
                if create_response.status_code == 200:
                    interview_id = create_response.json().get('id')
                    
                    # Now try to delete it as Regional Manager
                    delete_response = self.session.delete(
                        f"{BACKEND_URL}/interviews/{interview_id}",
                        headers=headers
                    )
                    
                    if delete_response.status_code == 403:
                        print_success("✅ Regional Manager correctly denied delete access (403)")
                        print_info("   Access control working - only State Manager can delete")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ Regional Manager should get 403, got {delete_response.status_code}")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append(f"Regional Manager delete access control failed: {delete_response.status_code}")
                else:
                    print_error("❌ Could not create interview for delete test")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in Regional Manager delete test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Regional Manager delete test exception: {str(e)}")

    def test_add_to_recruiting_endpoint(self):
        """Test POST /api/interviews/{interview_id}/add-to-recruiting endpoint"""
        print_header("🎯 TESTING ADD TO RECRUITING PIPELINE ENDPOINT")
        
        print_info("🎯 Testing POST /api/interviews/{interview_id}/add-to-recruiting")
        
        # Test 1: State Manager can add completed interview to recruiting
        print_info("\n📋 TEST 1: State Manager Adds Completed Interview to Recruiting")
        if self.state_manager_token and hasattr(self, 'completed_interview_id'):
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.post(
                    f"{BACKEND_URL}/interviews/{self.completed_interview_id}/add-to-recruiting",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can add interview to recruiting pipeline")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    
                    # Verify recruit was created
                    recruit_data = data.get('recruit', {})
                    if recruit_data:
                        print_success("✅ Recruit created successfully")
                        print_info(f"   Recruit Name: {recruit_data.get('name', 'Unknown')}")
                        print_info(f"   Recruit Phone: {recruit_data.get('phone', 'Unknown')}")
                        print_info(f"   Recruit ID: {recruit_data.get('id', 'Unknown')}")
                        self.test_results['passed'] += 1
                        self.recruit_id = recruit_data.get('id')  # Store for verification
                    else:
                        print_error("❌ No recruit data returned")
                        self.test_results['failed'] += 1
                        
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Add to recruiting failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Add to recruiting failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in add to recruiting test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Add to recruiting test exception: {str(e)}")
        
        # Test 2: Verify recruit was actually created in recruiting collection
        print_info("\n📋 TEST 2: Verify Recruit Created in Recruiting Collection")
        if self.state_manager_token and hasattr(self, 'recruit_id'):
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/recruiting", headers=headers)
                
                if response.status_code == 200:
                    recruits = response.json()
                    
                    # Find our recruit
                    found_recruit = None
                    for recruit in recruits:
                        if recruit.get('id') == self.recruit_id:
                            found_recruit = recruit
                            break
                    
                    if found_recruit:
                        print_success("✅ Recruit found in recruiting collection")
                        print_info(f"   Name: {found_recruit.get('name', 'Unknown')}")
                        print_info(f"   Phone: {found_recruit.get('phone', 'Unknown')}")
                        print_info(f"   Comments: {found_recruit.get('comments', 'No comments')}")
                        self.test_results['passed'] += 1
                    else:
                        print_error("❌ Recruit not found in recruiting collection")
                        self.test_results['failed'] += 1
                        self.test_results['errors'].append("Recruit not found in collection")
                else:
                    print_error(f"❌ Could not fetch recruiting data: {response.status_code}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in recruit verification test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Recruit verification test exception: {str(e)}")
        
        # Test 3: Regional Manager should be denied access
        print_info("\n📋 TEST 3: Regional Manager Add to Recruiting Access Control - Should Be Denied")
        if self.regional_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                response = self.session.post(
                    f"{BACKEND_URL}/interviews/fake-id/add-to-recruiting",
                    headers=headers
                )
                
                if response.status_code == 403:
                    print_success("✅ Regional Manager correctly denied add to recruiting access (403)")
                    print_info("   Access control working - only State Manager can add to recruiting")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Regional Manager should get 403, got {response.status_code}")
                    self.test_results['failed'] += 1
                    self.test_results['errors'].append(f"Regional Manager add to recruiting access control failed: {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ Exception in Regional Manager add to recruiting test: {str(e)}")
                self.test_results['failed'] += 1
                self.test_results['errors'].append(f"Regional Manager add to recruiting test exception: {str(e)}")

    def run_all_tests(self):
        """Run all Interview Management functionality tests"""
        print_header("🚀 STARTING COMPREHENSIVE INTERVIEW MANAGEMENT FUNCTIONALITY TESTING")
        
        # Setup test users
        if not self.setup_test_users():
            print_error("Failed to setup test users - aborting tests")
            return False
        
        # Run all test suites
        self.test_interviews_get_endpoint()
        self.test_interviews_stats_endpoint()
        self.test_interviews_create_endpoint()
        self.test_interviews_update_endpoint()
        self.test_interviews_delete_endpoint()
        self.test_add_to_recruiting_endpoint()
        
        # Print final results
        self.print_final_results()
        
        return self.test_results['failed'] == 0

    def print_final_results(self):
        """Print comprehensive test results"""
        print_header("📊 INTERVIEW MANAGEMENT FUNCTIONALITY TEST RESULTS")
        
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
            print_success("🎉 ALL INTERVIEW MANAGEMENT FUNCTIONALITY TESTS PASSED!")
            print_success("✅ Manager role access levels working correctly")
            print_success("✅ Interview creation with comprehensive fields working correctly")
            print_success("✅ Interview status transitions and updates working correctly")
            print_success("✅ State Manager delete permissions working correctly")
            print_success("✅ Add to recruiting pipeline working correctly")
            print_success("✅ Access control for different manager levels working correctly")
        else:
            print_error("❌ SOME TESTS FAILED - INTERVIEW MANAGEMENT FUNCTIONALITY NEEDS ATTENTION")

if __name__ == "__main__":
    tester = NewFaceCustomerTester()
    success = tester.run_all_tests()
    
    if success:
        print_success("\n🎉 All New Face Customer functionality tests completed successfully!")
        sys.exit(0)
    else:
        print_error("\n💥 Some New Face Customer functionality tests failed!")
        sys.exit(1)
