"""
Hierarchy and Scoping Tests for Multi-Tenant NPA Tracker
Tests for team isolation, hierarchy filtering, and role-based access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@pmagent.net"
SUPER_ADMIN_PASSWORD = "Admin2026"
TEAM_QUICK_SM_EMAIL = "sean.quick@pmagent.net"
TEAM_QUICK_SM_PASSWORD = "PMA2026"
TEAM_SUDBECK_SM_EMAIL = "spencer.sudbeck@pmagent.net"
TEAM_SUDBECK_SM_PASSWORD = "Bizlink25"

# Team IDs (from test data)
TEAM_QUICK_ID = "7f0086f4-1c14-4e87-81c5-3dee1d0ff603"
TEAM_SUDBECK_ID = "32ae64ab-2518-481d-9d12-f65ca7aa91f4"


@pytest.fixture(scope="module")
def super_admin_token():
    """Get authentication token for super_admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Super admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def team_quick_token():
    """Get authentication token for Team Quick state_manager (Sean Quick)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEAM_QUICK_SM_EMAIL,
        "password": TEAM_QUICK_SM_PASSWORD
    })
    assert response.status_code == 200, f"Team Quick SM login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def team_sudbeck_token():
    """Get authentication token for Team Sudbeck state_manager (Spencer Sudbeck)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEAM_SUDBECK_SM_EMAIL,
        "password": TEAM_SUDBECK_SM_PASSWORD
    })
    assert response.status_code == 200, f"Team Sudbeck SM login failed: {response.text}"
    return response.json()["token"]


class TestTeamIsolation:
    """Tests for team-based data isolation"""
    
    def test_team_quick_sm_sees_only_team_quick_users(self, team_quick_token):
        """Sean Quick (Team Quick) should ONLY see Team Quick users via /users/active/list"""
        response = requests.get(
            f"{BASE_URL}/api/users/active/list",
            headers={"Authorization": f"Bearer {team_quick_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        
        # Verify all users belong to Team Quick
        for user in users:
            assert user.get('team_id') == TEAM_QUICK_ID, f"User {user['name']} has wrong team_id: {user.get('team_id')}"
        
        # Verify no Team Sudbeck users are visible
        sudbeck_users = [u for u in users if 'Sudbeck' in u.get('name', '')]
        assert len(sudbeck_users) == 0, f"Team Quick SM can see Team Sudbeck users: {[u['name'] for u in sudbeck_users]}"
        
        print(f"✓ Sean Quick sees {len(users)} Team Quick users only")
    
    def test_team_sudbeck_sm_sees_only_team_sudbeck_users(self, team_sudbeck_token):
        """Spencer Sudbeck (Team Sudbeck) should ONLY see Team Sudbeck users via /users/active/list"""
        response = requests.get(
            f"{BASE_URL}/api/users/active/list",
            headers={"Authorization": f"Bearer {team_sudbeck_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        
        # Verify all users belong to Team Sudbeck
        for user in users:
            assert user.get('team_id') == TEAM_SUDBECK_ID, f"User {user['name']} has wrong team_id: {user.get('team_id')}"
        
        # Verify no Team Quick users are visible
        quick_users = [u for u in users if 'Quick' in u.get('name', '') or u.get('team_id') == TEAM_QUICK_ID]
        assert len(quick_users) == 0, f"Team Sudbeck SM can see Team Quick users: {[u['name'] for u in quick_users]}"
        
        print(f"✓ Spencer Sudbeck sees {len(users)} Team Sudbeck users only")
    
    def test_super_admin_sees_all_users(self, super_admin_token):
        """Super admin should see ALL users from all teams via /users/active/list"""
        response = requests.get(
            f"{BASE_URL}/api/users/active/list",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        
        # Count users by team
        team_counts = {}
        for user in users:
            team_id = user.get('team_id', 'Unassigned')
            team_counts[team_id] = team_counts.get(team_id, 0) + 1
        
        # Verify we see users from multiple teams
        assert len(team_counts) >= 2, f"Super admin should see users from multiple teams, got: {team_counts}"
        assert len(users) >= 7, f"Super admin should see at least 7 users, got {len(users)}"
        
        print(f"✓ Super admin sees {len(users)} users across {len(team_counts)} teams")


class TestReportsManagersEndpoint:
    """Tests for /reports/managers endpoint team scoping"""
    
    def test_team_quick_sm_managers_list_scoped(self, team_quick_token):
        """Sean Quick should only see Team Quick members in /reports/managers"""
        response = requests.get(
            f"{BASE_URL}/api/reports/managers",
            headers={"Authorization": f"Bearer {team_quick_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        managers = data.get('managers', [])
        
        # Verify no Team Sudbeck users are visible
        sudbeck_managers = [m for m in managers if 'Sudbeck' in m.get('name', '')]
        assert len(sudbeck_managers) == 0, f"Team Quick SM can see Team Sudbeck managers: {[m['name'] for m in sudbeck_managers]}"
        
        print(f"✓ Sean Quick sees {len(managers)} managers in Team Quick hierarchy")
    
    def test_team_sudbeck_sm_managers_list_scoped(self, team_sudbeck_token):
        """Spencer Sudbeck should only see Team Sudbeck members in /reports/managers"""
        response = requests.get(
            f"{BASE_URL}/api/reports/managers",
            headers={"Authorization": f"Bearer {team_sudbeck_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        managers = data.get('managers', [])
        
        # Verify no Team Quick users are visible
        quick_managers = [m for m in managers if 'Quick' in m.get('name', '')]
        assert len(quick_managers) == 0, f"Team Sudbeck SM can see Team Quick managers: {[m['name'] for m in quick_managers]}"
        
        print(f"✓ Spencer Sudbeck sees {len(managers)} managers in Team Sudbeck hierarchy")


class TestAdminHierarchyEndpoints:
    """Tests for admin hierarchy viewing and repair endpoints"""
    
    def test_get_team_hierarchy(self, super_admin_token):
        """Test /admin/teams/{team_id}/hierarchy returns correct hierarchy tree"""
        response = requests.get(
            f"{BASE_URL}/api/admin/teams/{TEAM_QUICK_ID}/hierarchy",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['team_id'] == TEAM_QUICK_ID
        assert data['total_users'] >= 4, f"Expected at least 4 users in Team Quick, got {data['total_users']}"
        assert data['roots_count'] >= 1, "Expected at least 1 root (state_manager)"
        assert len(data['hierarchy']) >= 1, "Expected hierarchy tree to have at least 1 root"
        
        # Verify Sean Quick is at the root
        root_names = [h['name'] for h in data['hierarchy']]
        assert 'Sean Quick' in root_names, f"Sean Quick should be at root, got: {root_names}"
        
        print(f"✓ Team Quick hierarchy: {data['total_users']} users, {data['roots_count']} roots")
    
    def test_get_broken_hierarchy(self, super_admin_token):
        """Test /admin/teams/{team_id}/broken-hierarchy detects users with missing manager_id"""
        response = requests.get(
            f"{BASE_URL}/api/admin/teams/{TEAM_QUICK_ID}/broken-hierarchy",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['team_name'] == 'Team Quick'
        assert data['team_id'] == TEAM_QUICK_ID
        assert 'broken_count' in data
        assert 'broken_users' in data
        assert 'potential_managers' in data
        
        # After repair, broken_count should be 0
        print(f"✓ Team Quick broken hierarchy check: {data['broken_count']} broken users")
    
    def test_non_super_admin_cannot_access_hierarchy(self, team_quick_token):
        """Non-super_admin should not be able to access admin hierarchy endpoints"""
        response = requests.get(
            f"{BASE_URL}/api/admin/teams/{TEAM_QUICK_ID}/hierarchy",
            headers={"Authorization": f"Bearer {team_quick_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-super_admin correctly denied access to admin hierarchy endpoint")


class TestArchivedUsersScoping:
    """Tests for /users/archived/list team scoping"""
    
    def test_archived_users_scoped_by_team(self, team_quick_token, team_sudbeck_token):
        """Archived users should be scoped by team"""
        # Team Quick
        response_quick = requests.get(
            f"{BASE_URL}/api/users/archived/list",
            headers={"Authorization": f"Bearer {team_quick_token}"}
        )
        assert response_quick.status_code == 200
        archived_quick = response_quick.json()
        
        # Team Sudbeck
        response_sudbeck = requests.get(
            f"{BASE_URL}/api/users/archived/list",
            headers={"Authorization": f"Bearer {team_sudbeck_token}"}
        )
        assert response_sudbeck.status_code == 200
        archived_sudbeck = response_sudbeck.json()
        
        # Verify no cross-team visibility
        for user in archived_quick:
            assert user.get('team_id') == TEAM_QUICK_ID or user.get('team_id') is None, \
                f"Team Quick SM sees archived user from wrong team: {user['name']}"
        
        for user in archived_sudbeck:
            assert user.get('team_id') == TEAM_SUDBECK_ID or user.get('team_id') is None, \
                f"Team Sudbeck SM sees archived user from wrong team: {user['name']}"
        
        print(f"✓ Archived users properly scoped: Quick={len(archived_quick)}, Sudbeck={len(archived_sudbeck)}")


class TestRoleBasedAccess:
    """Tests for role-based access control"""
    
    def test_state_manager_has_admin_privileges(self, team_quick_token):
        """State manager should have admin privileges for their team"""
        # Should be able to access team members
        response = requests.get(
            f"{BASE_URL}/api/users/team-members",
            headers={"Authorization": f"Bearer {team_quick_token}"}
        )
        assert response.status_code == 200
        
        # Should be able to access reports
        response = requests.get(
            f"{BASE_URL}/api/reports/managers",
            headers={"Authorization": f"Bearer {team_quick_token}"}
        )
        assert response.status_code == 200
        
        print("✓ State manager has admin privileges for their team")
    
    def test_super_admin_can_access_all_admin_endpoints(self, super_admin_token):
        """Super admin should be able to access all admin endpoints"""
        # Get all teams
        response = requests.get(
            f"{BASE_URL}/api/admin/teams",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        # Get all users
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        print("✓ Super admin can access all admin endpoints")


class TestHierarchyIntegrity:
    """Tests for hierarchy integrity"""
    
    def test_team_quick_hierarchy_rolls_up(self, super_admin_token):
        """Verify Team Quick hierarchy rolls up correctly: Sean -> John -> Jane -> Bob"""
        response = requests.get(
            f"{BASE_URL}/api/admin/teams/{TEAM_QUICK_ID}/hierarchy",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Sean Quick's node
        sean_node = None
        for root in data['hierarchy']:
            if root['name'] == 'Sean Quick':
                sean_node = root
                break
        
        assert sean_node is not None, "Sean Quick not found at root"
        assert sean_node['role'] == 'state_manager'
        
        # Verify John Regional is under Sean
        john_node = None
        for child in sean_node.get('children', []):
            if child['name'] == 'John Regional':
                john_node = child
                break
        
        assert john_node is not None, "John Regional not found under Sean Quick"
        assert john_node['role'] == 'regional_manager'
        
        # Verify Jane District is under John
        jane_node = None
        for child in john_node.get('children', []):
            if child['name'] == 'Jane District':
                jane_node = child
                break
        
        assert jane_node is not None, "Jane District not found under John Regional"
        assert jane_node['role'] == 'district_manager'
        
        # Verify Bob Agent is under Jane
        bob_node = None
        for child in jane_node.get('children', []):
            if child['name'] == 'Bob Agent':
                bob_node = child
                break
        
        assert bob_node is not None, "Bob Agent not found under Jane District"
        assert bob_node['role'] == 'agent'
        
        print("✓ Team Quick hierarchy rolls up correctly: Sean -> John -> Jane -> Bob")
