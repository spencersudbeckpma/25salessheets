#!/usr/bin/env python3
"""
CRITICAL DATE MISMATCH DEBUG - "Data Showing A Day Behind"
ISSUE: User reports data is showing "a day behind" in Team View weekly breakdown.
If today is Wednesday, their Wednesday activity appears under Tuesday in the weekly display.

ROOT CAUSE ANALYSIS:
1. Activity Storage Date: When user enters activity today (Wednesday), what exact date string is saved?
2. Weekly View Date Calculation: What dates is the weekly breakdown using for each day slot?
3. Date String Comparison: Are the stored dates matching the lookup dates?
4. Timezone Edge Case: Is there a timezone conversion happening during save vs retrieve?
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os
from pytz import timezone as pytz_timezone

# Configuration
BACKEND_URL = "https://feature-flags-app.preview.emergentagent.com/api"

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

class DateMismatchDebugger:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'critical_issues': []
        }

    def setup_authentication(self):
        """Setup authentication with existing user"""
        print_header("AUTHENTICATION SETUP")
        
        try:
            # Try to login with existing state manager
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "spencer.sudbeck@pmagent.net",
                "password": "Bizlink25"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['token']
                print_success(f"Authenticated as: {data['user']['name']} ({data['user']['email']})")
                return True
            else:
                print_error(f"Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Authentication exception: {str(e)}")
            return False

    def debug_activity_save_date(self):
        """DEBUG TEST 1: Check Activity Save Date"""
        print_header("🔍 DEBUG TEST 1: ACTIVITY SAVE DATE INVESTIGATION")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get current Central Time
        central_tz = pytz_timezone('America/Chicago')
        today_central = datetime.now(central_tz).date()
        today_str = today_central.isoformat()
        
        print_info(f"Today in Central Time: {today_str}")
        print_info(f"Day of week: {today_central.strftime('%A')}")
        
        # Create activity for today
        print_info("Creating activity for today...")
        activity_data = {
            "date": today_str,
            "contacts": 25.0,
            "appointments": 12.0,
            "presentations": 8.0,
            "referrals": 4,
            "testimonials": 3,
            "sales": 2,
            "new_face_sold": 2.0,
            "premium": 4500.00
        }
        
        try:
            create_response = self.session.put(
                f"{BACKEND_URL}/activities/{today_str}",
                json=activity_data,
                headers=headers
            )
            
            if create_response.status_code == 200:
                print_success(f"✅ Activity created/updated for {today_str}")
            else:
                print_info(f"Activity may already exist (status: {create_response.status_code})")
            
            # Now fetch the activity back to see what date was actually saved
            print_info("Fetching saved activity to verify date...")
            my_activities_response = self.session.get(f"{BACKEND_URL}/activities/my", headers=headers)
            
            if my_activities_response.status_code == 200:
                activities = my_activities_response.json()
                today_activity = None
                
                print_info("All activities in database:")
                for activity in activities[:5]:  # Show first 5
                    print_info(f"  Date: {activity.get('date')} | Contacts: {activity.get('contacts', 0)} | Premium: ${activity.get('premium', 0)}")
                    if activity.get('date') == today_str:
                        today_activity = activity
                
                if today_activity:
                    saved_date = today_activity.get('date')
                    print_success(f"✅ FOUND: Activity saved with date: {saved_date}")
                    
                    if saved_date == today_str:
                        print_success(f"✅ CORRECT: Saved date matches input date ({today_str})")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ CRITICAL: Date mismatch! Input: {today_str}, Saved: {saved_date}")
                        self.test_results['failed'] += 1
                        self.test_results['critical_issues'].append(f"Activity save date mismatch: {today_str} -> {saved_date}")
                else:
                    print_error(f"❌ CRITICAL: No activity found for today's date ({today_str})")
                    self.test_results['failed'] += 1
                    self.test_results['critical_issues'].append(f"Activity not found for today: {today_str}")
            else:
                print_error(f"Failed to fetch activities: {my_activities_response.status_code}")
                self.test_results['failed'] += 1
                
        except Exception as e:
            print_error(f"Exception in activity save test: {str(e)}")
            self.test_results['failed'] += 1

    def debug_weekly_date_calculation(self):
        """DEBUG TEST 2: Check Weekly View Date Calculation"""
        print_header("🔍 DEBUG TEST 2: WEEKLY DATE CALCULATION INVESTIGATION")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Get week dates from the API
            response = self.session.get(f"{BACKEND_URL}/team/week-dates", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print_success("✅ Week dates endpoint accessible")
                
                week_dates = data.get('week_dates', [])
                today_api = data.get('today', '')
                week_start = data.get('week_start', '')
                
                print_info(f"API says today is: {today_api}")
                print_info(f"API says week starts: {week_start}")
                
                # Get actual Central Time today for comparison
                central_tz = pytz_timezone('America/Chicago')
                actual_today = datetime.now(central_tz).date().isoformat()
                
                print_info(f"Actual Central Time today: {actual_today}")
                
                if today_api == actual_today:
                    print_success(f"✅ CORRECT: API today matches actual today ({actual_today})")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ CRITICAL: API today ({today_api}) != actual today ({actual_today})")
                    self.test_results['failed'] += 1
                    self.test_results['critical_issues'].append(f"Week dates API today mismatch: {today_api} vs {actual_today}")
                
                print_info("Weekly breakdown dates:")
                for i, date_info in enumerate(week_dates):
                    day_name = date_info.get('day_name', 'Unknown')
                    date_str = date_info.get('date', 'Unknown')
                    is_today = date_info.get('is_today', False)
                    today_marker = " ← TODAY" if is_today else ""
                    
                    print_info(f"  {day_name}: {date_str}{today_marker}")
                    
                    # Special check for Wednesday (the reported problem day)
                    if day_name == 'Wednesday':
                        self.wednesday_date = date_str
                        if is_today:
                            print_success(f"✅ Wednesday ({date_str}) is correctly marked as today")
                        else:
                            print_info(f"Wednesday ({date_str}) is not today")
                
                self.test_results['passed'] += 1
                
            else:
                print_error(f"Week dates endpoint failed: {response.status_code}")
                self.test_results['failed'] += 1
                
        except Exception as e:
            print_error(f"Exception in weekly date calculation test: {str(e)}")
            self.test_results['failed'] += 1

    def debug_date_string_comparison(self):
        """DEBUG TEST 3: Compare Storage vs Lookup Dates"""
        print_header("🔍 DEBUG TEST 3: DATE STRING COMPARISON (STORAGE VS LOOKUP)")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Use Wednesday date if we found it, otherwise use today
        test_date = getattr(self, 'wednesday_date', datetime.now(pytz_timezone('America/Chicago')).date().isoformat())
        
        print_info(f"Testing date string comparison for: {test_date}")
        
        try:
            # Step 1: Ensure we have activity data for this date
            print_info("Step 1: Creating test activity...")
            activity_data = {
                "date": test_date,
                "contacts": 30.0,
                "appointments": 15.0,
                "presentations": 10.0,
                "referrals": 5,
                "testimonials": 3,
                "sales": 3,
                "new_face_sold": 2.5,
                "premium": 5500.00
            }
            
            create_response = self.session.put(
                f"{BACKEND_URL}/activities/{test_date}",
                json=activity_data,
                headers=headers
            )
            
            if create_response.status_code == 200:
                print_success(f"✅ Test activity created for {test_date}")
            
            # Step 2: Check what's stored in database
            print_info("Step 2: Checking stored activity...")
            my_activities_response = self.session.get(f"{BACKEND_URL}/activities/my", headers=headers)
            
            stored_activity = None
            if my_activities_response.status_code == 200:
                activities = my_activities_response.json()
                for activity in activities:
                    if activity.get('date') == test_date:
                        stored_activity = activity
                        break
                
                if stored_activity:
                    stored_date = stored_activity.get('date')
                    stored_contacts = stored_activity.get('contacts', 0)
                    stored_premium = stored_activity.get('premium', 0)
                    
                    print_success(f"✅ STORED: Date={stored_date}, Contacts={stored_contacts}, Premium=${stored_premium}")
                else:
                    print_error(f"❌ No stored activity found for {test_date}")
                    self.test_results['failed'] += 1
                    return
            
            # Step 3: Check what team hierarchy returns for this date
            print_info("Step 3: Checking team hierarchy lookup...")
            hierarchy_response = self.session.get(
                f"{BACKEND_URL}/team/hierarchy/daily",
                params={"user_date": test_date},
                headers=headers
            )
            
            if hierarchy_response.status_code == 200:
                hierarchy_data = hierarchy_response.json()
                hierarchy_stats = hierarchy_data.get('stats', {})
                
                lookup_contacts = hierarchy_stats.get('contacts', 0)
                lookup_premium = hierarchy_stats.get('premium', 0)
                
                print_success(f"✅ LOOKUP: Contacts={lookup_contacts}, Premium=${lookup_premium}")
                
                # Compare stored vs lookup
                if stored_activity:
                    if (stored_contacts == lookup_contacts and 
                        abs(stored_premium - lookup_premium) < 0.01):  # Allow for floating point precision
                        print_success(f"✅ PERFECT MATCH: Storage and lookup data identical!")
                        print_success(f"   Date: {test_date}")
                        print_success(f"   Contacts: {stored_contacts} = {lookup_contacts}")
                        print_success(f"   Premium: ${stored_premium} = ${lookup_premium}")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ CRITICAL MISMATCH: Storage != Lookup")
                        print_error(f"   Date: {test_date}")
                        print_error(f"   Contacts: {stored_contacts} != {lookup_contacts}")
                        print_error(f"   Premium: ${stored_premium} != ${lookup_premium}")
                        self.test_results['failed'] += 1
                        self.test_results['critical_issues'].append(f"Data mismatch for {test_date}: stored vs lookup")
            else:
                print_error(f"Team hierarchy lookup failed: {hierarchy_response.status_code}")
                self.test_results['failed'] += 1
                
            # Step 4: Check daily report endpoint
            print_info("Step 4: Checking daily report lookup...")
            daily_response = self.session.get(
                f"{BACKEND_URL}/reports/daily/individual",
                params={"date": test_date},
                headers=headers
            )
            
            if daily_response.status_code == 200:
                daily_data = daily_response.json()
                
                # CRITICAL: Check if date field matches
                returned_date = daily_data.get('date')
                if returned_date == test_date:
                    print_success(f"✅ CRITICAL: Daily report date field matches request ({test_date})")
                    self.test_results['passed'] += 1
                else:
                    print_error(f"❌ CRITICAL BUG: Daily report date mismatch!")
                    print_error(f"   Requested: {test_date}")
                    print_error(f"   Returned:  {returned_date}")
                    print_error(f"   This is the exact bug: 'showing Wednesday's numbers but Tuesday's date'")
                    self.test_results['failed'] += 1
                    self.test_results['critical_issues'].append(f"Daily report date mismatch: {test_date} -> {returned_date}")
                
                # Check if data appears in the report
                data_array = daily_data.get('data', [])
                found_data = False
                for member in data_array:
                    if member.get('contacts', 0) == 30.0 and member.get('premium', 0) == 5500.0:
                        found_data = True
                        print_success(f"✅ Found matching data in daily report for {member.get('name', 'Unknown')}")
                        break
                
                if not found_data and data_array:
                    print_warning("⚠️ Test data not found in daily report (may be aggregated)")
                    
            else:
                print_error(f"Daily report failed: {daily_response.status_code}")
                self.test_results['failed'] += 1
                
        except Exception as e:
            print_error(f"Exception in date string comparison test: {str(e)}")
            self.test_results['failed'] += 1

    def debug_timezone_edge_cases(self):
        """DEBUG TEST 4: Timezone Edge Case Testing"""
        print_header("🔍 DEBUG TEST 4: TIMEZONE EDGE CASE INVESTIGATION")
        
        if not self.token:
            print_error("No authentication token")
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test multiple timezone scenarios
        central_tz = pytz_timezone('America/Chicago')
        utc_tz = pytz_timezone('UTC')
        
        # Get current time in different timezones
        now_central = datetime.now(central_tz)
        now_utc = datetime.now(utc_tz)
        
        central_date = now_central.date().isoformat()
        utc_date = now_utc.date().isoformat()
        
        print_info(f"Current Central Time: {now_central.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print_info(f"Current UTC Time: {now_utc.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print_info(f"Central Date: {central_date}")
        print_info(f"UTC Date: {utc_date}")
        
        if central_date == utc_date:
            print_success("✅ Central and UTC dates are the same (no date boundary issue)")
        else:
            print_warning(f"⚠️ TIMEZONE DATE BOUNDARY: Central={central_date}, UTC={utc_date}")
            print_warning("This could cause the 'day behind' issue if backend uses UTC but frontend expects Central")
        
        try:
            # Test with both dates to see if there's a difference
            test_dates = [
                (central_date, "Central Time Date"),
                (utc_date, "UTC Date")
            ]
            
            for test_date, description in test_dates:
                print_info(f"Testing {description}: {test_date}")
                
                # Create activity
                activity_data = {
                    "date": test_date,
                    "contacts": 20.0,
                    "appointments": 10.0,
                    "presentations": 5.0,
                    "referrals": 2,
                    "testimonials": 1,
                    "sales": 1,
                    "new_face_sold": 1.0,
                    "premium": 3000.00
                }
                
                create_response = self.session.put(
                    f"{BACKEND_URL}/activities/{test_date}",
                    json=activity_data,
                    headers=headers
                )
                
                if create_response.status_code == 200:
                    print_success(f"✅ Activity created for {description}")
                
                # Test daily report
                daily_response = self.session.get(
                    f"{BACKEND_URL}/reports/daily/individual",
                    params={"date": test_date},
                    headers=headers
                )
                
                if daily_response.status_code == 200:
                    daily_data = daily_response.json()
                    returned_date = daily_data.get('date')
                    
                    if returned_date == test_date:
                        print_success(f"✅ {description}: Date consistency maintained")
                        self.test_results['passed'] += 1
                    else:
                        print_error(f"❌ {description}: Date inconsistency!")
                        print_error(f"   Input: {test_date}, Output: {returned_date}")
                        self.test_results['failed'] += 1
                        self.test_results['critical_issues'].append(f"Timezone issue with {description}: {test_date} -> {returned_date}")
                else:
                    print_error(f"Daily report failed for {description}: {daily_response.status_code}")
                    
        except Exception as e:
            print_error(f"Exception in timezone edge case test: {str(e)}")
            self.test_results['failed'] += 1

    def run_comprehensive_debug(self):
        """Run all debug tests"""
        print_header("🚨 CRITICAL DATE MISMATCH DEBUG SESSION")
        print_info("ISSUE: User reports data showing 'a day behind' in Team View weekly breakdown")
        print_info("GOAL: Find exact root cause of date mismatch between storage and display")
        
        if not self.setup_authentication():
            print_error("Authentication failed - cannot proceed")
            return False
        
        # Run all debug tests
        self.debug_activity_save_date()
        self.debug_weekly_date_calculation()
        self.debug_date_string_comparison()
        self.debug_timezone_edge_cases()
        
        # Print comprehensive summary
        self.print_debug_summary()
        
        return len(self.test_results['critical_issues']) == 0

    def print_debug_summary(self):
        """Print comprehensive debug summary"""
        print_header("🔍 DEBUG INVESTIGATION SUMMARY")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        
        print_info(f"Total Tests: {total_tests}")
        print_info(f"Passed: {self.test_results['passed']}")
        print_info(f"Failed: {self.test_results['failed']}")
        
        if self.test_results['critical_issues']:
            print_error(f"\n🚨 CRITICAL ISSUES FOUND ({len(self.test_results['critical_issues'])}):")
            for i, issue in enumerate(self.test_results['critical_issues'], 1):
                print_error(f"  {i}. {issue}")
            
            print_header("🎯 ROOT CAUSE ANALYSIS")
            print_error("Based on the investigation, the 'day behind' issue is likely caused by:")
            
            # Analyze the types of issues found
            date_mismatch_issues = [issue for issue in self.test_results['critical_issues'] if 'mismatch' in issue.lower()]
            timezone_issues = [issue for issue in self.test_results['critical_issues'] if 'timezone' in issue.lower()]
            
            if date_mismatch_issues:
                print_error("• DATE FIELD MISMATCH: The date field in API responses doesn't match the requested date")
                print_error("  This means when user requests Wednesday data, they get Wednesday's numbers but Tuesday's date")
                
            if timezone_issues:
                print_error("• TIMEZONE CONVERSION ISSUE: Different timezone handling between save and retrieve operations")
                print_error("  Activities saved in one timezone but retrieved assuming different timezone")
                
            print_header("🔧 RECOMMENDED FIXES")
            print_info("1. Ensure all date operations use consistent timezone (Central Time)")
            print_info("2. Fix date field in API responses to match the requested date parameter")
            print_info("3. Remove any timezone conversions that shift dates during retrieval")
            print_info("4. Use date strings directly without datetime object conversions")
            
        else:
            print_success("\n🎉 NO CRITICAL ISSUES FOUND!")
            print_success("The backend date handling appears to be working correctly.")
            print_info("The 'day behind' issue may be in the frontend Team View component.")

if __name__ == "__main__":
    debugger = DateMismatchDebugger()
    success = debugger.run_comprehensive_debug()
    
    if success:
        print_success("\n✅ Debug investigation completed - no critical backend issues found")
        sys.exit(0)
    else:
        print_error("\n🚨 Debug investigation found critical issues that need fixing")
        sys.exit(1)