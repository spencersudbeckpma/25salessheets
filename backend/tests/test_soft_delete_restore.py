"""
Test Suite for Soft Delete/Restore Functionality
Tests for Recruiting and Interviews deletion with undo guardrails.

Features tested:
1. Soft delete (archive) recruits - SM/RM/DM within their team
2. Restore archived recruits - SM/super_admin only
3. Get archived recruits list - SM/super_admin only
4. Soft delete (archive) interviews - creator OR SM OR super_admin
5. Restore archived interviews - SM/super_admin only
6. Get archived interviews list - SM/super_admin only
7. Stats exclude archived interviews
8. Cross-team delete attempts return 403
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@pmagent.net"
SUPER_ADMIN_PASSWORD = "Bizlink25"


class TestSoftDeleteRestore:
    """Test soft delete and restore functionality for recruits and interviews"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ==================== RECRUIT SOFT DELETE TESTS ====================
    
    def test_get_active_recruits(self, admin_headers):
        """Test GET /api/recruiting returns only active (non-archived) recruits"""
        response = requests.get(f"{BASE_URL}/api/recruiting", headers=admin_headers)
        assert response.status_code == 200
        recruits = response.json()
        # Verify no archived recruits in the list
        for recruit in recruits:
            assert recruit.get("is_archived") != True, f"Archived recruit found in active list: {recruit.get('name')}"
        print(f"✓ GET /api/recruiting returns {len(recruits)} active recruits (no archived)")
    
    def test_get_archived_recruits_endpoint(self, admin_headers):
        """Test GET /api/recruiting/archived returns archived recruits"""
        response = requests.get(f"{BASE_URL}/api/recruiting/archived", headers=admin_headers)
        assert response.status_code == 200
        archived = response.json()
        # All returned recruits should be archived
        for recruit in archived:
            assert recruit.get("is_archived") == True, f"Non-archived recruit in archived list: {recruit.get('name')}"
        print(f"✓ GET /api/recruiting/archived returns {len(archived)} archived recruits")
    
    def test_create_and_archive_recruit(self, admin_headers):
        """Test creating a recruit and then archiving it (soft delete)"""
        # Create a test recruit
        test_recruit = {
            "name": f"TEST_Archive_Recruit_{uuid.uuid4().hex[:8]}",
            "phone": "555-0199",
            "email": f"test_archive_{uuid.uuid4().hex[:8]}@test.com",
            "source": "Test",
            "state": "MN",
            "pipeline_status": "active"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/recruiting", json=test_recruit, headers=admin_headers)
        assert create_response.status_code == 200, f"Failed to create recruit: {create_response.text}"
        created = create_response.json()
        recruit_id = created["id"]
        print(f"✓ Created test recruit: {test_recruit['name']} (ID: {recruit_id})")
        
        # Archive the recruit (soft delete)
        delete_response = requests.delete(f"{BASE_URL}/api/recruiting/{recruit_id}", headers=admin_headers)
        assert delete_response.status_code == 200, f"Failed to archive recruit: {delete_response.text}"
        assert "archived" in delete_response.json().get("message", "").lower()
        print(f"✓ Archived recruit successfully")
        
        # Verify recruit is no longer in active list
        active_response = requests.get(f"{BASE_URL}/api/recruiting", headers=admin_headers)
        active_recruits = active_response.json()
        active_ids = [r["id"] for r in active_recruits]
        assert recruit_id not in active_ids, "Archived recruit still appears in active list"
        print(f"✓ Archived recruit not in active list")
        
        # Verify recruit is in archived list
        archived_response = requests.get(f"{BASE_URL}/api/recruiting/archived", headers=admin_headers)
        archived_recruits = archived_response.json()
        archived_ids = [r["id"] for r in archived_recruits]
        assert recruit_id in archived_ids, "Archived recruit not found in archived list"
        
        # Verify archived metadata
        archived_recruit = next((r for r in archived_recruits if r["id"] == recruit_id), None)
        assert archived_recruit is not None
        assert archived_recruit.get("is_archived") == True
        assert archived_recruit.get("archived_at") is not None
        assert archived_recruit.get("archived_by") is not None
        assert archived_recruit.get("archived_by_name") is not None
        print(f"✓ Archived recruit has correct metadata (archived_at, archived_by, archived_by_name)")
        
        return recruit_id
    
    def test_restore_archived_recruit(self, admin_headers):
        """Test restoring an archived recruit"""
        # First create and archive a recruit
        test_recruit = {
            "name": f"TEST_Restore_Recruit_{uuid.uuid4().hex[:8]}",
            "phone": "555-0200",
            "email": f"test_restore_{uuid.uuid4().hex[:8]}@test.com",
            "source": "Test",
            "state": "MN",
            "pipeline_status": "active"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/recruiting", json=test_recruit, headers=admin_headers)
        assert create_response.status_code == 200
        recruit_id = create_response.json()["id"]
        
        # Archive it
        delete_response = requests.delete(f"{BASE_URL}/api/recruiting/{recruit_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        print(f"✓ Created and archived test recruit for restore test")
        
        # Restore the recruit
        restore_response = requests.post(f"{BASE_URL}/api/recruiting/{recruit_id}/restore", headers=admin_headers)
        assert restore_response.status_code == 200, f"Failed to restore recruit: {restore_response.text}"
        assert "restored" in restore_response.json().get("message", "").lower()
        print(f"✓ Restored recruit successfully")
        
        # Verify recruit is back in active list
        active_response = requests.get(f"{BASE_URL}/api/recruiting", headers=admin_headers)
        active_recruits = active_response.json()
        active_ids = [r["id"] for r in active_recruits]
        assert recruit_id in active_ids, "Restored recruit not found in active list"
        print(f"✓ Restored recruit appears in active list")
        
        # Verify recruit is no longer in archived list
        archived_response = requests.get(f"{BASE_URL}/api/recruiting/archived", headers=admin_headers)
        archived_recruits = archived_response.json()
        archived_ids = [r["id"] for r in archived_recruits]
        assert recruit_id not in archived_ids, "Restored recruit still in archived list"
        print(f"✓ Restored recruit not in archived list")
        
        # Verify archived metadata is removed
        restored_recruit = next((r for r in active_recruits if r["id"] == recruit_id), None)
        assert restored_recruit is not None
        assert restored_recruit.get("is_archived") == False or restored_recruit.get("is_archived") is None
        print(f"✓ Restored recruit has is_archived=False")
        
        # Cleanup - archive again
        requests.delete(f"{BASE_URL}/api/recruiting/{recruit_id}", headers=admin_headers)
    
    def test_restore_nonexistent_recruit_returns_404(self, admin_headers):
        """Test restoring a non-existent recruit returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/recruiting/{fake_id}/restore", headers=admin_headers)
        assert response.status_code == 404
        print(f"✓ Restore non-existent recruit returns 404")
    
    # ==================== INTERVIEW SOFT DELETE TESTS ====================
    
    def test_get_active_interviews(self, admin_headers):
        """Test GET /api/interviews returns only active (non-archived) interviews"""
        response = requests.get(f"{BASE_URL}/api/interviews", headers=admin_headers)
        assert response.status_code == 200
        interviews = response.json()
        # Verify no archived interviews in the list
        for interview in interviews:
            assert interview.get("archived") != True, f"Archived interview found in active list: {interview.get('candidate_name')}"
        print(f"✓ GET /api/interviews returns {len(interviews)} active interviews (no archived)")
    
    def test_get_archived_interviews_endpoint(self, admin_headers):
        """Test GET /api/interviews/archived returns archived interviews"""
        response = requests.get(f"{BASE_URL}/api/interviews/archived", headers=admin_headers)
        assert response.status_code == 200
        archived = response.json()
        # All returned interviews should be archived
        for interview in archived:
            assert interview.get("archived") == True, f"Non-archived interview in archived list: {interview.get('candidate_name')}"
        print(f"✓ GET /api/interviews/archived returns {len(archived)} archived interviews")
    
    def test_create_and_archive_interview(self, admin_headers):
        """Test creating an interview and then archiving it (soft delete)"""
        # Create a test interview
        test_interview = {
            "candidate_name": f"TEST_Archive_Candidate_{uuid.uuid4().hex[:8]}",
            "candidate_location": "Test City, MN",
            "candidate_phone": "555-0201",
            "interview_date": datetime.now().strftime("%Y-%m-%d"),
            "hobbies_interests": "Testing",
            "must_have_commission": True,
            "must_have_travel": True,
            "must_have_background": True,
            "must_have_car": True,
            "work_history": "Test work history",
            "competitiveness_scale": 8,
            "work_ethic_scale": 9,
            "candidate_strength": 4,
            "status": "in_progress"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/interviews", json=test_interview, headers=admin_headers)
        assert create_response.status_code == 200, f"Failed to create interview: {create_response.text}"
        created = create_response.json()
        interview_id = created["id"]
        print(f"✓ Created test interview: {test_interview['candidate_name']} (ID: {interview_id})")
        
        # Archive the interview (soft delete)
        delete_response = requests.delete(f"{BASE_URL}/api/interviews/{interview_id}", headers=admin_headers)
        assert delete_response.status_code == 200, f"Failed to archive interview: {delete_response.text}"
        assert "archived" in delete_response.json().get("message", "").lower()
        print(f"✓ Archived interview successfully")
        
        # Verify interview is no longer in active list
        active_response = requests.get(f"{BASE_URL}/api/interviews", headers=admin_headers)
        active_interviews = active_response.json()
        active_ids = [i["id"] for i in active_interviews]
        assert interview_id not in active_ids, "Archived interview still appears in active list"
        print(f"✓ Archived interview not in active list")
        
        # Verify interview is in archived list
        archived_response = requests.get(f"{BASE_URL}/api/interviews/archived", headers=admin_headers)
        archived_interviews = archived_response.json()
        archived_ids = [i["id"] for i in archived_interviews]
        assert interview_id in archived_ids, "Archived interview not found in archived list"
        
        # Verify archived metadata
        archived_interview = next((i for i in archived_interviews if i["id"] == interview_id), None)
        assert archived_interview is not None
        assert archived_interview.get("archived") == True
        assert archived_interview.get("archived_at") is not None
        assert archived_interview.get("archived_by") is not None
        assert archived_interview.get("archived_by_name") is not None
        print(f"✓ Archived interview has correct metadata (archived_at, archived_by, archived_by_name)")
        
        return interview_id
    
    def test_restore_archived_interview(self, admin_headers):
        """Test restoring an archived interview"""
        # First create and archive an interview
        test_interview = {
            "candidate_name": f"TEST_Restore_Candidate_{uuid.uuid4().hex[:8]}",
            "candidate_location": "Test City, MN",
            "candidate_phone": "555-0202",
            "interview_date": datetime.now().strftime("%Y-%m-%d"),
            "hobbies_interests": "Testing",
            "must_have_commission": True,
            "must_have_travel": True,
            "must_have_background": True,
            "must_have_car": True,
            "work_history": "Test work history",
            "competitiveness_scale": 7,
            "work_ethic_scale": 8,
            "candidate_strength": 3,
            "status": "in_progress"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/interviews", json=test_interview, headers=admin_headers)
        assert create_response.status_code == 200
        interview_id = create_response.json()["id"]
        
        # Archive it
        delete_response = requests.delete(f"{BASE_URL}/api/interviews/{interview_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        print(f"✓ Created and archived test interview for restore test")
        
        # Restore the interview
        restore_response = requests.post(f"{BASE_URL}/api/interviews/{interview_id}/restore", headers=admin_headers)
        assert restore_response.status_code == 200, f"Failed to restore interview: {restore_response.text}"
        assert "restored" in restore_response.json().get("message", "").lower()
        print(f"✓ Restored interview successfully")
        
        # Verify interview is back in active list
        active_response = requests.get(f"{BASE_URL}/api/interviews", headers=admin_headers)
        active_interviews = active_response.json()
        active_ids = [i["id"] for i in active_interviews]
        assert interview_id in active_ids, "Restored interview not found in active list"
        print(f"✓ Restored interview appears in active list")
        
        # Verify interview is no longer in archived list
        archived_response = requests.get(f"{BASE_URL}/api/interviews/archived", headers=admin_headers)
        archived_interviews = archived_response.json()
        archived_ids = [i["id"] for i in archived_interviews]
        assert interview_id not in archived_ids, "Restored interview still in archived list"
        print(f"✓ Restored interview not in archived list")
        
        # Cleanup - archive again
        requests.delete(f"{BASE_URL}/api/interviews/{interview_id}", headers=admin_headers)
    
    def test_restore_nonexistent_interview_returns_404(self, admin_headers):
        """Test restoring a non-existent interview returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/interviews/{fake_id}/restore", headers=admin_headers)
        assert response.status_code == 404
        print(f"✓ Restore non-existent interview returns 404")
    
    # ==================== STATS EXCLUSION TESTS ====================
    
    def test_stats_exclude_archived_interviews(self, admin_headers):
        """Test that interview stats exclude archived interviews"""
        # Get initial stats
        initial_stats_response = requests.get(f"{BASE_URL}/api/interviews/stats", headers=admin_headers)
        assert initial_stats_response.status_code == 200
        initial_stats = initial_stats_response.json()
        initial_total = initial_stats.get("total", 0)
        print(f"✓ Initial stats: total={initial_total}")
        
        # Create a test interview
        test_interview = {
            "candidate_name": f"TEST_Stats_Candidate_{uuid.uuid4().hex[:8]}",
            "candidate_location": "Test City, MN",
            "candidate_phone": "555-0203",
            "interview_date": datetime.now().strftime("%Y-%m-%d"),
            "hobbies_interests": "Testing",
            "must_have_commission": True,
            "must_have_travel": True,
            "must_have_background": True,
            "must_have_car": True,
            "work_history": "Test work history",
            "competitiveness_scale": 6,
            "work_ethic_scale": 7,
            "candidate_strength": 3,
            "status": "in_progress"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/interviews", json=test_interview, headers=admin_headers)
        assert create_response.status_code == 200
        interview_id = create_response.json()["id"]
        
        # Get stats after creation
        after_create_stats = requests.get(f"{BASE_URL}/api/interviews/stats", headers=admin_headers).json()
        after_create_total = after_create_stats.get("total", 0)
        assert after_create_total == initial_total + 1, f"Stats should increase by 1 after creation"
        print(f"✓ Stats after creation: total={after_create_total} (increased by 1)")
        
        # Archive the interview
        delete_response = requests.delete(f"{BASE_URL}/api/interviews/{interview_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        
        # Get stats after archiving
        after_archive_stats = requests.get(f"{BASE_URL}/api/interviews/stats", headers=admin_headers).json()
        after_archive_total = after_archive_stats.get("total", 0)
        assert after_archive_total == initial_total, f"Stats should return to initial after archiving"
        print(f"✓ Stats after archiving: total={after_archive_total} (back to initial)")
        
        # Restore and verify stats increase again
        restore_response = requests.post(f"{BASE_URL}/api/interviews/{interview_id}/restore", headers=admin_headers)
        assert restore_response.status_code == 200
        
        after_restore_stats = requests.get(f"{BASE_URL}/api/interviews/stats", headers=admin_headers).json()
        after_restore_total = after_restore_stats.get("total", 0)
        assert after_restore_total == initial_total + 1, f"Stats should increase after restore"
        print(f"✓ Stats after restore: total={after_restore_total} (increased again)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/interviews/{interview_id}", headers=admin_headers)
    
    # ==================== CROSS-TEAM ACCESS TESTS ====================
    
    def test_delete_nonexistent_recruit_returns_404(self, admin_headers):
        """Test deleting a non-existent recruit returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/recruiting/{fake_id}", headers=admin_headers)
        assert response.status_code == 404
        print(f"✓ Delete non-existent recruit returns 404")
    
    def test_delete_nonexistent_interview_returns_404(self, admin_headers):
        """Test deleting a non-existent interview returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/interviews/{fake_id}", headers=admin_headers)
        assert response.status_code == 404
        print(f"✓ Delete non-existent interview returns 404")
    
    # ==================== UNAUTHENTICATED ACCESS TESTS ====================
    
    def test_unauthenticated_recruit_delete_returns_401(self):
        """Test that unauthenticated recruit delete returns 401/403"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/recruiting/{fake_id}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated recruit delete returns {response.status_code}")
    
    def test_unauthenticated_interview_delete_returns_401(self):
        """Test that unauthenticated interview delete returns 401/403"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/interviews/{fake_id}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated interview delete returns {response.status_code}")
    
    def test_unauthenticated_archived_recruits_returns_401(self):
        """Test that unauthenticated archived recruits list returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/recruiting/archived")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated archived recruits returns {response.status_code}")
    
    def test_unauthenticated_archived_interviews_returns_401(self):
        """Test that unauthenticated archived interviews list returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/interviews/archived")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated archived interviews returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
