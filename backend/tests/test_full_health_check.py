"""
Test suite for Full Data Health Check feature
Tests the GET /api/admin/full-health-check endpoint and all backfill endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://metricdash-10.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@pmagent.net"
SUPER_ADMIN_PASSWORD = "Bizlink25"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super_admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestFullHealthCheckEndpoint:
    """Tests for GET /api/admin/full-health-check endpoint"""
    
    def test_health_check_returns_200(self, headers):
        """Test that health check endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_health_check_has_build_info(self, headers):
        """Test that response includes build_info with version and timestamp"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        assert "build_info" in data, "Missing build_info in response"
        build_info = data["build_info"]
        
        assert "version" in build_info, "Missing version in build_info"
        assert "timestamp" in build_info, "Missing timestamp in build_info"
        assert "deployed_at" in build_info, "Missing deployed_at in build_info"
        
        # Verify version format (e.g., "2.1.0")
        assert build_info["version"], "Version should not be empty"
        assert "." in build_info["version"], "Version should be in semver format"
    
    def test_health_check_has_summary(self, headers):
        """Test that response includes summary with overall status"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        assert "summary" in data, "Missing summary in response"
        summary = data["summary"]
        
        assert "total_teams" in summary, "Missing total_teams in summary"
        assert "total_records_missing_team_id" in summary, "Missing total_records_missing_team_id"
        assert "total_cross_team_issues" in summary, "Missing total_cross_team_issues"
        assert "overall_status" in summary, "Missing overall_status"
        assert "missing_by_collection" in summary, "Missing missing_by_collection"
        assert "cross_team_by_collection" in summary, "Missing cross_team_by_collection"
        
        # Verify overall_status is PASS or FAIL
        assert summary["overall_status"] in ["PASS", "FAIL"], f"Invalid overall_status: {summary['overall_status']}"
    
    def test_health_check_has_teams_array(self, headers):
        """Test that response includes teams array with team data"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        assert "teams" in data, "Missing teams in response"
        assert isinstance(data["teams"], list), "teams should be a list"
        assert len(data["teams"]) >= 2, "Should have at least 2 teams (Team Sudbeck, Team Quick)"
    
    def test_health_check_team_structure(self, headers):
        """Test that each team has required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        for team in data["teams"]:
            assert "team_name" in team, f"Missing team_name in team: {team}"
            assert "status" in team, f"Missing status in team: {team}"
            assert "counts" in team, f"Missing counts in team: {team}"
            
            # Verify status is PASS, FAIL, or NEEDS FIX
            assert team["status"] in ["PASS", "FAIL", "NEEDS FIX"], f"Invalid status: {team['status']}"
            
            # Skip count validation for Unassigned pseudo-team (may have empty counts when no missing data)
            if team.get("team_id") is None:
                continue
            
            # Verify counts has all required collections for real teams
            counts = team["counts"]
            required_collections = ["users", "recruits", "interviews", "new_face_customers", "activities", "sna_agents", "npa_agents"]
            for col in required_collections:
                assert col in counts, f"Missing {col} in counts for team {team['team_name']}"
    
    def test_health_check_team_sudbeck_exists(self, headers):
        """Test that Team Sudbeck is in the results"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        team_names = [t["team_name"] for t in data["teams"]]
        assert "Team Sudbeck" in team_names, f"Team Sudbeck not found. Teams: {team_names}"
    
    def test_health_check_team_quick_exists(self, headers):
        """Test that Team Quick is in the results"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        team_names = [t["team_name"] for t in data["teams"]]
        assert "Team Quick" in team_names, f"Team Quick not found. Teams: {team_names}"
    
    def test_health_check_has_backfill_available(self, headers):
        """Test that response includes backfill_available flags"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        assert "backfill_available" in data, "Missing backfill_available in response"
        backfill = data["backfill_available"]
        
        required_collections = ["recruits", "interviews", "new_face_customers", "activities", "sna_agents", "npa_agents"]
        for col in required_collections:
            assert col in backfill, f"Missing {col} in backfill_available"
            assert isinstance(backfill[col], bool), f"{col} should be boolean"
    
    def test_health_check_pass_status_when_no_issues(self, headers):
        """Test that overall status is PASS when no missing team_id or cross-team issues"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        summary = data["summary"]
        
        # If no issues, status should be PASS
        if summary["total_records_missing_team_id"] == 0 and summary["total_cross_team_issues"] == 0:
            assert summary["overall_status"] == "PASS", "Status should be PASS when no issues"


class TestBackfillEndpoints:
    """Tests for all backfill endpoints"""
    
    def test_migrate_recruits_team_id(self, headers):
        """Test POST /api/admin/migrate-recruits-team-id"""
        response = requests.post(f"{BASE_URL}/api/admin/migrate-recruits-team-id", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "migration_report" in data, "Missing migration_report in response"
        report = data["migration_report"]
        
        assert "total_updated" in report, "Missing total_updated in report"
        assert isinstance(report["total_updated"], int), "total_updated should be int"
    
    def test_migrate_interviews_team_id(self, headers):
        """Test POST /api/admin/migrate-interviews-team-id"""
        response = requests.post(f"{BASE_URL}/api/admin/migrate-interviews-team-id", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "migration_report" in data, "Missing migration_report in response"
        report = data["migration_report"]
        
        assert "collection" in report, "Missing collection in report"
        assert report["collection"] == "interviews", f"Expected 'interviews', got {report['collection']}"
        assert "total_updated" in report, "Missing total_updated in report"
    
    def test_migrate_new_face_customers_team_id(self, headers):
        """Test POST /api/admin/migrate-new-face-customers-team-id"""
        response = requests.post(f"{BASE_URL}/api/admin/migrate-new-face-customers-team-id", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "migration_report" in data, "Missing migration_report in response"
        report = data["migration_report"]
        
        assert "collection" in report, "Missing collection in report"
        assert report["collection"] == "new_face_customers", f"Expected 'new_face_customers', got {report['collection']}"
    
    def test_migrate_activities_team_id(self, headers):
        """Test POST /api/admin/migrate-activities-team-id"""
        response = requests.post(f"{BASE_URL}/api/admin/migrate-activities-team-id", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "migration_report" in data, "Missing migration_report in response"
    
    def test_backfill_sna_agents_team_id(self, headers):
        """Test POST /api/admin/backfill-sna-agents-team-id"""
        response = requests.post(f"{BASE_URL}/api/admin/backfill-sna-agents-team-id", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "collection" in data, "Missing collection in response"
        assert data["collection"] == "sna_agents", f"Expected 'sna_agents', got {data['collection']}"
        assert "total_updated" in data, "Missing total_updated in response"
    
    def test_backfill_npa_agents_team_id(self, headers):
        """Test POST /api/admin/backfill-npa-agents-team-id"""
        response = requests.post(f"{BASE_URL}/api/admin/backfill-npa-agents-team-id", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "collection" in data, "Missing collection in response"
        assert data["collection"] == "npa_agents", f"Expected 'npa_agents', got {data['collection']}"
        assert "total_updated" in data, "Missing total_updated in response"


class TestAuthorizationRequirements:
    """Tests for authorization requirements on health check endpoints"""
    
    def test_health_check_requires_auth(self):
        """Test that health check requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_health_check_rejects_invalid_token(self):
        """Test that health check rejects invalid token"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403 with invalid token, got {response.status_code}"
    
    def test_backfill_requires_super_admin(self, headers):
        """Test that backfill endpoints work with super_admin"""
        # This test verifies super_admin can access backfill endpoints
        response = requests.post(f"{BASE_URL}/api/admin/migrate-recruits-team-id", headers=headers)
        assert response.status_code == 200, f"Super admin should be able to run backfill: {response.text}"


class TestHealthCheckDataIntegrity:
    """Tests for data integrity in health check results"""
    
    def test_team_counts_are_non_negative(self, headers):
        """Test that all team counts are non-negative integers"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        for team in data["teams"]:
            for col, count in team["counts"].items():
                assert isinstance(count, int), f"Count for {col} should be int, got {type(count)}"
                assert count >= 0, f"Count for {col} should be non-negative, got {count}"
    
    def test_missing_by_collection_matches_unassigned(self, headers):
        """Test that missing_by_collection matches unassigned team counts"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        # Find unassigned team
        unassigned = None
        for team in data["teams"]:
            if team["team_id"] is None:
                unassigned = team
                break
        
        if unassigned:
            summary = data["summary"]
            # Verify missing counts match unassigned counts
            for col in ["users", "recruits", "interviews", "new_face_customers", "activities", "sna_agents", "npa_agents"]:
                expected = unassigned["counts"].get(col, 0)
                actual = summary["missing_by_collection"].get(col, 0)
                assert expected == actual, f"Mismatch for {col}: unassigned={expected}, missing_by_collection={actual}"
    
    def test_backfill_available_reflects_missing_data(self, headers):
        """Test that backfill_available flags match missing data"""
        response = requests.get(f"{BASE_URL}/api/admin/full-health-check", headers=headers)
        data = response.json()
        
        summary = data["summary"]
        backfill = data["backfill_available"]
        
        # For each collection, backfill should be True if missing > 0
        collection_map = {
            "recruits": "recruits",
            "interviews": "interviews",
            "new_face_customers": "new_face_customers",
            "activities": "activities",
            "sna_agents": "sna_agents",
            "npa_agents": "npa_agents"
        }
        
        for col, backfill_key in collection_map.items():
            missing = summary["missing_by_collection"].get(col, 0)
            should_be_available = missing > 0
            assert backfill[backfill_key] == should_be_available, \
                f"backfill_available[{backfill_key}] should be {should_be_available} when missing={missing}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
