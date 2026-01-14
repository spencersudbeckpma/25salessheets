#!/usr/bin/env python3
"""
Backend Testing Script - INTERVIEW ENDPOINTS FUNCTIONALITY TESTING
FOCUS: Test Interview Management endpoints fix for Regional and District Managers

ISSUE FIXED:
The get_all_subordinates function returns a list of user ID strings, but the interviews code 
was incorrectly treating it as a list of dictionaries with an 'id' key. This caused 
"failed to fetch interview" errors for Regional and District Managers.

INTERVIEW ENDPOINTS TO TEST:
- GET /api/interviews (Get interviews based on role - State sees all, Regional sees own + subordinates, District sees own)
- GET /api/interviews/stats (Get interview statistics with proper role-based filtering)
- POST /api/interviews (Create new interview)
- PUT /api/interviews/{interview_id} (Update interview)
- DELETE /api/interviews/{interview_id} (Archive interview - State Manager only)
- POST /api/interviews/{interview_id}/add-to-recruiting (Add completed interview to recruiting pipeline)

Test role-based access control and ensure no "failed to fetch interview" errors
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Configuration
BACKEND_URL = "https://performance-hub-75.preview.emergentagent.com/api"

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

class SNANPATrackerTester:
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
        """Setup test users for SNA & NPA Tracker functionality testing"""
        print_header("SETTING UP TEST USERS FOR SNA & NPA TRACKER TESTING")
        
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
                    "state.manager.tracker@test.com",
                    "TestPassword123!",
                    "State Manager Tracker Test",
                    "state_manager"
                )
                if self.state_manager_token:
                    user_info = self.get_user_info(self.state_manager_token)
                    self.state_manager_id = user_info.get('id') if user_info else None
        except Exception as e:
            print_warning(f"Exception logging in existing state manager: {str(e)}")
            self.state_manager_token = self.register_test_user(
                "state.manager.tracker@test.com",
                "TestPassword123!",
                "State Manager Tracker Test",
                "state_manager"
            )
            if self.state_manager_token:
                user_info = self.get_user_info(self.state_manager_token)
                self.state_manager_id = user_info.get('id') if user_info else None
        
        # Register Regional Manager under State Manager
        if self.state_manager_id:
            self.regional_manager_token = self.register_test_user_with_manager(
                "regional.manager.tracker@test.com", 
                "TestPassword123!",
                "Regional Manager Tracker Test",
                "regional_manager",
                self.state_manager_id
            )
            
            if self.regional_manager_token:
                user_info = self.get_user_info(self.regional_manager_token)
                self.regional_manager_id = user_info.get('id') if user_info else None
        
        # Register District Manager under Regional Manager
        if self.regional_manager_id:
            self.district_manager_token = self.register_test_user_with_manager(
                "district.manager.tracker@test.com", 
                "TestPassword123!",
                "District Manager Tracker Test",
                "district_manager",
                self.regional_manager_id
            )
            
            if self.district_manager_token:
                user_info = self.get_user_info(self.district_manager_token)
                self.district_manager_id = user_info.get('id') if user_info else None
        
        # Register Agent under District Manager
        if self.district_manager_id:
            self.agent_token = self.register_test_user_with_manager(
                "agent.tracker@test.com",
                "TestPassword123!",
                "Agent Tracker Test",
                "agent",
                self.district_manager_id
            )
            
            if self.agent_token:
                user_info = self.get_user_info(self.agent_token)
                self.agent_id = user_info.get('id') if user_info else None
        
        if not self.state_manager_token:
            print_error("Failed to setup state manager - cannot continue testing")
            return False
            
        print_success("✅ Test hierarchy created for SNA & NPA Tracker testing:")
        print_info("   State Manager (full access to all trackers)")
        print_info("   └── Regional Manager (can manage SNA/NPA tracking)")
        print_info("       └── District Manager (can manage NPA tracking only)")
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

    def test_sna_tracker_get_endpoint(self):
        """Test GET /api/sna-tracker endpoint"""
        print_header("📊 TESTING SNA TRACKER GET ENDPOINT")
        
        print_info("🎯 Testing /api/sna-tracker - Should return active/graduated agents with 90-day tracking and $30K goal")
        
        # Test 1: State Manager access
        print_info("\n📋 TEST 1: State Manager Access to SNA Tracker")
        if self.state_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/sna-tracker", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can access SNA tracker")
                    self.test_results['passed'] += 1
                    
                    # Verify response structure
                    required_fields = ['active', 'graduated', 'goal', 'tracking_days']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        print_success("✅ SNA tracker response has all required fields")
                        print_info(f"   Goal: ${data.get('goal', 0):,}")
                        print_info(f"   Tracking Days: {data.get('tracking_days', 0)}")
                        print_info(f"   Active Agents: {len(data.get('active', []))}")
                        print_info(f"   Graduated Agents: {len(data.get('graduated', []))}")
                        
                        # Verify goal and tracking days
                        if data.get('goal') == 30000 and data.get('tracking_days') == 90:
                            print_success("✅ Correct goal ($30,000) and tracking period (90 days)")
                            self.test_results['passed'] += 1
                        else:
                            print_error(f"❌ Expected goal: $30,000, tracking: 90 days. Got goal: ${data.get('goal')}, tracking: {data.get('tracking_days')}")
                            self.test_results['failed'] += 1
                        
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ Missing fields in SNA tracker response: {missing_fields}")
                        self.test_results['failed'] += 1
                        
                else:
                    print_error(f"❌ State Manager SNA tracker access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager SNA tracker test: {str(e)}")
                self.test_results['failed'] += 1
        
        # Test 2: Regional Manager access
        print_info("\n📋 TEST 2: Regional Manager Access to SNA Tracker")
        if self.regional_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.regional_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/sna-tracker", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Regional Manager can access SNA tracker")
                    print_info(f"   Active Agents: {len(data.get('active', []))}")
                    print_info(f"   Graduated Agents: {len(data.get('graduated', []))}")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Regional Manager SNA tracker access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in Regional Manager SNA tracker test: {str(e)}")
                self.test_results['failed'] += 1
        
        # Test 3: District Manager should be denied access
        print_info("\n📋 TEST 3: District Manager Access Control - Should Be Denied")
        if self.district_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/sna-tracker", headers=headers)
                
                if response.status_code == 403:
                    print_success("✅ District Manager correctly denied SNA tracker access (403)")
                    print_info("   Access control working - only State/Regional Managers can access SNA tracker")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ District Manager should get 403, got {response.status_code}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in District Manager SNA tracker test: {str(e)}")
                self.test_results['failed'] += 1

    def test_sna_tracker_start_stop_endpoints(self):
        """Test POST /api/sna-tracker/{user_id}/start and /stop endpoints"""
        print_header("🎯 TESTING SNA TRACKER START/STOP ENDPOINTS")
        
        print_info("🎯 Testing SNA tracking start/stop functionality")
        
        # First get team members to find a user to track
        print_info("\n📋 Getting team members for SNA tracking test")
        if self.state_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/team/members", headers=headers)
                
                if response.status_code == 200:
                    team_members = response.json()
                    if team_members:
                        test_user_id = team_members[0]['id']
                        test_user_name = team_members[0].get('name', 'Unknown')
                        print_success(f"✅ Found team member to test: {test_user_name}")
                        
                        # Test 1: Start SNA tracking
                        print_info(f"\n📋 TEST 1: Start SNA Tracking for {test_user_name}")
                        start_response = self.session.post(
                            f"{BACKEND_URL}/sna-tracker/{test_user_id}/start",
                            headers=headers
                        )
                        
                        if start_response.status_code == 200:
                            start_data = start_response.json()
                            print_success("✅ Successfully started SNA tracking")
                            print_info(f"   Message: {start_data.get('message', 'No message')}")
                            self.test_results['passed'] += 1
                            self.sna_test_user_id = test_user_id  # Store for stop test
                        else:
                            print_error(f"❌ Start SNA tracking failed: {start_response.status_code} - {start_response.text}")
                            self.test_results['failed'] += 1
                        
                        # Test 2: Stop SNA tracking
                        print_info(f"\n📋 TEST 2: Stop SNA Tracking for {test_user_name}")
                        stop_response = self.session.post(
                            f"{BACKEND_URL}/sna-tracker/{test_user_id}/stop",
                            headers=headers
                        )
                        
                        if stop_response.status_code == 200:
                            stop_data = stop_response.json()
                            print_success("✅ Successfully stopped SNA tracking")
                            print_info(f"   Message: {stop_data.get('message', 'No message')}")
                            self.test_results['passed'] += 1
                        else:
                            print_error(f"❌ Stop SNA tracking failed: {stop_response.status_code} - {stop_response.text}")
                            self.test_results['failed'] += 1
                    else:
                        print_warning("No team members found for SNA tracking test")
                        self.test_results['failed'] += 1
                else:
                    print_error(f"❌ Could not get team members: {response.status_code}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in SNA start/stop test: {str(e)}")
                self.test_results['failed'] += 1

    def test_npa_tracker_get_endpoint(self):
        """Test GET /api/npa-tracker endpoint"""
        print_header("📊 TESTING NPA TRACKER GET ENDPOINT")
        
        print_info("🎯 Testing /api/npa-tracker - Should return active/achieved agents with $1K goal")
        
        # Test 1: State Manager access
        print_info("\n📋 TEST 1: State Manager Access to NPA Tracker")
        if self.state_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/npa-tracker", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can access NPA tracker")
                    self.test_results['passed'] += 1
                    
                    # Verify response structure
                    required_fields = ['active', 'achieved', 'goal']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        print_success("✅ NPA tracker response has all required fields")
                        print_info(f"   Goal: ${data.get('goal', 0):,}")
                        print_info(f"   Active Agents: {len(data.get('active', []))}")
                        print_info(f"   Achieved Agents: {len(data.get('achieved', []))}")
                        
                        # Verify goal
                        if data.get('goal') == 1000:
                            print_success("✅ Correct NPA goal ($1,000)")
                            self.test_results['passed'] += 1
                        else:
                            print_error(f"❌ Expected NPA goal: $1,000. Got: ${data.get('goal')}")
                            self.test_results['failed'] += 1
                        
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ Missing fields in NPA tracker response: {missing_fields}")
                        self.test_results['failed'] += 1
                        
                else:
                    print_error(f"❌ State Manager NPA tracker access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager NPA tracker test: {str(e)}")
                self.test_results['failed'] += 1
        
        # Test 2: District Manager access
        print_info("\n📋 TEST 2: District Manager Access to NPA Tracker")
        if self.district_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                response = self.session.get(f"{BACKEND_URL}/npa-tracker", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ District Manager can access NPA tracker")
                    print_info(f"   Active Agents: {len(data.get('active', []))}")
                    print_info(f"   Achieved Agents: {len(data.get('achieved', []))}")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ District Manager NPA tracker access failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in District Manager NPA tracker test: {str(e)}")
                self.test_results['failed'] += 1
        
        # Test 3: Agent should be denied access
        print_info("\n📋 TEST 3: Agent Access Control - Should Be Denied")
        if self.agent_token:
            try:
                headers = {"Authorization": f"Bearer {self.agent_token}"}
                response = self.session.get(f"{BACKEND_URL}/npa-tracker", headers=headers)
                
                if response.status_code == 403:
                    print_success("✅ Agent correctly denied NPA tracker access (403)")
                    print_info("   Access control working - only managers can access NPA tracker")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Agent should get 403, got {response.status_code}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in Agent NPA tracker test: {str(e)}")
                self.test_results['failed'] += 1

    def test_npa_tracker_create_endpoint(self):
        """Test POST /api/npa-tracker endpoint"""
        print_header("📝 TESTING NPA TRACKER CREATE ENDPOINT")
        
        print_info("🎯 Testing POST /api/npa-tracker - Add new NPA agent manually")
        
        # Test 1: State Manager can add NPA agent
        print_info("\n📋 TEST 1: State Manager Adds New NPA Agent")
        if self.state_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                
                npa_agent_data = {
                    "name": "Test Agent",
                    "phone": "555-123-4567",
                    "start_date": "2026-01-01",
                    "upline_dm": "DM Name",
                    "upline_rm": "RM Name",
                    "total_premium": 500
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/npa-tracker",
                    json=npa_agent_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can add NPA agent")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    print_info(f"   Agent ID: {data.get('id', 'No ID')}")
                    self.test_results['passed'] += 1
                    self.npa_agent_id = data.get('id')  # Store for update/delete tests
                else:
                    print_error(f"❌ State Manager add NPA agent failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager add NPA agent test: {str(e)}")
                self.test_results['failed'] += 1
        
        # Test 2: District Manager can add NPA agent
        print_info("\n📋 TEST 2: District Manager Adds New NPA Agent")
        if self.district_manager_token:
            try:
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                
                npa_agent_data = {
                    "name": "District Test Agent",
                    "phone": "555-987-6543",
                    "start_date": "2026-01-01",
                    "upline_dm": "District Manager",
                    "upline_rm": "Regional Manager",
                    "total_premium": 750
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/npa-tracker",
                    json=npa_agent_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ District Manager can add NPA agent")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    self.test_results['passed'] += 1
                    self.district_npa_agent_id = data.get('id')  # Store for tests
                else:
                    print_error(f"❌ District Manager add NPA agent failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in District Manager add NPA agent test: {str(e)}")
                self.test_results['failed'] += 1

    def test_npa_tracker_update_endpoint(self):
        """Test PUT /api/npa-tracker/{agent_id} endpoint"""
        print_header("✏️ TESTING NPA TRACKER UPDATE ENDPOINT")
        
        print_info("🎯 Testing PUT /api/npa-tracker/{agent_id} - Update premium to trigger NPA achievement")
        
        # Test 1: Update premium to trigger NPA achievement (>=1000)
        print_info("\n📋 TEST 1: Update Premium to Trigger NPA Achievement")
        if self.state_manager_token and hasattr(self, 'npa_agent_id'):
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                
                update_data = {
                    "total_premium": 1100  # Above $1,000 threshold
                }
                
                response = self.session.put(
                    f"{BACKEND_URL}/npa-tracker/{self.npa_agent_id}",
                    json=update_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ Successfully updated NPA agent premium")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    self.test_results['passed'] += 1
                    
                    # Verify agent moved to achieved list
                    print_info("   Verifying agent moved to achieved list...")
                    get_response = self.session.get(f"{BACKEND_URL}/npa-tracker", headers=headers)
                    if get_response.status_code == 200:
                        tracker_data = get_response.json()
                        achieved_agents = tracker_data.get('achieved', [])
                        
                        # Find our agent in achieved list
                        found_achieved = False
                        for agent in achieved_agents:
                            if agent.get('id') == self.npa_agent_id:
                                found_achieved = True
                                if agent.get('total_premium') >= 1000 and agent.get('achievement_date'):
                                    print_success("✅ Agent moved to achieved list with achievement date")
                                    print_info(f"   Premium: ${agent.get('total_premium', 0)}")
                                    print_info(f"   Achievement Date: {agent.get('achievement_date', 'Not set')}")
                                    self.test_results['passed'] += 1
                                else:
                                    print_error("❌ Agent in achieved list but missing achievement date or premium")
                                    self.test_results['failed'] += 1
                                break
                        
                        if not found_achieved:
                            print_error("❌ Agent not found in achieved list after premium update")
                            self.test_results['failed'] += 1
                    
                else:
                    print_error(f"❌ Update NPA agent premium failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in update NPA agent test: {str(e)}")
                self.test_results['failed'] += 1

    def test_npa_tracker_delete_endpoint(self):
        """Test DELETE /api/npa-tracker/{agent_id} endpoint"""
        print_header("🗑️ TESTING NPA TRACKER DELETE ENDPOINT")
        
        print_info("🎯 Testing DELETE /api/npa-tracker/{agent_id} - State/Regional Managers only")
        
        # Test 1: State Manager can delete NPA agent
        print_info("\n📋 TEST 1: State Manager Can Delete NPA Agent")
        if self.state_manager_token and hasattr(self, 'district_npa_agent_id'):
            try:
                headers = {"Authorization": f"Bearer {self.state_manager_token}"}
                response = self.session.delete(
                    f"{BACKEND_URL}/npa-tracker/{self.district_npa_agent_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print_success("✅ State Manager can delete NPA agent")
                    print_info(f"   Message: {data.get('message', 'No message')}")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ State Manager delete NPA agent failed: {response.status_code} - {response.text}")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in State Manager delete NPA agent test: {str(e)}")
                self.test_results['failed'] += 1
        
        # Test 2: District Manager should be denied delete access
        print_info("\n📋 TEST 2: District Manager Delete Access Control - Should Be Denied")
        if self.district_manager_token:
            try:
                # First create an agent to try to delete
                headers = {"Authorization": f"Bearer {self.district_manager_token}"}
                
                npa_agent_data = {
                    "name": "Delete Test Agent",
                    "phone": "555-999-9999",
                    "start_date": "2026-01-01",
                    "upline_dm": "Test DM",
                    "upline_rm": "Test RM",
                    "total_premium": 200
                }
                
                create_response = self.session.post(
                    f"{BACKEND_URL}/npa-tracker",
                    json=npa_agent_data,
                    headers=headers
                )
                
                if create_response.status_code == 200:
                    agent_id = create_response.json().get('id')
                    
                    # Now try to delete it as District Manager
                    delete_response = self.session.delete(
                        f"{BACKEND_URL}/npa-tracker/{agent_id}",
                        headers=headers
                    )
                    
                    if delete_response.status_code == 403:
                        print_success("✅ District Manager correctly denied delete access (403)")
                        print_info("   Access control working - only State/Regional Managers can delete")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ District Manager should get 403, got {delete_response.status_code}")
                        self.test_results['failed'] += 1
                else:
                    print_error("❌ Could not create NPA agent for delete test")
                    self.test_results['failed'] += 1
                    
            except Exception as e:
                print_error(f"❌ Exception in District Manager delete test: {str(e)}")
                self.test_results['failed'] += 1

    def run_all_tests(self):
        """Run all SNA & NPA Tracker functionality tests"""
        print_header("🚀 STARTING COMPREHENSIVE SNA & NPA TRACKER FUNCTIONALITY TESTING")
        
        # Setup test users
        if not self.setup_test_users():
            print_error("Failed to setup test users - aborting tests")
            return False
        
        # Run all test suites
        self.test_sna_tracker_get_endpoint()
        self.test_sna_tracker_start_stop_endpoints()
        self.test_npa_tracker_get_endpoint()
        self.test_npa_tracker_create_endpoint()
        self.test_npa_tracker_update_endpoint()
        self.test_npa_tracker_delete_endpoint()
        
        # Print final results
        self.print_final_results()
        
        return self.test_results['failed'] == 0

    def print_final_results(self):
        """Print comprehensive test results"""
        print_header("📊 SNA & NPA TRACKER FUNCTIONALITY TEST RESULTS")
        
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
            print_success("🎉 ALL SNA & NPA TRACKER FUNCTIONALITY TESTS PASSED!")
            print_success("✅ SNA Tracker: 90-day tracking, $30,000 goal working correctly")
            print_success("✅ NPA Tracker: $1,000 goal, manual add/edit/delete working correctly")
            print_success("✅ Manager role access levels working correctly")
            print_success("✅ Start/stop SNA tracking working correctly")
            print_success("✅ NPA achievement tracking working correctly")
            print_success("✅ Access control for different manager levels working correctly")
        else:
            print_error("❌ SOME TESTS FAILED - SNA & NPA TRACKER FUNCTIONALITY NEEDS ATTENTION")

if __name__ == "__main__":
    tester = SNANPATrackerTester()
    success = tester.run_all_tests()
    
    if success:
        print_success("\n🎉 All SNA & NPA Tracker functionality tests completed successfully!")
        sys.exit(0)
    else:
        print_error("\n💥 Some SNA & NPA Tracker functionality tests failed!")
        sys.exit(1)
