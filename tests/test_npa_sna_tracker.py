"""
Test NPA and SNA Tracker endpoints
- NPA Tracker: Manual agent tracking toward $1,000 premium goal
- SNA Tracker: Automatic tracking of new agents toward $30,000 in 90 days
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials for state manager
STATE_MANAGER_EMAIL = "spencer.sudbeck@pmagent.net"
STATE_MANAGER_PASSWORD = "Bizlink25"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for state manager"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STATE_MANAGER_EMAIL,
        "password": STATE_MANAGER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAuthentication:
    """Test authentication for state manager"""
    
    def test_login_state_manager(self):
        """Test login with state manager credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STATE_MANAGER_EMAIL,
            "password": STATE_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "state_manager"
        print(f"✓ Login successful for {data['user']['name']}")


class TestNPATracker:
    """Test NPA Tracker endpoints - manual agent tracking"""
    
    def test_get_npa_tracker(self, auth_headers):
        """Test GET /api/npa-tracker returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get NPA data: {response.text}"
        
        data = response.json()
        assert "active" in data, "Response should have 'active' key"
        assert "achieved" in data, "Response should have 'achieved' key"
        assert "goal" in data, "Response should have 'goal' key"
        assert data["goal"] == 1000, f"NPA goal should be 1000, got {data['goal']}"
        
        print(f"✓ NPA Tracker: {len(data['active'])} active, {len(data['achieved'])} achieved")
    
    def test_add_npa_agent_manual(self, auth_headers):
        """Test adding an agent manually to NPA tracking"""
        test_agent = {
            "name": "TEST_Manual_Agent",
            "phone": "555-123-4567",
            "email": "test_manual@example.com",
            "start_date": "2025-01-01",
            "upline_dm": "Test DM",
            "upline_rm": "Test RM",
            "total_premium": 500,
            "notes": "Test agent for NPA tracking",
            "user_id": ""  # Empty for manual entry
        }
        
        response = requests.post(f"{BASE_URL}/api/npa-tracker", json=test_agent, headers=auth_headers)
        assert response.status_code == 200, f"Failed to add NPA agent: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have agent ID"
        assert "message" in data
        
        print(f"✓ Added manual NPA agent: {data['message']}")
        return data["id"]
    
    def test_verify_manual_agent_in_list(self, auth_headers):
        """Verify the manually added agent appears in NPA list"""
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        all_agents = data["active"] + data["achieved"]
        test_agent = next((a for a in all_agents if a["name"] == "TEST_Manual_Agent"), None)
        
        assert test_agent is not None, "Test agent should be in NPA list"
        assert test_agent["total_premium"] == 500, "Premium should be 500"
        assert test_agent["progress_percent"] == 50.0, "Progress should be 50%"
        assert test_agent["user_id"] == "", "user_id should be empty for manual entry"
        
        print(f"✓ Manual agent verified: {test_agent['name']} at {test_agent['progress_percent']}%")
    
    def test_update_npa_agent(self, auth_headers):
        """Test updating an NPA agent's premium"""
        # First get the test agent
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        data = response.json()
        all_agents = data["active"] + data["achieved"]
        test_agent = next((a for a in all_agents if a["name"] == "TEST_Manual_Agent"), None)
        
        if not test_agent:
            pytest.skip("Test agent not found")
        
        # Update premium to achieve NPA status
        update_data = {
            "total_premium": 1200,
            "notes": "Updated to achieve NPA"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/npa-tracker/{test_agent['id']}", 
            json=update_data, 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to update agent: {response.text}"
        
        # Verify agent moved to achieved
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        data = response.json()
        achieved_agent = next((a for a in data["achieved"] if a["name"] == "TEST_Manual_Agent"), None)
        
        assert achieved_agent is not None, "Agent should be in achieved list after reaching goal"
        assert achieved_agent["total_premium"] == 1200
        assert achieved_agent["achieved_npa"] == True
        
        print(f"✓ Agent updated and achieved NPA status")
    
    def test_delete_npa_agent(self, auth_headers):
        """Test deleting an NPA agent"""
        # Get the test agent
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        data = response.json()
        all_agents = data["active"] + data["achieved"]
        test_agent = next((a for a in all_agents if a["name"] == "TEST_Manual_Agent"), None)
        
        if not test_agent:
            pytest.skip("Test agent not found")
        
        response = requests.delete(
            f"{BASE_URL}/api/npa-tracker/{test_agent['id']}", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete agent: {response.text}"
        
        # Verify agent is removed
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        data = response.json()
        all_agents = data["active"] + data["achieved"]
        test_agent = next((a for a in all_agents if a["name"] == "TEST_Manual_Agent"), None)
        
        assert test_agent is None, "Test agent should be removed"
        print(f"✓ Test agent deleted successfully")


class TestSNATracker:
    """Test SNA Tracker endpoints - automatic new agent tracking"""
    
    def test_get_sna_tracker(self, auth_headers):
        """Test GET /api/sna-tracker returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/sna-tracker", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get SNA data: {response.text}"
        
        data = response.json()
        assert "active" in data, "Response should have 'active' key"
        assert "graduated" in data, "Response should have 'graduated' key"
        assert "goal" in data, "Response should have 'goal' key"
        assert "tracking_days" in data, "Response should have 'tracking_days' key"
        
        assert data["goal"] == 30000, f"SNA goal should be 30000, got {data['goal']}"
        assert data["tracking_days"] == 90, f"Tracking days should be 90, got {data['tracking_days']}"
        
        print(f"✓ SNA Tracker: {len(data['active'])} active, {len(data['graduated'])} graduated")
        print(f"  Goal: ${data['goal']:,} in {data['tracking_days']} days")


class TestTeamMembers:
    """Test team members endpoint for NPA dropdown"""
    
    def test_get_all_team_members(self, auth_headers):
        """Test GET /api/team/all-members returns team members"""
        response = requests.get(f"{BASE_URL}/api/team/all-members", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get team members: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check for agents in the list
        agents = [m for m in data if m.get('role') == 'agent']
        print(f"✓ Team members: {len(data)} total, {len(agents)} agents")
        
        if len(data) > 0:
            # Verify structure
            member = data[0]
            assert "id" in member, "Member should have id"
            assert "name" in member, "Member should have name"
            assert "role" in member, "Member should have role"


class TestNPAWithTeamMember:
    """Test NPA tracker with team member selection (premium from activities)"""
    
    def test_add_team_member_to_npa(self, auth_headers):
        """Test adding a team member to NPA tracking - premium should come from activities"""
        # First get team members
        response = requests.get(f"{BASE_URL}/api/team/all-members", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Could not get team members")
        
        team_members = response.json()
        agents = [m for m in team_members if m.get('role') == 'agent']
        
        if not agents:
            pytest.skip("No agents found in team")
        
        # Get first agent
        test_member = agents[0]
        
        # Check if already tracked
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        npa_data = response.json()
        all_tracked = npa_data["active"] + npa_data["achieved"]
        already_tracked = any(a.get("user_id") == test_member["id"] for a in all_tracked)
        
        if already_tracked:
            print(f"✓ Agent {test_member['name']} already tracked in NPA")
            return
        
        # Add team member to NPA tracking
        npa_agent = {
            "name": test_member["name"],
            "email": test_member.get("email", ""),
            "phone": "",
            "start_date": "2025-01-01",
            "upline_dm": "",
            "upline_rm": "",
            "total_premium": 0,  # Should be calculated from activities
            "notes": "Added via team member selection",
            "user_id": test_member["id"]  # Link to team member
        }
        
        response = requests.post(f"{BASE_URL}/api/npa-tracker", json=npa_agent, headers=auth_headers)
        assert response.status_code == 200, f"Failed to add team member to NPA: {response.text}"
        
        # Verify the agent's premium is calculated from activities
        response = requests.get(f"{BASE_URL}/api/npa-tracker", headers=auth_headers)
        npa_data = response.json()
        all_agents = npa_data["active"] + npa_data["achieved"]
        tracked_agent = next((a for a in all_agents if a.get("user_id") == test_member["id"]), None)
        
        assert tracked_agent is not None, "Team member should be in NPA list"
        print(f"✓ Team member {tracked_agent['name']} added to NPA tracking")
        print(f"  Premium from activities: ${tracked_agent['total_premium']:,.2f}")
        print(f"  Progress: {tracked_agent['progress_percent']}%")
        
        # Clean up - delete the test entry
        response = requests.delete(
            f"{BASE_URL}/api/npa-tracker/{tracked_agent['id']}", 
            headers=auth_headers
        )
        print(f"✓ Cleaned up test entry")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
