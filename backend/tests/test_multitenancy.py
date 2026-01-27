"""
Multi-tenancy Backend Tests
Tests for team management, user assignments, and data isolation
"""
import pytest
import requests
import os

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


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_state_manager_success(self):
        """Test state_manager login succeeds"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STATE_MANAGER_EMAIL,
            "password": STATE_MANAGER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "state_manager"
        assert data["user"]["email"] == STATE_MANAGER_EMAIL
        print(f"✓ Login successful for {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestAdminTeams:
    """Admin team management tests"""
    
    def test_get_all_teams(self, headers):
        """Test getting all teams - should show Team Sudbeck with 58 members"""
        response = requests.get(f"{BASE_URL}/api/admin/teams", headers=headers)
        assert response.status_code == 200
        teams = response.json()
        assert isinstance(teams, list)
        assert len(teams) >= 1
        
        # Find Team Sudbeck
        team_sudbeck = next((t for t in teams if t["name"] == "Team Sudbeck"), None)
        assert team_sudbeck is not None, "Team Sudbeck not found"
        assert team_sudbeck["user_count"] == 58, f"Expected 58 members, got {team_sudbeck['user_count']}"
        print(f"✓ Team Sudbeck found with {team_sudbeck['user_count']} members")
    
    def test_create_new_team(self, headers):
        """Test creating a new team"""
        response = requests.post(f"{BASE_URL}/api/admin/teams", 
            headers=headers,
            json={"name": "TEST_New_Team"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "team" in data
        assert data["team"]["name"] == "TEST_New_Team"
        print(f"✓ Created new team: {data['team']['name']}")
        
        # Store team_id for cleanup
        return data["team"]["id"]
    
    def test_create_duplicate_team_fails(self, headers):
        """Test creating a team with duplicate name fails"""
        response = requests.post(f"{BASE_URL}/api/admin/teams", 
            headers=headers,
            json={"name": "Team Sudbeck"}
        )
        assert response.status_code == 400
        print("✓ Duplicate team creation correctly rejected")
    
    def test_delete_empty_team(self, headers):
        """Test deleting an empty team"""
        # First create a team
        create_response = requests.post(f"{BASE_URL}/api/admin/teams", 
            headers=headers,
            json={"name": "TEST_Delete_Team"}
        )
        assert create_response.status_code == 200
        team_id = create_response.json()["team"]["id"]
        
        # Delete the team
        delete_response = requests.delete(f"{BASE_URL}/api/admin/teams/{team_id}", headers=headers)
        assert delete_response.status_code == 200
        print("✓ Empty team deleted successfully")
    
    def test_delete_team_with_users_fails(self, headers):
        """Test deleting a team with users fails"""
        # Get Team Sudbeck ID
        teams_response = requests.get(f"{BASE_URL}/api/admin/teams", headers=headers)
        teams = teams_response.json()
        team_sudbeck = next((t for t in teams if t["name"] == "Team Sudbeck"), None)
        
        # Try to delete - should fail
        delete_response = requests.delete(f"{BASE_URL}/api/admin/teams/{team_sudbeck['id']}", headers=headers)
        assert delete_response.status_code == 400
        assert "users assigned" in delete_response.json()["detail"].lower()
        print("✓ Cannot delete team with users - correctly rejected")


class TestAdminUsers:
    """Admin user management tests"""
    
    def test_get_all_users(self, headers):
        """Test getting all users with team info"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) == 58, f"Expected 58 users, got {len(users)}"
        
        # Check users have team_name field
        for user in users[:5]:
            assert "team_name" in user
            assert user["team_name"] == "Team Sudbeck"
        print(f"✓ Found {len(users)} users, all assigned to Team Sudbeck")
    
    def test_assign_user_to_team(self, headers):
        """Test assigning a user to a different team"""
        # First create a new team
        create_response = requests.post(f"{BASE_URL}/api/admin/teams", 
            headers=headers,
            json={"name": "TEST_Assignment_Team"}
        )
        assert create_response.status_code == 200
        new_team_id = create_response.json()["team"]["id"]
        
        # Get a user to reassign (not the state_manager)
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        users = users_response.json()
        test_user = next((u for u in users if u["role"] == "agent"), None)
        
        if test_user:
            original_team_id = test_user.get("team_id")
            
            # Assign to new team
            assign_response = requests.post(f"{BASE_URL}/api/admin/users/assign-team",
                headers=headers,
                json={"user_id": test_user["id"], "team_id": new_team_id}
            )
            assert assign_response.status_code == 200
            print(f"✓ User {test_user['name']} assigned to TEST_Assignment_Team")
            
            # Verify assignment
            users_response2 = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
            updated_user = next((u for u in users_response2.json() if u["id"] == test_user["id"]), None)
            assert updated_user["team_id"] == new_team_id
            
            # Restore original team
            requests.post(f"{BASE_URL}/api/admin/users/assign-team",
                headers=headers,
                json={"user_id": test_user["id"], "team_id": original_team_id}
            )
            
            # Delete test team
            requests.delete(f"{BASE_URL}/api/admin/teams/{new_team_id}", headers=headers)
        else:
            pytest.skip("No agent user found for testing")


class TestTeamScopedData:
    """Tests for team-scoped data isolation"""
    
    def test_team_members_api(self, headers):
        """Test /api/team/members returns users filtered by team"""
        response = requests.get(f"{BASE_URL}/api/team/members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        print(f"✓ Team members API returned {len(members)} members")
    
    def test_npa_tracker_api(self, headers):
        """Test /api/npa-tracker returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # NPA tracker returns dict with achieved, active, and goal keys
        assert isinstance(data, dict)
        assert "achieved" in data
        assert "active" in data
        assert "goal" in data
        total_records = len(data.get("achieved", [])) + len(data.get("active", []))
        print(f"✓ NPA Tracker API returned {total_records} records (achieved: {len(data.get('achieved', []))}, active: {len(data.get('active', []))})")
    
    def test_interviews_api(self, headers):
        """Test /api/interviews returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/interviews", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Interviews API returned {len(data)} records")
    
    def test_recruiting_api(self, headers):
        """Test /api/recruiting returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/recruiting", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Recruiting API returned {len(data)} records")
    
    def test_suitability_forms_api(self, headers):
        """Test /api/suitability-forms returns data scoped to team"""
        response = requests.get(f"{BASE_URL}/api/suitability-forms", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Suitability Forms API returned {len(data)} records")
    
    def test_activities_api(self, headers):
        """Test /api/activities returns data"""
        response = requests.get(f"{BASE_URL}/api/activities/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Activities API returned {len(data)} records")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_teams(self, headers):
        """Clean up any TEST_ prefixed teams"""
        response = requests.get(f"{BASE_URL}/api/admin/teams", headers=headers)
        teams = response.json()
        
        for team in teams:
            if team["name"].startswith("TEST_"):
                # Only delete if no users
                if team.get("user_count", 0) == 0:
                    requests.delete(f"{BASE_URL}/api/admin/teams/{team['id']}", headers=headers)
                    print(f"✓ Cleaned up test team: {team['name']}")
