#!/usr/bin/env python3
"""
Team View Specific Test - Wednesday Activity Bug Investigation
Simulates exactly what the Team View frontend would be doing
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "https://performance-hub-75.preview.emergentagent.com/api"

def test_team_view_workflow():
    """Test the exact workflow that Team View frontend uses"""
    
    # Login as state manager
    session = requests.Session()
    login_response = session.post(f"{BACKEND_URL}/auth/login", json={
        "email": "spencer.sudbeck@pmagent.net",
        "password": "Bizlink25"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🔍 TEAM VIEW WORKFLOW SIMULATION")
    print("=" * 50)
    
    # Step 1: Get week dates (what Team View does first)
    print("\n📅 Step 1: Get week dates")
    week_response = session.get(f"{BACKEND_URL}/team/week-dates", headers=headers)
    
    if week_response.status_code == 200:
        week_data = week_response.json()
        print(f"✅ Week dates retrieved successfully")
        
        week_dates = week_data.get('week_dates', [])
        today_date = week_data.get('today', '')
        
        print(f"📅 Today according to system: {today_date}")
        print("📅 Week dates:")
        
        wednesday_date = None
        for date_info in week_dates:
            day_name = date_info.get('day_name', '')
            date_str = date_info.get('date', '')
            is_today = date_info.get('is_today', False)
            today_marker = " (TODAY)" if is_today else ""
            print(f"   {day_name}: {date_str}{today_marker}")
            
            if day_name == 'Wednesday':
                wednesday_date = date_str
    else:
        print(f"❌ Week dates failed: {week_response.status_code}")
        return
    
    # Step 2: Get team hierarchy for weekly period (what Team View does for weekly breakdown)
    print(f"\n🏢 Step 2: Get team hierarchy for weekly period")
    hierarchy_response = session.get(f"{BACKEND_URL}/team/hierarchy/weekly", headers=headers)
    
    if hierarchy_response.status_code == 200:
        hierarchy_data = hierarchy_response.json()
        print(f"✅ Team hierarchy retrieved successfully")
        
        # Check the stats that would be displayed in Team View
        stats = hierarchy_data.get('stats', {})
        print(f"📊 Weekly stats (what Team View aggregate would show):")
        print(f"   Contacts: {stats.get('contacts', 0)}")
        print(f"   Appointments: {stats.get('appointments', 0)}")
        print(f"   Presentations: {stats.get('presentations', 0)}")
        print(f"   Premium: ${stats.get('premium', 0)}")
        
        # Check if there are children (team members)
        children = hierarchy_data.get('children', [])
        print(f"📋 Team members found: {len(children)}")
        
        for child in children:
            child_stats = child.get('stats', {})
            print(f"   👤 {child.get('name', 'Unknown')}: Contacts={child_stats.get('contacts', 0)}, Premium=${child_stats.get('premium', 0)}")
            
    else:
        print(f"❌ Team hierarchy failed: {hierarchy_response.status_code}")
        return
    
    # Step 3: Test specific Wednesday activity lookup
    if wednesday_date:
        print(f"\n🎯 Step 3: Test Wednesday ({wednesday_date}) specific activity")
        
        # Test daily hierarchy for Wednesday specifically
        daily_hierarchy_response = session.get(
            f"{BACKEND_URL}/team/hierarchy/daily", 
            params={"user_date": wednesday_date},
            headers=headers
        )
        
        if daily_hierarchy_response.status_code == 200:
            daily_data = daily_hierarchy_response.json()
            daily_stats = daily_data.get('stats', {})
            print(f"✅ Wednesday daily hierarchy:")
            print(f"   Contacts: {daily_stats.get('contacts', 0)}")
            print(f"   Appointments: {daily_stats.get('appointments', 0)}")
            print(f"   Premium: ${daily_stats.get('premium', 0)}")
            
            if daily_stats.get('contacts', 0) > 0 or daily_stats.get('premium', 0) > 0:
                print(f"✅ Wednesday has activity data!")
            else:
                print(f"❌ Wednesday shows zero activity!")
        else:
            print(f"❌ Wednesday daily hierarchy failed: {daily_hierarchy_response.status_code}")
    
    # Step 4: Check individual activities for Wednesday
    print(f"\n👤 Step 4: Check individual activities for Wednesday")
    my_activities_response = session.get(f"{BACKEND_URL}/activities/my", headers=headers)
    
    if my_activities_response.status_code == 200:
        activities = my_activities_response.json()
        print(f"✅ Retrieved {len(activities)} total activities")
        
        wednesday_activities = [a for a in activities if a.get('date') == wednesday_date]
        print(f"📊 Activities for Wednesday ({wednesday_date}): {len(wednesday_activities)}")
        
        for activity in wednesday_activities:
            print(f"   📋 Activity: Contacts={activity.get('contacts', 0)}, Appointments={activity.get('appointments', 0)}, Premium=${activity.get('premium', 0)}")
            
        if wednesday_activities:
            print(f"✅ Wednesday activities exist in database!")
        else:
            print(f"❌ No Wednesday activities found in database!")
    else:
        print(f"❌ My activities failed: {my_activities_response.status_code}")
    
    # Step 5: Test the exact date range calculation that weekly view uses
    print(f"\n📊 Step 5: Test weekly date range calculation")
    
    # Calculate Monday of current week (same logic as backend)
    from datetime import datetime, timedelta
    from pytz import timezone as pytz_timezone
    
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    monday = today - timedelta(days=today.weekday())
    
    print(f"🗓️ Today (Central Time): {today}")
    print(f"🗓️ Monday of current week: {monday}")
    print(f"🗓️ Wednesday should be: {monday + timedelta(days=2)}")
    
    # Test activities in the date range
    activities_in_range = []
    if my_activities_response.status_code == 200:
        activities = my_activities_response.json()
        for activity in activities:
            activity_date = activity.get('date', '')
            if activity_date >= monday.isoformat():
                activities_in_range.append(activity)
                
        print(f"📊 Activities in current week range (>= {monday}): {len(activities_in_range)}")
        for activity in activities_in_range:
            print(f"   📋 {activity.get('date')}: Contacts={activity.get('contacts', 0)}, Premium=${activity.get('premium', 0)}")

if __name__ == "__main__":
    test_team_view_workflow()