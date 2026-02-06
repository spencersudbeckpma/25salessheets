"""
Test Recruiting Pipeline Scoping by Hierarchy

Tests the following requirements:
1. State Manager can add recruit to any regional pipeline (RM dropdown required)
2. Regional Manager only sees their own pipeline (rm_id filter)
3. State Manager sees roll-up of all regionals (full team view)
4. No regional can see another regional's pipeline
5. Creating recruit without RM selection fails for State Manager (validation)
6. RM creating recruit auto-assigns to their own pipeline
7. Recruits persist correctly with rm_id through stages
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"email": "admin@pmagent.net", "password": "Bizlink25"}
RM_TEST_CREDS = {"email": "rm.test@pmagent.net", "password": "Bizlink25"}


class TestRecruitingPipelineScoping:
    """Test recruiting pipeline scoping by hierarchy"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        return response.json()['token']
    
    @pytest.fixture(scope="class")
    def super_admin_user(self, super_admin_token):
        """Get super admin user info"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture(scope="class")
    def rm_test_token(self):
        """Get RM test user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=RM_TEST_CREDS)
        assert response.status_code == 200, f"RM login failed: {response.text}"
        return response.json()['token']
    
    @pytest.fixture(scope="class")
    def rm_test_user(self, rm_test_token):
        """Get RM test user info"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture(scope="class")
    def team_regional_managers(self, super_admin_token, super_admin_user):
        """Get all regional managers in the team"""
        response = requests.get(
            f"{BASE_URL}/api/team/members",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        members = response.json()
        rms = [m for m in members if m.get('role') == 'regional_manager']
        return rms
    
    def test_01_super_admin_login(self, super_admin_token):
        """Test super admin can login"""
        assert super_admin_token is not None
        print(f"✓ Super admin login successful")
    
    def test_02_rm_test_login(self, rm_test_token, rm_test_user):
        """Test RM test user can login and has correct role"""
        assert rm_test_token is not None
        assert rm_test_user['role'] == 'regional_manager', f"Expected regional_manager, got {rm_test_user['role']}"
        print(f"✓ RM test user login successful: {rm_test_user['name']} (ID: {rm_test_user['id']})")
    
    def test_03_super_admin_sees_all_recruits(self, super_admin_token):
        """State Manager/Super Admin sees roll-up of all regionals (full team view)"""
        response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get recruits: {response.text}"
        recruits = response.json()
        print(f"✓ Super admin sees {len(recruits)} total recruits in team")
        
        # Check that recruits have rm_id field
        if recruits:
            rm_ids = set(r.get('rm_id') for r in recruits if r.get('rm_id'))
            print(f"  Recruits distributed across {len(rm_ids)} regional managers")
    
    def test_04_rm_only_sees_own_pipeline(self, rm_test_token, rm_test_user, super_admin_token):
        """Regional Manager only sees their own pipeline (rm_id filter)"""
        # Get RM's view
        rm_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        assert rm_response.status_code == 200, f"RM failed to get recruits: {rm_response.text}"
        rm_recruits = rm_response.json()
        
        # Verify all recruits belong to this RM
        for recruit in rm_recruits:
            assert recruit.get('rm_id') == rm_test_user['id'], \
                f"RM sees recruit not in their pipeline: {recruit.get('name')} (rm_id: {recruit.get('rm_id')})"
        
        print(f"✓ RM {rm_test_user['name']} sees only {len(rm_recruits)} recruits in their pipeline")
        
        # Compare with super admin view to verify filtering
        admin_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        admin_recruits = admin_response.json()
        
        # Count how many recruits belong to this RM in admin view
        admin_rm_recruits = [r for r in admin_recruits if r.get('rm_id') == rm_test_user['id']]
        assert len(rm_recruits) == len(admin_rm_recruits), \
            f"RM sees {len(rm_recruits)} but admin shows {len(admin_rm_recruits)} for this RM"
        print(f"  Verified: RM count matches admin's view of RM's pipeline")
    
    def test_05_super_admin_must_select_rm(self, super_admin_token):
        """Creating recruit without RM selection fails for State Manager/Super Admin (validation)"""
        # Try to create recruit without rm_id
        recruit_data = {
            "name": f"TEST_NoRM_{uuid.uuid4().hex[:8]}",
            "phone": "555-0000",
            "email": "test.nrm@test.com",
            "source": "Test",
            # Intentionally missing rm_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/recruiting",
            json=recruit_data,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Should fail with 400 - RM selection required
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "Regional Manager" in response.json().get('detail', ''), \
            f"Expected RM required error, got: {response.json()}"
        print(f"✓ Super admin correctly blocked from creating recruit without RM selection")
    
    def test_06_super_admin_can_add_to_any_rm_pipeline(self, super_admin_token, team_regional_managers):
        """State Manager/Super Admin can add recruit to any regional pipeline"""
        if not team_regional_managers:
            pytest.skip("No regional managers found in team")
        
        # Pick the first RM
        target_rm = team_regional_managers[0]
        
        recruit_data = {
            "name": f"TEST_AdminAdd_{uuid.uuid4().hex[:8]}",
            "phone": "555-1111",
            "email": "test.adminadd@test.com",
            "source": "Admin Test",
            "rm_id": target_rm['id'],  # Assign to specific RM
            "rm": target_rm['name']
        }
        
        response = requests.post(
            f"{BASE_URL}/api/recruiting",
            json=recruit_data,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create recruit: {response.text}"
        recruit_id = response.json().get('id')
        print(f"✓ Super admin created recruit in {target_rm['name']}'s pipeline (ID: {recruit_id})")
        
        # Verify the recruit was assigned to the correct RM
        get_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        recruits = get_response.json()
        created_recruit = next((r for r in recruits if r.get('id') == recruit_id), None)
        
        assert created_recruit is not None, "Created recruit not found"
        assert created_recruit.get('rm_id') == target_rm['id'], \
            f"Recruit rm_id mismatch: expected {target_rm['id']}, got {created_recruit.get('rm_id')}"
        print(f"  Verified: Recruit correctly assigned to RM {target_rm['name']}")
        
        return recruit_id
    
    def test_07_rm_auto_assigns_to_own_pipeline(self, rm_test_token, rm_test_user):
        """RM creating recruit auto-assigns to their own pipeline"""
        recruit_data = {
            "name": f"TEST_RMCreate_{uuid.uuid4().hex[:8]}",
            "phone": "555-2222",
            "email": "test.rmcreate@test.com",
            "source": "RM Test",
            # No rm_id provided - should auto-assign
        }
        
        response = requests.post(
            f"{BASE_URL}/api/recruiting",
            json=recruit_data,
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        
        assert response.status_code == 200, f"RM failed to create recruit: {response.text}"
        recruit_id = response.json().get('id')
        print(f"✓ RM created recruit (ID: {recruit_id})")
        
        # Verify the recruit was auto-assigned to this RM
        get_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        recruits = get_response.json()
        created_recruit = next((r for r in recruits if r.get('id') == recruit_id), None)
        
        assert created_recruit is not None, "Created recruit not found in RM's view"
        assert created_recruit.get('rm_id') == rm_test_user['id'], \
            f"Recruit not auto-assigned to RM: expected {rm_test_user['id']}, got {created_recruit.get('rm_id')}"
        assert created_recruit.get('rm') == rm_test_user['name'], \
            f"Recruit RM name mismatch: expected {rm_test_user['name']}, got {created_recruit.get('rm')}"
        print(f"  Verified: Recruit auto-assigned to RM {rm_test_user['name']}")
        
        return recruit_id
    
    def test_08_rm_cannot_see_other_rm_pipeline(self, rm_test_token, rm_test_user, super_admin_token, team_regional_managers):
        """No regional can see another regional's pipeline"""
        # Get all recruits from admin view
        admin_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        all_recruits = admin_response.json()
        
        # Find recruits belonging to OTHER RMs
        other_rm_recruits = [r for r in all_recruits if r.get('rm_id') and r.get('rm_id') != rm_test_user['id']]
        
        if not other_rm_recruits:
            print("⚠ No recruits from other RMs to test isolation")
            return
        
        # Get RM's view
        rm_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        rm_recruits = rm_response.json()
        rm_recruit_ids = set(r.get('id') for r in rm_recruits)
        
        # Verify RM cannot see any of the other RM's recruits
        leaked_recruits = [r for r in other_rm_recruits if r.get('id') in rm_recruit_ids]
        assert len(leaked_recruits) == 0, \
            f"RM can see {len(leaked_recruits)} recruits from other RMs: {[r.get('name') for r in leaked_recruits]}"
        
        print(f"✓ RM {rm_test_user['name']} cannot see {len(other_rm_recruits)} recruits from other RMs")
    
    def test_09_recruit_persists_rm_id_through_stages(self, rm_test_token, rm_test_user):
        """Recruits persist correctly with rm_id through stages"""
        # Create a recruit
        recruit_data = {
            "name": f"TEST_Stages_{uuid.uuid4().hex[:8]}",
            "phone": "555-3333",
            "email": "test.stages@test.com",
            "source": "Stage Test",
            "pipeline_status": "active"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/recruiting",
            json=recruit_data,
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        assert create_response.status_code == 200
        recruit_id = create_response.json().get('id')
        
        # Get the recruit
        get_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        recruits = get_response.json()
        recruit = next((r for r in recruits if r.get('id') == recruit_id), None)
        assert recruit is not None
        original_rm_id = recruit.get('rm_id')
        
        # Update to completed status
        update_data = {**recruit, "pipeline_status": "completed"}
        update_response = requests.put(
            f"{BASE_URL}/api/recruiting/{recruit_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        # Verify rm_id persisted
        get_response2 = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        recruits2 = get_response2.json()
        updated_recruit = next((r for r in recruits2 if r.get('id') == recruit_id), None)
        
        assert updated_recruit is not None, "Recruit not found after update"
        assert updated_recruit.get('rm_id') == original_rm_id, \
            f"rm_id changed after update: {original_rm_id} -> {updated_recruit.get('rm_id')}"
        assert updated_recruit.get('pipeline_status') == 'completed', \
            f"Status not updated: {updated_recruit.get('pipeline_status')}"
        
        print(f"✓ Recruit rm_id persisted through status change: {original_rm_id}")
        
        # Move to did_not_complete
        update_data2 = {**updated_recruit, "pipeline_status": "did_not_complete"}
        update_response2 = requests.put(
            f"{BASE_URL}/api/recruiting/{recruit_id}",
            json=update_data2,
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        assert update_response2.status_code == 200
        
        # Verify rm_id still persisted
        get_response3 = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        recruits3 = get_response3.json()
        final_recruit = next((r for r in recruits3 if r.get('id') == recruit_id), None)
        
        assert final_recruit is not None
        assert final_recruit.get('rm_id') == original_rm_id, \
            f"rm_id changed after second update: {original_rm_id} -> {final_recruit.get('rm_id')}"
        print(f"  Verified: rm_id persisted through all status changes")
    
    def test_10_cleanup_test_recruits(self, super_admin_token):
        """Cleanup: Archive test recruits"""
        response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        recruits = response.json()
        
        test_recruits = [r for r in recruits if r.get('name', '').startswith('TEST_')]
        cleaned = 0
        
        for recruit in test_recruits:
            delete_response = requests.delete(
                f"{BASE_URL}/api/recruiting/{recruit['id']}",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            if delete_response.status_code == 200:
                cleaned += 1
        
        print(f"✓ Cleaned up {cleaned} test recruits")


class TestRecruitingValidation:
    """Test recruiting validation rules"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200
        return response.json()['token']
    
    @pytest.fixture(scope="class")
    def rm_test_token(self):
        """Get RM test user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=RM_TEST_CREDS)
        assert response.status_code == 200
        return response.json()['token']
    
    def test_invalid_rm_id_rejected(self, super_admin_token):
        """Super admin cannot assign to invalid RM ID"""
        recruit_data = {
            "name": f"TEST_InvalidRM_{uuid.uuid4().hex[:8]}",
            "rm_id": "invalid-rm-id-12345",
            "rm": "Fake RM"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/recruiting",
            json=recruit_data,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Invalid RM ID correctly rejected")
    
    def test_rm_cannot_modify_other_rm_recruit(self, rm_test_token, super_admin_token):
        """RM cannot modify recruits in another RM's pipeline"""
        # First, get a recruit from another RM (via admin)
        admin_response = requests.get(
            f"{BASE_URL}/api/recruiting",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        all_recruits = admin_response.json()
        
        # Get RM's ID
        rm_me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        rm_user = rm_me_response.json()
        
        # Find a recruit from another RM
        other_rm_recruit = next(
            (r for r in all_recruits if r.get('rm_id') and r.get('rm_id') != rm_user['id']),
            None
        )
        
        if not other_rm_recruit:
            pytest.skip("No recruits from other RMs to test")
        
        # Try to update it
        update_data = {**other_rm_recruit, "comments": "Hacked by other RM"}
        update_response = requests.put(
            f"{BASE_URL}/api/recruiting/{other_rm_recruit['id']}",
            json=update_data,
            headers={"Authorization": f"Bearer {rm_test_token}"}
        )
        
        # Should fail - either 403 or 404 (can't see it)
        assert update_response.status_code in [403, 404], \
            f"RM should not be able to modify other RM's recruit: {update_response.status_code}"
        print(f"✓ RM correctly blocked from modifying other RM's recruit")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
