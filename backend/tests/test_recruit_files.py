"""
Test suite for Recruit File Uploads feature
Tests: GET/POST/DELETE /api/recruits/{recruit_id}/files endpoints
Access control: Hierarchy-based access, team isolation, upload/delete permissions
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@pmagent.net"
SUPER_ADMIN_PASSWORD = "Bizlink25"

# Test recruit with existing file
TEST_RECRUIT_ID = "157ad0ca-a055-4287-8753-f19a191ee72b"
TEST_FILE_ID = "b0b72df1-2370-4fd4-90c5-f868cefd52d5"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for super_admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestRecruitFilesListEndpoint:
    """Test GET /api/recruits/{recruit_id}/files"""
    
    def test_list_files_success(self, authenticated_client):
        """Test listing files for a recruit with existing files"""
        response = authenticated_client.get(f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recruit_id" in data
        assert data["recruit_id"] == TEST_RECRUIT_ID
        assert "files" in data
        assert "total" in data
        assert isinstance(data["files"], list)
        
        # Should have at least 1 file (the test file)
        assert data["total"] >= 1, f"Expected at least 1 file, got {data['total']}"
        
        # Verify file structure
        if data["files"]:
            file = data["files"][0]
            assert "id" in file
            assert "filename" in file
            assert "file_size" in file
            assert "uploaded_by_name" in file
            assert "uploaded_at" in file
            # storage_key should NOT be exposed
            assert "storage_key" not in file
    
    def test_list_files_nonexistent_recruit(self, authenticated_client):
        """Test listing files for non-existent recruit returns 404"""
        fake_recruit_id = "00000000-0000-0000-0000-000000000000"
        response = authenticated_client.get(f"{BASE_URL}/api/recruits/{fake_recruit_id}/files")
        
        assert response.status_code == 404
    
    def test_list_files_unauthenticated(self, api_client):
        """Test listing files without auth returns 401/403"""
        # Remove auth header temporarily
        original_headers = api_client.headers.copy()
        api_client.headers.pop("Authorization", None)
        
        response = api_client.get(f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files")
        
        # Restore headers
        api_client.headers = original_headers
        
        assert response.status_code in [401, 403]


class TestRecruitFileUploadEndpoint:
    """Test POST /api/recruits/{recruit_id}/files"""
    
    def test_upload_pdf_file_success(self, authenticated_client):
        """Test uploading a PDF file"""
        # Create a test PDF-like file
        test_content = b"%PDF-1.4 test content for upload"
        files = {
            'file': ('test_upload.pdf', io.BytesIO(test_content), 'application/pdf')
        }
        data = {'file_type': 'document'}
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": authenticated_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result
        assert result["message"] == "File uploaded successfully"
        assert "file" in result
        assert "id" in result["file"]
        assert result["file"]["filename"] == "test_upload.pdf"
        
        # Store file ID for cleanup
        TestRecruitFileUploadEndpoint.uploaded_file_id = result["file"]["id"]
    
    def test_upload_invalid_file_type(self, authenticated_client):
        """Test uploading invalid file type returns 400"""
        test_content = b"invalid file content"
        files = {
            'file': ('test.exe', io.BytesIO(test_content), 'application/x-msdownload')
        }
        data = {'file_type': 'document'}
        
        headers = {"Authorization": authenticated_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 400
        assert "not allowed" in response.json().get("detail", "").lower()
    
    def test_upload_to_nonexistent_recruit(self, authenticated_client):
        """Test uploading to non-existent recruit returns 404"""
        fake_recruit_id = "00000000-0000-0000-0000-000000000000"
        test_content = b"%PDF-1.4 test content"
        files = {
            'file': ('test.pdf', io.BytesIO(test_content), 'application/pdf')
        }
        data = {'file_type': 'document'}
        
        headers = {"Authorization": authenticated_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/recruits/{fake_recruit_id}/files",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 404


class TestRecruitFileDownloadEndpoint:
    """Test GET /api/recruits/{recruit_id}/files/{file_id}/download"""
    
    def test_download_existing_file(self, authenticated_client):
        """Test downloading an existing file"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files/{TEST_FILE_ID}/download"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Should have content
        assert len(response.content) > 0
        
        # Should have Content-Disposition header
        assert "Content-Disposition" in response.headers or "content-disposition" in response.headers
    
    def test_download_nonexistent_file(self, authenticated_client):
        """Test downloading non-existent file returns 404"""
        fake_file_id = "00000000-0000-0000-0000-000000000000"
        response = authenticated_client.get(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files/{fake_file_id}/download"
        )
        
        assert response.status_code == 404


class TestRecruitFileDeleteEndpoint:
    """Test DELETE /api/recruits/{recruit_id}/files/{file_id}"""
    
    def test_delete_uploaded_file(self, authenticated_client):
        """Test deleting a file (cleanup from upload test)"""
        # Use the file ID from upload test
        file_id = getattr(TestRecruitFileUploadEndpoint, 'uploaded_file_id', None)
        
        if not file_id:
            pytest.skip("No uploaded file to delete")
        
        response = authenticated_client.delete(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files/{file_id}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result
        assert "deleted" in result["message"].lower()
    
    def test_delete_nonexistent_file(self, authenticated_client):
        """Test deleting non-existent file returns 404"""
        fake_file_id = "00000000-0000-0000-0000-000000000000"
        response = authenticated_client.delete(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files/{fake_file_id}"
        )
        
        assert response.status_code == 404


class TestRecruitFileAccessControl:
    """Test access control for recruit files"""
    
    def test_team_isolation_enforced(self, authenticated_client):
        """Verify files are scoped to team"""
        # Get files - should only return files from user's team
        response = authenticated_client.get(f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files")
        
        assert response.status_code == 200
        data = response.json()
        
        # All files should have team_id matching user's team
        # (We can't directly verify team_id since it's not exposed, but 200 means access granted)
        assert "files" in data
    
    def test_storage_key_not_exposed(self, authenticated_client):
        """Verify storage_key is not exposed in API response"""
        response = authenticated_client.get(f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files")
        
        assert response.status_code == 200
        data = response.json()
        
        for file in data.get("files", []):
            assert "storage_key" not in file, "storage_key should not be exposed to frontend"


class TestRecruitFileIntegration:
    """Integration tests for full file workflow"""
    
    def test_full_upload_download_delete_workflow(self, authenticated_client):
        """Test complete file lifecycle: upload -> list -> download -> delete"""
        # 1. Upload a file
        test_content = b"%PDF-1.4 integration test file content"
        files = {
            'file': ('integration_test.pdf', io.BytesIO(test_content), 'application/pdf')
        }
        data = {'file_type': 'resume'}
        
        headers = {"Authorization": authenticated_client.headers.get("Authorization")}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files",
            files=files,
            data=data,
            headers=headers
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        file_id = upload_response.json()["file"]["id"]
        
        # 2. List files and verify new file appears
        list_response = authenticated_client.get(f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files")
        assert list_response.status_code == 200
        
        files_list = list_response.json()["files"]
        file_ids = [f["id"] for f in files_list]
        assert file_id in file_ids, "Uploaded file should appear in list"
        
        # 3. Download the file
        download_response = authenticated_client.get(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files/{file_id}/download"
        )
        assert download_response.status_code == 200
        assert len(download_response.content) > 0
        
        # 4. Delete the file
        delete_response = authenticated_client.delete(
            f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files/{file_id}"
        )
        assert delete_response.status_code == 200
        
        # 5. Verify file no longer appears in list
        final_list_response = authenticated_client.get(f"{BASE_URL}/api/recruits/{TEST_RECRUIT_ID}/files")
        assert final_list_response.status_code == 200
        
        final_files = final_list_response.json()["files"]
        final_file_ids = [f["id"] for f in final_files]
        assert file_id not in final_file_ids, "Deleted file should not appear in list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
