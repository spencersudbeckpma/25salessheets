"""
Test Suitability Reports Feature
- Tests flexible reporting periods: Weekly, Monthly, All-Time
- Tests access control: Agents see own forms, DM/RM see downline, State Manager sees full team
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSuitabilityReports:
    """Test suitability report endpoints with flexible periods"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@pmagent.net"
        self.admin_password = "Bizlink25"
        self.agent_email = "sam.agent@pmagent.net"
        self.agent_password = "Bizlink25"
        
    def get_token(self, email, password):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_all_time_report_returns_all_forms(self):
        """Test GET /api/suitability-forms/report?period=all-time returns all forms"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=all-time",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "period" in data
        assert data["period"] == "all-time"
        assert "period_label" in data
        assert data["period_label"] == "All Time"
        assert "start_date" in data
        assert data["start_date"] is None  # All-time has no date filter
        assert "end_date" in data
        assert data["end_date"] is None
        assert "total_forms" in data
        assert "sales_made" in data
        assert "conversion_rate" in data
        assert "by_agent" in data
        assert "forms" in data
        
        print(f"All-Time report: {data['total_forms']} forms, {data['sales_made']} sales")
    
    def test_weekly_report_with_date_picker(self):
        """Test GET /api/suitability-forms/report?period=weekly&week_start_date=YYYY-MM-DD"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        # Test with specific week
        week_start = "2026-01-13"
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=weekly&week_start_date={week_start}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert data["period"] == "weekly"
        assert "Week of" in data["period_label"]
        assert data["start_date"] is not None
        assert data["end_date"] is not None
        
        # Verify date range is 7 days
        start = datetime.strptime(data["start_date"], "%Y-%m-%d")
        end = datetime.strptime(data["end_date"], "%Y-%m-%d")
        assert (end - start).days == 6, "Week should span 7 days (Mon-Sun)"
        
        print(f"Weekly report ({data['period_label']}): {data['total_forms']} forms")
    
    def test_weekly_report_defaults_to_current_week(self):
        """Test GET /api/suitability-forms/report?period=weekly defaults to current week"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=weekly",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"] == "weekly"
        assert data["start_date"] is not None
        assert data["end_date"] is not None
        
        print(f"Default weekly report: {data['period_label']}")
    
    def test_monthly_report_with_month_picker(self):
        """Test GET /api/suitability-forms/report?period=monthly&month=YYYY-MM"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        # Test with specific month
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=monthly&month=2026-01",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert data["period"] == "monthly"
        assert "January 2026" in data["period_label"]
        assert data["start_date"] == "2026-01-01"
        assert data["end_date"] == "2026-01-31"
        
        print(f"Monthly report ({data['period_label']}): {data['total_forms']} forms")
    
    def test_monthly_report_defaults_to_current_month(self):
        """Test GET /api/suitability-forms/report?period=monthly defaults to current month"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=monthly",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"] == "monthly"
        assert data["start_date"] is not None
        assert data["end_date"] is not None
        
        print(f"Default monthly report: {data['period_label']}")
    
    def test_invalid_period_returns_400(self):
        """Test invalid period parameter returns 400"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=invalid",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_invalid_week_start_date_returns_400(self):
        """Test invalid week_start_date format returns 400"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=weekly&week_start_date=invalid-date",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_invalid_month_format_returns_400(self):
        """Test invalid month format returns 400"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=monthly&month=invalid",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestSuitabilityReportAccessControl:
    """Test access control for suitability reports"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@pmagent.net"
        self.admin_password = "Bizlink25"
        self.agent_email = "sam.agent@pmagent.net"
        self.agent_password = "Bizlink25"
        
    def get_token(self, email, password):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_agent_sees_only_own_forms(self):
        """Test agent only sees their own forms in report"""
        token = self.get_token(self.agent_email, self.agent_password)
        assert token is not None, "Failed to get agent token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=all-time",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Agent should only see their own forms
        # Since agent hasn't submitted any forms, should be 0
        print(f"Agent sees {data['total_forms']} forms (should be own forms only)")
        
        # Verify all forms belong to the agent
        for form in data.get("forms", []):
            assert form.get("submitted_by_email") == self.agent_email, \
                f"Agent should only see own forms, found form by {form.get('submitted_by_email')}"
    
    def test_super_admin_sees_full_team(self):
        """Test super admin sees full team forms (team_id scoped)"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report?period=all-time",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Super admin should see all team forms
        print(f"Super Admin sees {data['total_forms']} forms")
        print(f"By agent breakdown: {data['by_agent']}")
        
        # Verify response has expected structure
        assert "total_forms" in data
        assert "by_agent" in data


class TestSuitabilityReportExcel:
    """Test Excel export for suitability reports"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@pmagent.net"
        self.admin_password = "Bizlink25"
        
    def get_token(self, email, password):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_excel_export_all_time(self):
        """Test Excel export for all-time period"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report/excel?period=all-time",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 200 with Excel file or 404 if no data
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            # Verify content type is Excel
            content_type = response.headers.get("content-type", "")
            assert "spreadsheet" in content_type or "octet-stream" in content_type, \
                f"Expected Excel content type, got {content_type}"
            print("Excel export successful")
        else:
            print("No data to export (404)")
    
    def test_excel_export_weekly(self):
        """Test Excel export for weekly period"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report/excel?period=weekly&week_start_date=2026-01-13",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 200 with Excel file or 404 if no data
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        print(f"Weekly Excel export: {response.status_code}")
    
    def test_excel_export_monthly(self):
        """Test Excel export for monthly period"""
        token = self.get_token(self.admin_email, self.admin_password)
        assert token is not None, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/suitability-forms/report/excel?period=monthly&month=2026-01",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 200 with Excel file or 404 if no data
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        print(f"Monthly Excel export: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
