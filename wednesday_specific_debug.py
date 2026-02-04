#!/usr/bin/env python3
"""
WEDNESDAY SPECIFIC DEBUG - Focus on the exact issue reported
ISSUE: If today is Wednesday, Wednesday activity appears under Tuesday in the weekly display.

This script will:
1. Verify what date Wednesday is according to the system
2. Create Wednesday activity with a specific signature
3. Check where that activity appears in the weekly breakdown
4. Compare expected vs actual placement
"""

import requests
import json
from datetime import datetime, timedelta
import sys
from pytz import timezone as pytz_timezone

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
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")

class WednesdayDebugger:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.wednesday_signature = {
            "contacts": 99.0,  # Unique signature to identify our test
            "appointments": 77.0,
            "presentations": 55.0,
            "premium": 9999.00
        }

    def setup_authentication(self):
        """Setup authentication"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "spencer.sudbeck@pmagent.net",
                "password": "Bizlink25"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['token']
                print_success(f"Authenticated as: {data['user']['name']}")
                return True
            else:
                print_error(f"Authentication failed: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Authentication exception: {str(e)}")
            return False

    def get_wednesday_date(self):
        """Get Wednesday's date according to the system"""
        print_header("STEP 1: GET WEDNESDAY DATE FROM SYSTEM")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = self.session.get(f"{BACKEND_URL}/team/week-dates", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                week_dates = data.get('week_dates', [])
                
                for date_info in week_dates:
                    if date_info.get('day_name') == 'Wednesday':
                        wednesday_date = date_info.get('date')
                        is_today = date_info.get('is_today', False)
                        
                        print_success(f"System says Wednesday is: {wednesday_date}")
                        print_info(f"Is Wednesday today? {is_today}")
                        
                        return wednesday_date, is_today
                        
                print_error("Could not find Wednesday in week dates")
                return None, False
            else:
                print_error(f"Week dates endpoint failed: {response.status_code}")
                return None, False
                
        except Exception as e:
            print_error(f"Exception getting Wednesday date: {str(e)}")
            return None, False

    def create_wednesday_activity(self, wednesday_date):
        """Create distinctive Wednesday activity"""
        print_header("STEP 2: CREATE DISTINCTIVE WEDNESDAY ACTIVITY")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        activity_data = {
            "date": wednesday_date,
            **self.wednesday_signature,
            "referrals": 33,
            "testimonials": 22,
            "sales": 11,
            "new_face_sold": 7.0
        }
        
        print_info(f"Creating activity for Wednesday ({wednesday_date}) with signature:")
        print_info(f"  Contacts: {activity_data['contacts']}")
        print_info(f"  Appointments: {activity_data['appointments']}")
        print_info(f"  Presentations: {activity_data['presentations']}")
        print_info(f"  Premium: ${activity_data['premium']}")
        
        try:
            response = self.session.put(
                f"{BACKEND_URL}/activities/{wednesday_date}",
                json=activity_data,
                headers=headers
            )
            
            if response.status_code == 200:
                print_success(f"✅ Wednesday activity created successfully")
                return True
            else:
                print_error(f"Failed to create Wednesday activity: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception creating Wednesday activity: {str(e)}")
            return False

    def verify_activity_storage(self, wednesday_date):
        """Verify the activity was stored correctly"""
        print_header("STEP 3: VERIFY ACTIVITY STORAGE")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = self.session.get(f"{BACKEND_URL}/activities/my", headers=headers)
            
            if response.status_code == 200:
                activities = response.json()
                
                wednesday_activity = None
                for activity in activities:
                    if (activity.get('date') == wednesday_date and 
                        activity.get('contacts') == self.wednesday_signature['contacts']):
                        wednesday_activity = activity
                        break
                
                if wednesday_activity:
                    stored_date = wednesday_activity.get('date')
                    stored_contacts = wednesday_activity.get('contacts')
                    stored_premium = wednesday_activity.get('premium')
                    
                    print_success(f"✅ Wednesday activity found in storage:")
                    print_info(f"  Stored Date: {stored_date}")
                    print_info(f"  Stored Contacts: {stored_contacts}")
                    print_info(f"  Stored Premium: ${stored_premium}")
                    
                    if stored_date == wednesday_date:
                        print_success(f"✅ Date stored correctly: {stored_date}")
                        return True
                    else:
                        print_error(f"❌ Date storage mismatch: expected {wednesday_date}, got {stored_date}")
                        return False
                else:
                    print_error(f"❌ Wednesday activity not found in storage")
                    return False
                    
            else:
                print_error(f"Failed to fetch activities: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception verifying storage: {str(e)}")
            return False

    def check_weekly_breakdown_placement(self, wednesday_date):
        """Check where Wednesday activity appears in weekly breakdown"""
        print_header("STEP 4: CHECK WEEKLY BREAKDOWN PLACEMENT")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Get the weekly breakdown
            response = self.session.get(f"{BACKEND_URL}/team/hierarchy/weekly", headers=headers)
            
            if response.status_code == 200:
                weekly_data = response.json()
                print_success("✅ Weekly hierarchy data retrieved")
                
                # Check if our Wednesday signature appears in the weekly totals
                stats = weekly_data.get('stats', {})
                weekly_contacts = stats.get('contacts', 0)
                weekly_premium = stats.get('premium', 0)
                
                print_info(f"Weekly totals - Contacts: {weekly_contacts}, Premium: ${weekly_premium}")
                
                # Our signature should be included in these totals
                if (weekly_contacts >= self.wednesday_signature['contacts'] and 
                    weekly_premium >= self.wednesday_signature['premium']):
                    print_success("✅ Wednesday activity appears to be included in weekly totals")
                else:
                    print_warning("⚠️ Wednesday activity may not be included in weekly totals")
                
                return True
            else:
                print_error(f"Weekly hierarchy failed: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception checking weekly breakdown: {str(e)}")
            return False

    def check_daily_breakdown_for_each_day(self, wednesday_date):
        """Check daily breakdown for each day of the week to see where Wednesday activity appears"""
        print_header("STEP 5: CHECK DAILY BREAKDOWN FOR EACH DAY")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get the week dates first
        try:
            week_response = self.session.get(f"{BACKEND_URL}/team/week-dates", headers=headers)
            if week_response.status_code != 200:
                print_error("Could not get week dates")
                return False
                
            week_data = week_response.json()
            week_dates = week_data.get('week_dates', [])
            
            print_info("Checking each day of the week for Wednesday activity signature...")
            
            wednesday_found_on = []
            
            for date_info in week_dates:
                day_name = date_info.get('day_name')
                date_str = date_info.get('date')
                
                print_info(f"\nChecking {day_name} ({date_str})...")
                
                # Get daily report for this date
                daily_response = self.session.get(
                    f"{BACKEND_URL}/reports/daily/individual",
                    params={"date": date_str},
                    headers=headers
                )
                
                if daily_response.status_code == 200:
                    daily_data = daily_response.json()
                    data_array = daily_data.get('data', [])
                    
                    # Look for our Wednesday signature
                    found_signature = False
                    for member in data_array:
                        contacts = member.get('contacts', 0)
                        premium = member.get('premium', 0)
                        
                        if (contacts == self.wednesday_signature['contacts'] and 
                            premium == self.wednesday_signature['premium']):
                            found_signature = True
                            print_success(f"  ✅ FOUND Wednesday signature on {day_name}!")
                            print_info(f"     Member: {member.get('name', 'Unknown')}")
                            print_info(f"     Contacts: {contacts}, Premium: ${premium}")
                            wednesday_found_on.append(day_name)
                            break
                    
                    if not found_signature:
                        print_info(f"  ➖ Wednesday signature NOT found on {day_name}")
                else:
                    print_warning(f"  ⚠️ Could not get daily report for {day_name}: {daily_response.status_code}")
            
            # Analyze results
            print_header("ANALYSIS OF WEDNESDAY ACTIVITY PLACEMENT")
            
            if len(wednesday_found_on) == 0:
                print_error("❌ CRITICAL: Wednesday activity signature not found on ANY day!")
                print_error("This suggests the activity is not being retrieved properly.")
                return False
            elif len(wednesday_found_on) == 1:
                found_day = wednesday_found_on[0]
                if found_day == 'Wednesday':
                    print_success(f"✅ CORRECT: Wednesday activity found ONLY on Wednesday")
                    print_success("The backend is working correctly for this test case.")
                    return True
                else:
                    print_error(f"❌ BUG CONFIRMED: Wednesday activity found on {found_day} instead of Wednesday!")
                    print_error("This is the exact bug reported: activity appears on wrong day.")
                    return False
            else:
                print_warning(f"⚠️ UNEXPECTED: Wednesday activity found on multiple days: {wednesday_found_on}")
                print_warning("This suggests data duplication or aggregation issues.")
                return False
                
        except Exception as e:
            print_error(f"Exception in daily breakdown check: {str(e)}")
            return False

    def run_wednesday_debug(self):
        """Run the complete Wednesday debug investigation"""
        print_header("🔍 WEDNESDAY SPECIFIC DEBUG INVESTIGATION")
        print_info("GOAL: Determine if Wednesday activity appears under Tuesday in weekly display")
        
        if not self.setup_authentication():
            return False
        
        # Step 1: Get Wednesday date
        wednesday_date, is_today = self.get_wednesday_date()
        if not wednesday_date:
            return False
        
        # Step 2: Create distinctive Wednesday activity
        if not self.create_wednesday_activity(wednesday_date):
            return False
        
        # Step 3: Verify storage
        if not self.verify_activity_storage(wednesday_date):
            return False
        
        # Step 4: Check weekly breakdown
        if not self.check_weekly_breakdown_placement(wednesday_date):
            return False
        
        # Step 5: Check daily breakdown for each day (CRITICAL TEST)
        success = self.check_daily_breakdown_for_each_day(wednesday_date)
        
        # Final summary
        print_header("🎯 FINAL CONCLUSION")
        if success:
            print_success("✅ BACKEND IS WORKING CORRECTLY")
            print_info("Wednesday activity appears on Wednesday as expected.")
            print_info("The 'day behind' issue is likely in the frontend Team View component.")
        else:
            print_error("❌ BACKEND BUG CONFIRMED")
            print_error("Wednesday activity is appearing on the wrong day.")
            print_error("This confirms the user's report of data being 'a day behind'.")
        
        return success

if __name__ == "__main__":
    debugger = WednesdayDebugger()
    success = debugger.run_wednesday_debug()
    
    if success:
        print_success("\n✅ Wednesday debug completed - backend working correctly")
        sys.exit(0)
    else:
        print_error("\n🚨 Wednesday debug found backend issues")
        sys.exit(1)