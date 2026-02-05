#!/usr/bin/env python3
"""
URGENT DATE CALCULATION DEBUG TEST
Focus: Debug the exact issue reported by user:
- Wednesday slot shows date 11-20
- But user's activity appears in Tuesday slot (11-19) 
- User expects activity in Wednesday slot (11-19)

This means if today is Wednesday, it should be 11-19, not 11-20.

CRITICAL TESTS:
1. What does the system think today's date is?
2. What day of the week does the system think today is?
3. Check the week calculation math
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os
from pytz import timezone as pytz_timezone

# Configuration
BACKEND_URL = "https://interviewplus.preview.emergentagent.com/api"

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

class DateCalculationDebugger:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'critical_issues': []
        }

    def login_user(self):
        """Login with existing state manager"""
        print_header("AUTHENTICATION")
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "spencer.sudbeck@pmagent.net",
                "password": "Bizlink25"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['token']
                print_success(f"Logged in as: {data['user']['name']} ({data['user']['role']})")
                return True
            else:
                print_error(f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Login exception: {str(e)}")
            return False

    def test_system_date_calculation(self):
        """Test what the system thinks today's date is"""
        print_header("SYSTEM DATE CALCULATION TEST")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Test GET /api/team/week-dates
            print_info("Testing GET /api/team/week-dates...")
            response = self.session.get(f"{BACKEND_URL}/team/week-dates", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print_success("Week dates endpoint accessible")
                
                # Extract key information
                today_from_api = data.get('today', '')
                week_start = data.get('week_start', '')
                week_dates = data.get('week_dates', [])
                
                print_info(f"🗓️  System thinks TODAY is: {today_from_api}")
                print_info(f"📅 Week start (Monday): {week_start}")
                
                # Find today and Wednesday
                today_info = None
                wednesday_info = None
                
                for date_info in week_dates:
                    day_name = date_info.get('day_name', '')
                    date_str = date_info.get('date', '')
                    is_today = date_info.get('is_today', False)
                    
                    print_info(f"   {day_name}: {date_str} {'(TODAY)' if is_today else ''}")
                    
                    if is_today:
                        today_info = date_info
                    if day_name == 'Wednesday':
                        wednesday_info = date_info
                
                # CRITICAL ANALYSIS
                print_header("CRITICAL DATE ANALYSIS")
                
                if today_info:
                    today_day = today_info.get('day_name', '')
                    today_date = today_info.get('date', '')
                    print_info(f"🎯 System identifies TODAY as: {today_day} {today_date}")
                    
                    # Check if today is Wednesday
                    if today_day == 'Wednesday':
                        print_success("✅ Today is Wednesday according to system")
                        
                        # Check the date format
                        if '11-19' in today_date:
                            print_success("✅ Wednesday date contains 11-19 (expected)")
                            self.test_results['passed'] += 1
                        elif '11-20' in today_date:
                            print_error("❌ CRITICAL BUG: Wednesday shows 11-20 instead of 11-19!")
                            print_error("   This matches user's report: Wednesday slot shows 11-20")
                            self.test_results['failed'] += 1
                            self.test_results['critical_issues'].append("Wednesday shows wrong date (11-20 instead of 11-19)")
                        else:
                            print_warning(f"⚠️  Wednesday date is: {today_date} (neither 11-19 nor 11-20)")
                    else:
                        print_info(f"ℹ️  Today is {today_day}, not Wednesday")
                
                if wednesday_info:
                    wed_date = wednesday_info.get('date', '')
                    print_info(f"📅 Wednesday date in system: {wed_date}")
                    
                    # Check Wednesday date specifically
                    if '11-19' in wed_date:
                        print_success("✅ Wednesday correctly shows 11-19")
                        self.test_results['passed'] += 1
                    elif '11-20' in wed_date:
                        print_error("❌ CRITICAL: Wednesday shows 11-20 (should be 11-19)")
                        self.test_results['failed'] += 1
                        self.test_results['critical_issues'].append("Wednesday date calculation wrong")
                    else:
                        print_info(f"ℹ️  Wednesday date: {wed_date}")
                
                # Calculate what the dates SHOULD be
                print_header("EXPECTED DATE CALCULATION")
                
                # Use Central Time like the backend
                central_tz = pytz_timezone('America/Chicago')
                now_central = datetime.now(central_tz)
                today_central = now_central.date()
                
                print_info(f"🕐 Current Central Time: {now_central}")
                print_info(f"📅 Today in Central Time: {today_central}")
                print_info(f"📊 Today's weekday (0=Monday): {today_central.weekday()}")
                
                # Calculate Monday of current week
                monday_central = today_central - timedelta(days=today_central.weekday())
                
                # Calculate all days of the week
                expected_dates = {}
                days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                
                print_info("🗓️  Expected week dates:")
                for i, day in enumerate(days):
                    expected_date = monday_central + timedelta(days=i)
                    expected_dates[day] = expected_date.isoformat()
                    is_today_marker = " (TODAY)" if expected_date == today_central else ""
                    print_info(f"   {day}: {expected_date.isoformat()}{is_today_marker}")
                
                # Compare with API results
                print_header("API vs EXPECTED COMPARISON")
                
                discrepancies = []
                for date_info in week_dates:
                    day_name = date_info.get('day_name', '')
                    api_date = date_info.get('date', '')
                    expected_date = expected_dates.get(day_name, '')
                    
                    if api_date == expected_date:
                        print_success(f"✅ {day_name}: API={api_date} matches expected")
                    else:
                        print_error(f"❌ {day_name}: API={api_date} != expected={expected_date}")
                        discrepancies.append(f"{day_name}: API={api_date} vs expected={expected_date}")
                        self.test_results['failed'] += 1
                        self.test_results['critical_issues'].append(f"Date mismatch for {day_name}")
                
                if not discrepancies:
                    print_success("✅ All dates match expected values")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ Found {len(discrepancies)} date discrepancies")
                    for disc in discrepancies:
                        print_error(f"   {disc}")
                
            else:
                print_error(f"Week dates endpoint failed: {response.status_code} - {response.text}")
                self.test_results['failed'] += 1
                
        except Exception as e:
            print_error(f"Exception in system date test: {str(e)}")
            self.test_results['failed'] += 1

    def test_activity_placement(self):
        """Test where activities are placed in the weekly view"""
        print_header("ACTIVITY PLACEMENT TEST")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Create distinctive test activities for specific dates
            test_activities = [
                ("2024-11-19", "TUESDAY_TEST", 50.0, 25.0, 5000.0),  # Tuesday
                ("2024-11-20", "WEDNESDAY_TEST", 99.0, 50.0, 9999.0),  # Wednesday
            ]
            
            print_info("Creating test activities with distinctive signatures...")
            
            for date_str, label, contacts, appointments, premium in test_activities:
                activity_data = {
                    "date": date_str,
                    "contacts": contacts,
                    "appointments": appointments,
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
                    print_success(f"✅ Created {label} activity for {date_str}")
                else:
                    print_warning(f"⚠️  Could not create {label} activity: {response.status_code}")
            
            # Now test the team hierarchy weekly view
            print_info("Testing team hierarchy weekly view...")
            
            hierarchy_response = self.session.get(
                f"{BACKEND_URL}/team/hierarchy/weekly",
                headers=headers
            )
            
            if hierarchy_response.status_code == 200:
                hierarchy_data = hierarchy_response.json()
                print_success("✅ Team hierarchy weekly endpoint accessible")
                
                # Check if we can find our distinctive activities
                stats = hierarchy_data.get('stats', {})
                total_contacts = stats.get('contacts', 0)
                total_premium = stats.get('premium', 0)
                
                print_info(f"📊 Total weekly stats:")
                print_info(f"   Contacts: {total_contacts}")
                print_info(f"   Premium: ${total_premium}")
                
                # Look for our distinctive signatures
                if total_contacts >= 99.0:  # Should include Wednesday test
                    print_success("✅ Wednesday test activity (99 contacts) appears in weekly total")
                    self.test_results['passed'] += 1
                else:
                    print_error("❌ Wednesday test activity (99 contacts) missing from weekly total")
                    self.test_results['failed'] += 1
                    self.test_results['critical_issues'].append("Wednesday activity not appearing in weekly totals")
                
                if total_premium >= 9999.0:  # Should include Wednesday premium
                    print_success("✅ Wednesday test premium ($9999) appears in weekly total")
                    self.test_results['passed'] += 1
                else:
                    print_error("❌ Wednesday test premium ($9999) missing from weekly total")
                    self.test_results['failed'] += 1
                    self.test_results['critical_issues'].append("Wednesday premium not appearing in weekly totals")
                    
            else:
                print_error(f"Team hierarchy weekly failed: {hierarchy_response.status_code}")
                self.test_results['failed'] += 1
            
            # Test daily reports for specific dates
            print_info("Testing daily reports for specific dates...")
            
            for date_str, label, expected_contacts, expected_appointments, expected_premium in test_activities:
                print_info(f"Testing daily report for {date_str} ({label})...")
                
                daily_response = self.session.get(
                    f"{BACKEND_URL}/reports/daily/individual",
                    params={"date": date_str},
                    headers=headers
                )
                
                if daily_response.status_code == 200:
                    daily_data = daily_response.json()
                    
                    # Check if date field matches request
                    if daily_data.get('date') == date_str:
                        print_success(f"✅ Daily report date field correct for {date_str}")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ Daily report date mismatch: {daily_data.get('date')} != {date_str}")
                        self.test_results['failed'] += 1
                        self.test_results['critical_issues'].append(f"Date mismatch in daily report for {date_str}")
                    
                    # Look for our distinctive activity
                    data_array = daily_data.get('data', [])
                    found_activity = False
                    
                    for member in data_array:
                        if (member.get('contacts', 0) == expected_contacts and 
                            member.get('premium', 0) == expected_premium):
                            found_activity = True
                            print_success(f"✅ Found {label} activity in daily report")
                            break
                    
                    if not found_activity:
                        print_warning(f"⚠️  Could not find {label} activity in daily report")
                        
                else:
                    print_error(f"Daily report failed for {date_str}: {daily_response.status_code}")
                    self.test_results['failed'] += 1
                    
        except Exception as e:
            print_error(f"Exception in activity placement test: {str(e)}")
            self.test_results['failed'] += 1

    def test_weekday_calculation(self):
        """Test the weekday calculation logic"""
        print_header("WEEKDAY CALCULATION TEST")
        
        try:
            # Test Python's weekday calculation
            from datetime import date
            
            # Test specific dates mentioned in the issue
            test_dates = [
                "2024-11-18",  # Monday
                "2024-11-19",  # Tuesday  
                "2024-11-20",  # Wednesday
                "2024-11-21",  # Thursday
            ]
            
            print_info("Testing Python weekday calculation:")
            for date_str in test_dates:
                test_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                weekday_num = test_date.weekday()  # 0=Monday, 6=Sunday
                weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                weekday_name = weekday_names[weekday_num]
                
                print_info(f"   {date_str} -> {weekday_name} (weekday={weekday_num})")
                
                # Check if this matches expected
                if date_str == "2024-11-19" and weekday_name == "Tuesday":
                    print_success("✅ 2024-11-19 is correctly identified as Tuesday")
                    self.test_results['passed'] += 1
                elif date_str == "2024-11-20" and weekday_name == "Wednesday":
                    print_success("✅ 2024-11-20 is correctly identified as Wednesday")
                    self.test_results['passed'] += 1
            
            # Test week calculation from a Wednesday
            print_info("\nTesting week calculation from Wednesday 2024-11-20:")
            wednesday = datetime.strptime("2024-11-20", '%Y-%m-%d').date()
            monday_of_week = wednesday - timedelta(days=wednesday.weekday())
            
            print_info(f"   Wednesday: {wednesday}")
            print_info(f"   Monday of that week: {monday_of_week}")
            
            # Generate the full week
            week_dates = []
            for i in range(7):
                day_date = monday_of_week + timedelta(days=i)
                day_name = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]
                week_dates.append((day_name, day_date.isoformat()))
                print_info(f"   {day_name}: {day_date.isoformat()}")
            
            # Check if Wednesday is 11-20
            wednesday_date = None
            for day_name, day_date in week_dates:
                if day_name == 'Wednesday':
                    wednesday_date = day_date
                    break
            
            if wednesday_date == "2024-11-20":
                print_success("✅ Week calculation correctly places Wednesday on 2024-11-20")
                self.test_results['passed'] += 1
            else:
                print_error(f"❌ Week calculation error: Wednesday = {wednesday_date}, expected 2024-11-20")
                self.test_results['failed'] += 1
                
        except Exception as e:
            print_error(f"Exception in weekday calculation test: {str(e)}")
            self.test_results['failed'] += 1

    def run_debug_tests(self):
        """Run all debug tests"""
        print_header("🚨 URGENT DATE CALCULATION DEBUG")
        print_info("Investigating user report:")
        print_info("- Wednesday slot shows date 11-20")
        print_info("- But user's activity appears in Tuesday slot (11-19)")
        print_info("- User expects activity in Wednesday slot (11-19)")
        print_info("")
        print_info("If today is Wednesday, it should be 11-19, not 11-20")
        
        # Login
        if not self.login_user():
            print_error("Failed to login - aborting tests")
            return False
        
        # Run debug tests
        self.test_system_date_calculation()
        self.test_weekday_calculation()
        self.test_activity_placement()
        
        # Print summary
        self.print_debug_summary()
        
        return len(self.test_results['critical_issues']) == 0

    def print_debug_summary(self):
        """Print debug summary"""
        print_header("🔍 DEBUG SUMMARY")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        
        print_info(f"Tests run: {total_tests}")
        print_info(f"Passed: {self.test_results['passed']}")
        print_info(f"Failed: {self.test_results['failed']}")
        
        if self.test_results['critical_issues']:
            print_error(f"\n🚨 CRITICAL ISSUES FOUND ({len(self.test_results['critical_issues'])}):")
            for i, issue in enumerate(self.test_results['critical_issues'], 1):
                print_error(f"   {i}. {issue}")
        else:
            print_success("\n✅ No critical date calculation issues found")
        
        # Provide recommendations
        print_header("🎯 RECOMMENDATIONS")
        
        if self.test_results['critical_issues']:
            print_info("Based on the issues found:")
            print_info("1. Check the backend date calculation logic in /api/team/week-dates")
            print_info("2. Verify Central Time timezone handling")
            print_info("3. Check if there's an off-by-one error in week calculation")
            print_info("4. Verify activity date matching logic")
        else:
            print_info("The backend date calculations appear to be working correctly.")
            print_info("The issue may be in the frontend Team View component.")

if __name__ == "__main__":
    debugger = DateCalculationDebugger()
    success = debugger.run_debug_tests()
    
    if success:
        print_success("\n🎉 Date calculation debug completed - no critical issues found!")
        sys.exit(0)
    else:
        print_error("\n💥 Critical date calculation issues found!")
        sys.exit(1)