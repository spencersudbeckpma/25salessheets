"""
Comprehensive Multi-tenancy Regression Tests
Verifies all existing functionality works correctly with team_id scoping
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STATE_MANAGER_EMAIL = "spencer.sudbeck@pmagent.net"
STATE_MANAGER_PASSWORD = "Bizlink25"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for state_manager"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STATE_MANAGER_EMAIL,
        "password": STATE_MANAGER_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def user_info(auth_token):
    """Get current user info"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STATE_MANAGER_EMAIL,
        "password": STATE_MANAGER_PASSWORD
    })
    return response.json()["user"]


class TestLoginAndUserData:
    """Test login and user data access"""
    
    def test_state_manager_login(self):
        """Verify state_manager can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STATE_MANAGER_EMAIL,
            "password": STATE_MANAGER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "state_manager"
        assert data["user"]["name"] == "Spencer Sudbeck"
        print(f"✓ State manager login successful: {data['user']['name']}")
    
    def test_user_has_team_assignment(self, headers):
        """Verify user has team_id assigned via admin users endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        # Find the state_manager user
        state_manager = next((u for u in users if u["email"] == STATE_MANAGER_EMAIL), None)
        assert state_manager is not None, "State manager should be in users list"
        assert state_manager.get("team_id") is not None, "User should have team_id assigned"
        print(f"✓ User has team_id: {state_manager.get('team_id')}")


class TestTeamMembersAndHierarchy:
    """Test team members and hierarchy functionality"""
    
    def test_get_team_members(self, headers):
        """Verify team members API returns data"""
        response = requests.get(f"{BASE_URL}/api/team/members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        assert len(members) > 0, "Should have team members"
        print(f"✓ Team members API returned {len(members)} members")
    
    def test_get_hierarchy(self, headers):
        """Verify hierarchy API returns data"""
        response = requests.get(f"{BASE_URL}/api/team/hierarchy/weekly", headers=headers)
        assert response.status_code == 200
        hierarchy = response.json()
        # Hierarchy returns a dict with user info and children
        assert isinstance(hierarchy, dict)
        assert "children" in hierarchy or "id" in hierarchy
        print(f"✓ Hierarchy API returned data with children")


class TestActivitiesWithTeamScope:
    """Test activities functionality with team scoping"""
    
    def test_get_my_activities(self, headers):
        """Verify activities API returns user's activities"""
        response = requests.get(f"{BASE_URL}/api/activities/my", headers=headers)
        assert response.status_code == 200
        activities = response.json()
        assert isinstance(activities, list)
        print(f"✓ My activities API returned {len(activities)} records")
    
    def test_get_team_activities(self, headers):
        """Verify team all-members API returns data"""
        response = requests.get(f"{BASE_URL}/api/team/all-members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        print(f"✓ Team all-members API returned {len(members)} records")
    
    def test_save_activity(self, headers):
        """Verify saving activity works"""
        today = datetime.now().strftime("%Y-%m-%d")
        activity_data = {
            "date": today,
            "contacts": 5,
            "appointments": 2,
            "presentations": 1,
            "referrals": 0,
            "testimonials": 0,
            "apps": 0,
            "sales": 0,
            "new_face_sold": 0,
            "bankers_premium": 0,
            "premium": 100
        }
        response = requests.post(f"{BASE_URL}/api/activities", 
            headers=headers, json=activity_data)
        # 200 for success, 400 if activity already exists for today
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            print(f"✓ Activity saved successfully for {today}")
        else:
            print(f"✓ Activity already exists for {today} (expected behavior)")


class TestNPATrackerWithTeamScope:
    """Test NPA Tracker functionality with team scoping"""
    
    def test_get_npa_tracker(self, headers):
        """Verify NPA tracker returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "achieved" in data
        assert "active" in data
        assert "goal" in data
        total = len(data.get("achieved", [])) + len(data.get("active", []))
        print(f"✓ NPA Tracker returned {total} agents (achieved: {len(data['achieved'])}, active: {len(data['active'])})")


class TestInterviewsWithTeamScope:
    """Test Interviews functionality with team scoping"""
    
    def test_get_interviews(self, headers):
        """Verify interviews API returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/interviews", headers=headers)
        assert response.status_code == 200
        interviews = response.json()
        assert isinstance(interviews, list)
        print(f"✓ Interviews API returned {len(interviews)} records")


class TestRecruitingWithTeamScope:
    """Test Recruiting functionality with team scoping"""
    
    def test_get_recruiting(self, headers):
        """Verify recruiting API returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/recruiting", headers=headers)
        assert response.status_code == 200
        recruits = response.json()
        assert isinstance(recruits, list)
        print(f"✓ Recruiting API returned {len(recruits)} records")


class TestSuitabilityFormsWithTeamScope:
    """Test Suitability Forms functionality with team scoping"""
    
    def test_get_suitability_forms(self, headers):
        """Verify suitability forms API returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/suitability-forms", headers=headers)
        assert response.status_code == 200
        forms = response.json()
        assert isinstance(forms, list)
        print(f"✓ Suitability Forms API returned {len(forms)} records")


class TestReportsWithTeamScope:
    """Test Reports functionality with team scoping"""
    
    def test_get_daily_report(self, headers):
        """Verify daily report API works"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/reports/daily/individual?date={today}", headers=headers)
        assert response.status_code == 200
        report = response.json()
        assert "data" in report
        print(f"✓ Daily report API returned data for {today}")
    
    def test_get_period_report(self, headers):
        """Verify period report API works"""
        response = requests.get(f"{BASE_URL}/api/reports/period/individual?period=monthly", headers=headers)
        assert response.status_code == 200
        report = response.json()
        assert "data" in report
        print(f"✓ Period report API returned data")
    
    def test_get_managers_list(self, headers):
        """Verify managers list API works"""
        response = requests.get(f"{BASE_URL}/api/reports/managers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "managers" in data
        print(f"✓ Managers list API returned {len(data['managers'])} managers")


class TestLeaderboardWithTeamScope:
    """Test Leaderboard functionality with team scoping"""
    
    def test_get_leaderboard(self, headers):
        """Verify leaderboard API returns data"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/weekly", headers=headers)
        assert response.status_code == 200
        leaderboard = response.json()
        # Leaderboard returns a dict with categories
        assert isinstance(leaderboard, dict)
        assert "premium" in leaderboard or "presentations" in leaderboard
        print(f"✓ Leaderboard API returned data with categories")


class TestGoalsWithTeamScope:
    """Test Goals functionality with team scoping"""
    
    def test_get_pma_bonuses(self, headers):
        """Verify PMA bonuses API returns data (goals-related)"""
        response = requests.get(f"{BASE_URL}/api/pma-bonuses", headers=headers)
        assert response.status_code == 200
        bonuses = response.json()
        assert isinstance(bonuses, list)
        print(f"✓ PMA Bonuses API returned {len(bonuses)} records")


class TestNewFaceCustomersWithTeamScope:
    """Test New Face Customers functionality with team scoping"""
    
    def test_get_my_new_face_customers(self, headers):
        """Verify new face customers API returns data"""
        response = requests.get(f"{BASE_URL}/api/new-face-customers/my", headers=headers)
        assert response.status_code == 200
        customers = response.json()
        assert isinstance(customers, list)
        print(f"✓ New Face Customers API returned {len(customers)} records")


class TestPMABonusesWithTeamScope:
    """Test PMA Bonuses functionality with team scoping"""
    
    def test_get_pma_bonuses(self, headers):
        """Verify PMA bonuses API returns data"""
        response = requests.get(f"{BASE_URL}/api/pma-bonuses", headers=headers)
        assert response.status_code == 200
        bonuses = response.json()
        assert isinstance(bonuses, list)
        print(f"✓ PMA Bonuses API returned {len(bonuses)} records")


class TestDocuSphereWithTeamScope:
    """Test DocuSphere functionality with team scoping"""
    
    def test_get_docusphere_folders(self, headers):
        """Verify DocuSphere folders API returns data"""
        response = requests.get(f"{BASE_URL}/api/docusphere/folders", headers=headers)
        assert response.status_code == 200
        folders = response.json()
        assert isinstance(folders, list)
        print(f"✓ DocuSphere folders API returned {len(folders)} folders")


class TestAdminPanelAccess:
    """Test Admin Panel access for state_manager"""
    
    def test_admin_teams_access(self, headers):
        """Verify state_manager can access admin teams"""
        response = requests.get(f"{BASE_URL}/api/admin/teams", headers=headers)
        assert response.status_code == 200
        teams = response.json()
        assert len(teams) >= 1
        team_sudbeck = next((t for t in teams if t["name"] == "Team Sudbeck"), None)
        assert team_sudbeck is not None
        assert team_sudbeck["user_count"] == 58
        print(f"✓ Admin teams access works - Team Sudbeck has {team_sudbeck['user_count']} members")
    
    def test_admin_users_access(self, headers):
        """Verify state_manager can access admin users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        assert len(users) == 58
        # Verify all users have team assignment
        for user in users:
            assert user.get("team_name") == "Team Sudbeck", f"User {user['name']} not in Team Sudbeck"
        print(f"✓ Admin users access works - all {len(users)} users in Team Sudbeck")


class TestDataIsolation:
    """Test that data is properly isolated by team"""
    
    def test_all_users_have_team_id(self, headers):
        """Verify all users have team_id assigned"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        users = response.json()
        users_without_team = [u for u in users if not u.get("team_id")]
        assert len(users_without_team) == 0, f"Found {len(users_without_team)} users without team_id"
        print(f"✓ All {len(users)} users have team_id assigned")
    
    def test_team_members_match_admin_count(self, headers):
        """Verify team members count matches admin panel"""
        # Get admin teams
        teams_response = requests.get(f"{BASE_URL}/api/admin/teams", headers=headers)
        teams = teams_response.json()
        team_sudbeck = next((t for t in teams if t["name"] == "Team Sudbeck"), None)
        
        # Get admin users
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        users = users_response.json()
        
        assert team_sudbeck["user_count"] == len(users), "Team user count should match admin users count"
        print(f"✓ Team user count ({team_sudbeck['user_count']}) matches admin users ({len(users)})")
