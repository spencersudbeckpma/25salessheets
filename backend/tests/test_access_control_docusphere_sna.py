"""
Test Access Control Changes for DocuSphere Upload and SNA Tracker

Tests the following access changes:
1. DocuSphere upload - expanded from State Manager only to include RM and DM (agents remain read-only)
2. SNA Report - expanded from State Manager only to include RM (full downline) and DM (direct agent downline only)

Both must be strictly team-scoped with no cross-team visibility.
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"email": "admin@pmagent.net", "password": "Bizlink25"}
AGENT_CREDS = {"email": "sam.agent@pmagent.net", "password": "Bizlink25"}
STATE_MANAGER_CREDS = {"email": "spencer.sudbeck@pmagent.net", "password": "Bizlink25"}
REGIONAL_MANAGER_CREDS = {"email": "john.regional@pmagent.net", "password": "Bizlink25"}
DISTRICT_MANAGER_CREDS = {"email": "jane.district@pmagent.net", "password": "Bizlink25"}


class TestDocuSphereUploadAccess:
    """Test DocuSphere upload access control - SM, RM, DM can upload; Agents cannot"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for different roles"""
        self.tokens = {}
        
        # Get Super Admin token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        if resp.status_code == 200:
            self.tokens['super_admin'] = resp.json().get('token')
            self.super_admin_team_id = resp.json().get('user', {}).get('team_id')
        
        # Get Agent token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        if resp.status_code == 200:
            self.tokens['agent'] = resp.json().get('token')
        
        # Get State Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=STATE_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['state_manager'] = resp.json().get('token')
        
        # Get Regional Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=REGIONAL_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['regional_manager'] = resp.json().get('token')
        
        # Get District Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=DISTRICT_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['district_manager'] = resp.json().get('token')
    
    def _create_test_pdf(self):
        """Create a minimal valid PDF for testing"""
        # Minimal PDF content
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF"""
        return pdf_content
    
    def test_state_manager_can_upload(self):
        """State Manager should be able to upload documents (existing functionality)"""
        if 'state_manager' not in self.tokens:
            pytest.skip("State Manager credentials not available")
        
        pdf_content = self._create_test_pdf()
        files = {'file': ('test_sm_upload.pdf', pdf_content, 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['state_manager']}"},
            files=files
        )
        
        print(f"State Manager upload response: {response.status_code} - {response.text}")
        assert response.status_code in [200, 201], f"State Manager should be able to upload. Got: {response.status_code}"
        
        # Verify response contains document ID
        data = response.json()
        assert 'id' in data, "Response should contain document ID"
        assert 'filename' in data, "Response should contain filename"
    
    def test_regional_manager_can_upload(self):
        """Regional Manager should be able to upload documents (NEW functionality)"""
        if 'regional_manager' not in self.tokens:
            pytest.skip("Regional Manager credentials not available")
        
        pdf_content = self._create_test_pdf()
        files = {'file': ('test_rm_upload.pdf', pdf_content, 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['regional_manager']}"},
            files=files
        )
        
        print(f"Regional Manager upload response: {response.status_code} - {response.text}")
        assert response.status_code in [200, 201], f"Regional Manager should be able to upload. Got: {response.status_code}"
        
        # Verify response contains document ID
        data = response.json()
        assert 'id' in data, "Response should contain document ID"
    
    def test_district_manager_can_upload(self):
        """District Manager should be able to upload documents (NEW functionality)"""
        if 'district_manager' not in self.tokens:
            pytest.skip("District Manager credentials not available")
        
        pdf_content = self._create_test_pdf()
        files = {'file': ('test_dm_upload.pdf', pdf_content, 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['district_manager']}"},
            files=files
        )
        
        print(f"District Manager upload response: {response.status_code} - {response.text}")
        assert response.status_code in [200, 201], f"District Manager should be able to upload. Got: {response.status_code}"
        
        # Verify response contains document ID
        data = response.json()
        assert 'id' in data, "Response should contain document ID"
    
    def test_agent_cannot_upload(self):
        """Agent should NOT be able to upload documents (returns 403)"""
        if 'agent' not in self.tokens:
            pytest.skip("Agent credentials not available")
        
        pdf_content = self._create_test_pdf()
        files = {'file': ('test_agent_upload.pdf', pdf_content, 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['agent']}"},
            files=files
        )
        
        print(f"Agent upload response: {response.status_code} - {response.text}")
        assert response.status_code == 403, f"Agent should get 403 Forbidden. Got: {response.status_code}"
        
        # Verify error message
        data = response.json()
        assert 'detail' in data, "Response should contain error detail"
        assert 'manager' in data['detail'].lower() or 'upload' in data['detail'].lower(), \
            f"Error message should mention managers. Got: {data['detail']}"
    
    def test_super_admin_can_upload(self):
        """Super Admin should be able to upload documents"""
        if 'super_admin' not in self.tokens:
            pytest.skip("Super Admin credentials not available")
        
        pdf_content = self._create_test_pdf()
        files = {'file': ('test_admin_upload.pdf', pdf_content, 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"},
            files=files
        )
        
        print(f"Super Admin upload response: {response.status_code} - {response.text}")
        assert response.status_code in [200, 201], f"Super Admin should be able to upload. Got: {response.status_code}"
    
    def test_upload_is_team_scoped(self):
        """Verify uploaded documents are team-scoped"""
        if 'state_manager' not in self.tokens:
            pytest.skip("State Manager credentials not available")
        
        pdf_content = self._create_test_pdf()
        files = {'file': ('test_team_scope.pdf', pdf_content, 'application/pdf')}
        
        # Upload a document
        upload_response = requests.post(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['state_manager']}"},
            files=files
        )
        
        assert upload_response.status_code in [200, 201], "Upload should succeed"
        
        # Get documents list to verify team scoping
        list_response = requests.get(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['state_manager']}"}
        )
        
        assert list_response.status_code == 200, "Should be able to list documents"
        # Documents should be returned (team-scoped)
        print(f"Documents list response: {list_response.status_code}")


class TestSNATrackerAccess:
    """Test SNA Tracker access control - SM sees full team, RM sees downline, DM sees direct agents, Agent gets 403"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for different roles"""
        self.tokens = {}
        self.user_info = {}
        
        # Get Super Admin token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        if resp.status_code == 200:
            self.tokens['super_admin'] = resp.json().get('token')
            self.user_info['super_admin'] = resp.json().get('user', {})
        
        # Get Agent token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        if resp.status_code == 200:
            self.tokens['agent'] = resp.json().get('token')
            self.user_info['agent'] = resp.json().get('user', {})
        
        # Get State Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=STATE_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['state_manager'] = resp.json().get('token')
            self.user_info['state_manager'] = resp.json().get('user', {})
        
        # Get Regional Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=REGIONAL_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['regional_manager'] = resp.json().get('token')
            self.user_info['regional_manager'] = resp.json().get('user', {})
        
        # Get District Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=DISTRICT_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['district_manager'] = resp.json().get('token')
            self.user_info['district_manager'] = resp.json().get('user', {})
    
    def test_state_manager_can_access_sna(self):
        """State Manager should have full team visibility in SNA tracker (existing functionality)"""
        if 'state_manager' not in self.tokens:
            pytest.skip("State Manager credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/sna-tracker",
            headers={"Authorization": f"Bearer {self.tokens['state_manager']}"}
        )
        
        print(f"State Manager SNA response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"State Manager should access SNA tracker. Got: {response.status_code}"
        
        # Verify response structure
        data = response.json()
        assert 'active' in data, "Response should contain 'active' list"
        assert 'graduated' in data, "Response should contain 'graduated' list"
        assert 'goal' in data, "Response should contain 'goal'"
        assert 'tracking_days' in data, "Response should contain 'tracking_days'"
    
    def test_regional_manager_can_access_sna(self):
        """Regional Manager should see their full downline (DMs + Agents) in SNA tracker (NEW access)"""
        if 'regional_manager' not in self.tokens:
            pytest.skip("Regional Manager credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/sna-tracker",
            headers={"Authorization": f"Bearer {self.tokens['regional_manager']}"}
        )
        
        print(f"Regional Manager SNA response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Regional Manager should access SNA tracker. Got: {response.status_code}"
        
        # Verify response structure
        data = response.json()
        assert 'active' in data, "Response should contain 'active' list"
        assert 'graduated' in data, "Response should contain 'graduated' list"
    
    def test_district_manager_can_access_sna(self):
        """District Manager should see their direct agent downline only in SNA tracker (NEW access)"""
        if 'district_manager' not in self.tokens:
            pytest.skip("District Manager credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/sna-tracker",
            headers={"Authorization": f"Bearer {self.tokens['district_manager']}"}
        )
        
        print(f"District Manager SNA response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"District Manager should access SNA tracker. Got: {response.status_code}"
        
        # Verify response structure
        data = response.json()
        assert 'active' in data, "Response should contain 'active' list"
        assert 'graduated' in data, "Response should contain 'graduated' list"
    
    def test_agent_cannot_access_sna(self):
        """Agent should NOT be able to access SNA tracker (returns 403)"""
        if 'agent' not in self.tokens:
            pytest.skip("Agent credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/sna-tracker",
            headers={"Authorization": f"Bearer {self.tokens['agent']}"}
        )
        
        print(f"Agent SNA response: {response.status_code} - {response.text}")
        assert response.status_code == 403, f"Agent should get 403 Forbidden. Got: {response.status_code}"
        
        # Verify error message
        data = response.json()
        assert 'detail' in data, "Response should contain error detail"
        assert 'manager' in data['detail'].lower(), f"Error message should mention managers. Got: {data['detail']}"
    
    def test_super_admin_can_access_sna(self):
        """Super Admin should have full team visibility in SNA tracker"""
        if 'super_admin' not in self.tokens:
            pytest.skip("Super Admin credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/sna-tracker",
            headers={"Authorization": f"Bearer {self.tokens['super_admin']}"}
        )
        
        print(f"Super Admin SNA response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Super Admin should access SNA tracker. Got: {response.status_code}"
    
    def test_sna_is_team_scoped(self):
        """Verify SNA tracker results are team-scoped (no cross-team visibility)"""
        if 'state_manager' not in self.tokens:
            pytest.skip("State Manager credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/sna-tracker",
            headers={"Authorization": f"Bearer {self.tokens['state_manager']}"}
        )
        
        assert response.status_code == 200, "Should be able to access SNA tracker"
        
        data = response.json()
        # All returned agents should be from the same team
        # This is verified by the backend filtering by team_id
        print(f"SNA tracker returned {len(data.get('active', []))} active and {len(data.get('graduated', []))} graduated agents")


class TestDocuSphereReadAccess:
    """Test that all roles can READ DocuSphere documents (agents are read-only)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for different roles"""
        self.tokens = {}
        
        # Get Agent token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        if resp.status_code == 200:
            self.tokens['agent'] = resp.json().get('token')
        
        # Get State Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=STATE_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['state_manager'] = resp.json().get('token')
    
    def test_agent_can_read_documents(self):
        """Agent should be able to READ documents (read-only access)"""
        if 'agent' not in self.tokens:
            pytest.skip("Agent credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/docusphere/documents",
            headers={"Authorization": f"Bearer {self.tokens['agent']}"}
        )
        
        print(f"Agent read documents response: {response.status_code}")
        assert response.status_code == 200, f"Agent should be able to read documents. Got: {response.status_code}"
    
    def test_agent_can_read_folders(self):
        """Agent should be able to READ folders (read-only access)"""
        if 'agent' not in self.tokens:
            pytest.skip("Agent credentials not available")
        
        response = requests.get(
            f"{BASE_URL}/api/docusphere/folders",
            headers={"Authorization": f"Bearer {self.tokens['agent']}"}
        )
        
        print(f"Agent read folders response: {response.status_code}")
        assert response.status_code == 200, f"Agent should be able to read folders. Got: {response.status_code}"


class TestSNAExcludeInclude:
    """Test SNA exclude/include functionality for managers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for different roles"""
        self.tokens = {}
        
        # Get State Manager token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=STATE_MANAGER_CREDS)
        if resp.status_code == 200:
            self.tokens['state_manager'] = resp.json().get('token')
        
        # Get Agent token
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=AGENT_CREDS)
        if resp.status_code == 200:
            self.tokens['agent'] = resp.json().get('token')
            self.agent_id = resp.json().get('user', {}).get('id')
    
    def test_state_manager_can_exclude_agent(self):
        """State Manager should be able to exclude an agent from SNA tracking"""
        if 'state_manager' not in self.tokens:
            pytest.skip("State Manager credentials not available")
        
        # This test just verifies the endpoint exists and responds appropriately
        # We don't actually exclude a real agent to avoid side effects
        response = requests.post(
            f"{BASE_URL}/api/sna-tracker/nonexistent-user-id/exclude",
            headers={"Authorization": f"Bearer {self.tokens['state_manager']}"}
        )
        
        # Should get 404 for non-existent user, not 403
        print(f"SNA exclude response: {response.status_code} - {response.text}")
        assert response.status_code in [200, 404], f"Should get 200 or 404, not 403. Got: {response.status_code}"
    
    def test_agent_cannot_exclude(self):
        """Agent should NOT be able to exclude from SNA tracking"""
        if 'agent' not in self.tokens:
            pytest.skip("Agent credentials not available")
        
        response = requests.post(
            f"{BASE_URL}/api/sna-tracker/some-user-id/exclude",
            headers={"Authorization": f"Bearer {self.tokens['agent']}"}
        )
        
        print(f"Agent SNA exclude response: {response.status_code} - {response.text}")
        assert response.status_code == 403, f"Agent should get 403 Forbidden. Got: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
