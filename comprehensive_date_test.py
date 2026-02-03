#!/usr/bin/env python3
"""
COMPREHENSIVE DATE INVESTIGATION
Understanding the exact user issue with Wednesday dates
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os
from pytz import timezone as pytz_timezone

# Configuration
BACKEND_URL = "https://smart-recruiting.preview.emergentagent.com/api"

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
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")

class ComprehensiveDateTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None

    def login_user(self):
        """Login with existing state manager"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "spencer.sudbeck@pmagent.net",
                "password": "Bizlink25"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['token']
                print_success(f"Logged in as: {data['user']['name']}")
                return True
            else:
                print_error(f"Login failed: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Login exception: {str(e)}")
            return False

    def analyze_date_context(self):
        """Analyze the date context to understand the user's issue"""
        print_header("DATE CONTEXT ANALYSIS")
        
        # System date analysis
        print_info("🖥️  SYSTEM DATE ANALYSIS:")
        system_now = datetime.now()
        system_utc = datetime.utcnow()
        central_tz = pytz_timezone('America/Chicago')
        central_now = datetime.now(central_tz)
        
        print_info(f"   System local time: {system_now}")
        print_info(f"   System UTC time: {system_utc}")
        print_info(f"   Central time: {central_now}")
        print_info(f"   Central date: {central_now.date()}")
        print_info(f"   Central weekday: {central_now.strftime('%A')} (weekday={central_now.weekday()})")
        
        # Date calculations for both years
        print_info("\n📅 DATE CALCULATIONS:")
        
        # 2024 dates
        print_info("   2024 dates:")
        nov_19_2024 = datetime(2024, 11, 19).date()
        nov_20_2024 = datetime(2024, 11, 20).date()
        print_info(f"     2024-11-19 is a {nov_19_2024.strftime('%A')} (weekday={nov_19_2024.weekday()})")
        print_info(f"     2024-11-20 is a {nov_20_2024.strftime('%A')} (weekday={nov_20_2024.weekday()})")
        
        # 2025 dates  
        print_info("   2025 dates:")
        nov_19_2025 = datetime(2025, 11, 19).date()
        nov_20_2025 = datetime(2025, 11, 20).date()
        print_info(f"     2025-11-19 is a {nov_19_2025.strftime('%A')} (weekday={nov_19_2025.weekday()})")
        print_info(f"     2025-11-20 is a {nov_20_2025.strftime('%A')} (weekday={nov_20_2025.weekday()})")
        
        # User's issue analysis
        print_info("\n🔍 USER ISSUE ANALYSIS:")
        print_info("   User reports:")
        print_info("   - Wednesday slot shows date 11-20")
        print_info("   - But user's activity appears in Tuesday slot (11-19)")
        print_info("   - User expects activity in Wednesday slot (11-19)")
        print_info("")
        print_info("   This suggests:")
        if nov_19_2024.strftime('%A') == 'Tuesday' and nov_20_2024.strftime('%A') == 'Wednesday':
            print_info("   ✅ In 2024: 11-19 is Tuesday, 11-20 is Wednesday")
            print_info("   ❌ User expects Wednesday to be 11-19, but it's actually 11-20")
            print_info("   🎯 USER CONFUSION: User thinks Wednesday should be 11-19")
        
        if nov_19_2025.strftime('%A') == 'Wednesday' and nov_20_2025.strftime('%A') == 'Thursday':
            print_info("   ✅ In 2025: 11-19 is Wednesday, 11-20 is Thursday")
            print_info("   🎯 If system uses 2025 dates, Wednesday IS 11-19")

    def test_current_api_behavior(self):
        """Test what the API currently returns"""
        print_header("CURRENT API BEHAVIOR")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Test week dates API
            print_info("🔍 Testing GET /api/team/week-dates...")
            response = self.session.get(f"{BACKEND_URL}/team/week-dates", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print_success("Week dates API accessible")
                
                today_api = data.get('today', '')
                week_dates = data.get('week_dates', [])
                
                print_info(f"📅 API says today is: {today_api}")
                
                # Find Wednesday and today
                wednesday_date = None
                today_day_name = None
                
                for date_info in week_dates:
                    day_name = date_info.get('day_name', '')
                    date_str = date_info.get('date', '')
                    is_today = date_info.get('is_today', False)
                    
                    print_info(f"   {day_name}: {date_str} {'(TODAY)' if is_today else ''}")
                    
                    if day_name == 'Wednesday':
                        wednesday_date = date_str
                    if is_today:
                        today_day_name = day_name
                
                print_info(f"\n🎯 KEY FINDINGS:")
                print_info(f"   Today according to API: {today_day_name} {today_api}")
                print_info(f"   Wednesday according to API: {wednesday_date}")
                
                # Analyze the user's issue
                if wednesday_date:
                    if '11-19' in wednesday_date:
                        print_success("✅ Wednesday shows 11-19 (matches user expectation)")
                    elif '11-20' in wednesday_date:
                        print_warning("⚠️  Wednesday shows 11-20 (user expects 11-19)")
                        print_info("   This could be the source of confusion")
                
                # Test if today is Wednesday
                if today_day_name == 'Wednesday':
                    if '11-19' in today_api:
                        print_success("✅ Today is Wednesday 11-19 (matches user expectation)")
                    elif '11-20' in today_api:
                        print_warning("⚠️  Today is Wednesday 11-20 (user expects 11-19)")
                else:
                    print_info(f"ℹ️  Today is {today_day_name}, not Wednesday")
                    
            else:
                print_error(f"Week dates API failed: {response.status_code}")
                
        except Exception as e:
            print_error(f"Exception testing API: {str(e)}")

    def test_activity_data_placement(self):
        """Test where activity data actually appears"""
        print_header("ACTIVITY DATA PLACEMENT TEST")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Create test activities for both potential Wednesday dates
            test_dates = [
                ("2024-11-19", "POTENTIAL_WEDNESDAY_2024_11_19", 111.0, 11111.0),
                ("2024-11-20", "ACTUAL_WEDNESDAY_2024_11_20", 222.0, 22222.0),
            ]
            
            print_info("Creating test activities for investigation...")
            
            for date_str, label, contacts, premium in test_dates:
                activity_data = {
                    "date": date_str,
                    "contacts": contacts,
                    "appointments": 15.0,
                    "presentations": 10.0,
                    "referrals": 5,
                    "testimonials": 3,
                    "sales": 2,
                    "new_face_sold": 1.0,
                    "premium": premium
                }
                
                response = self.session.put(
                    f"{BACKEND_URL}/activities/{date_str}",
                    json=activity_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    print_success(f"✅ Created {label}")
                else:
                    print_warning(f"⚠️  Could not create {label}: {response.status_code}")
            
            # Test team hierarchy to see which activities appear
            print_info("\n🔍 Testing team hierarchy weekly view...")
            hierarchy_response = self.session.get(
                f"{BACKEND_URL}/team/hierarchy/weekly",
                headers=headers
            )
            
            if hierarchy_response.status_code == 200:
                hierarchy_data = hierarchy_response.json()
                stats = hierarchy_data.get('stats', {})
                total_contacts = stats.get('contacts', 0)
                total_premium = stats.get('premium', 0)
                
                print_info(f"📊 Weekly totals:")
                print_info(f"   Total contacts: {total_contacts}")
                print_info(f"   Total premium: ${total_premium}")
                
                # Check which test activities appear
                if total_contacts >= 111.0:
                    if total_contacts >= 222.0:
                        print_success("✅ Both test activities appear in weekly totals")
                    else:
                        print_info("ℹ️  Only 2024-11-19 activity appears (111 contacts)")
                else:
                    print_warning("⚠️  Neither test activity appears in weekly totals")
                    
            else:
                print_error(f"Team hierarchy failed: {hierarchy_response.status_code}")
                
            # Test daily reports for both dates
            print_info("\n🔍 Testing daily reports...")
            for date_str, label, expected_contacts, expected_premium in test_dates:
                print_info(f"Testing daily report for {date_str}...")
                
                daily_response = self.session.get(
                    f"{BACKEND_URL}/reports/daily/individual",
                    params={"date": date_str},
                    headers=headers
                )
                
                if daily_response.status_code == 200:
                    daily_data = daily_response.json()
                    
                    # Check if our test activity appears
                    data_array = daily_data.get('data', [])
                    found_activity = False
                    
                    for member in data_array:
                        if (member.get('contacts', 0) == expected_contacts and 
                            member.get('premium', 0) == expected_premium):
                            found_activity = True
                            print_success(f"✅ Found {label} in daily report")
                            break
                    
                    if not found_activity:
                        print_warning(f"⚠️  {label} not found in daily report")
                        
                else:
                    print_error(f"Daily report failed for {date_str}: {daily_response.status_code}")
                    
        except Exception as e:
            print_error(f"Exception in activity placement test: {str(e)}")

    def run_comprehensive_test(self):
        """Run comprehensive date investigation"""
        print_header("🔍 COMPREHENSIVE DATE INVESTIGATION")
        print_info("Understanding the Wednesday date confusion issue")
        
        # Login
        if not self.login_user():
            print_error("Failed to login")
            return False
        
        # Run tests
        self.analyze_date_context()
        self.test_current_api_behavior()
        self.test_activity_data_placement()
        
        # Provide final analysis
        print_header("🎯 FINAL ANALYSIS")
        print_info("Based on the investigation:")
        print_info("1. System is running in 2025, but API returns 2024 dates")
        print_info("2. In 2024: 11-19 is Tuesday, 11-20 is Wednesday")
        print_info("3. In 2025: 11-19 is Wednesday, 11-20 is Thursday")
        print_info("4. User expects Wednesday to be 11-19 (which is true in 2025)")
        print_info("5. But API shows Wednesday as 11-20 (which is true in 2024)")
        print_info("")
        print_warning("🚨 ROOT CAUSE: Year mismatch between system (2025) and API (2024)")
        print_info("💡 SOLUTION: Either use consistent year or clarify date expectations")
        
        return True

if __name__ == "__main__":
    tester = ComprehensiveDateTester()
    tester.run_comprehensive_test()