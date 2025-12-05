#!/usr/bin/env python3
"""
Historical Period Selection Feature Testing
Focus: Test the new historical period selection functionality
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BACKEND_URL = "https://team-view-pro.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

def get_auth_token():
    """Get authentication token"""
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": "spencer.sudbeck@pmagent.net",
            "password": "Bizlink25"
        })
        if response.status_code == 200:
            return response.json()['token']
        else:
            print_error(f"Failed to login: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Exception during login: {str(e)}")
        return None

def test_historical_monthly_periods():
    """Test historical monthly period selection"""
    print_header("🗓️ TESTING HISTORICAL MONTHLY PERIODS")
    
    token = get_auth_token()
    if not token:
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test historical months
    historical_months = ["2025-10", "2025-09", "2024-12", "2024-11"]
    report_types = ['individual', 'team', 'organization']
    
    passed = 0
    failed = 0
    
    for month in historical_months:
        for report_type in report_types:
            print_info(f"Testing {report_type} report for {month}...")
            
            try:
                response = requests.get(
                    f"{BACKEND_URL}/reports/period/{report_type}",
                    params={"period": "monthly", "month": month},
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate date calculation
                    start_date_str = data.get('start_date', '')
                    period_name = data.get('period_name', '')
                    
                    year_str, month_num = month.split('-')
                    expected_start = f"{year_str}-{month_num.zfill(2)}-01"
                    
                    if start_date_str == expected_start:
                        print_success(f"✅ {report_type} {month}: Date calculation correct ({start_date_str})")
                        passed += 1
                    else:
                        print_error(f"❌ {report_type} {month}: Date calculation incorrect. Expected {expected_start}, got {start_date_str}")
                        failed += 1
                        
                    # Check period name
                    expected_date = datetime(int(year_str), int(month_num), 1)
                    expected_month_name = expected_date.strftime('%B %Y')
                    if expected_month_name in period_name:
                        print_success(f"✅ {report_type} {month}: Period name correct ({period_name})")
                    else:
                        print_warning(f"⚠️ {report_type} {month}: Period name may be incorrect ({period_name})")
                        
                else:
                    print_error(f"❌ {report_type} {month}: Request failed with {response.status_code}")
                    failed += 1
                    
            except Exception as e:
                print_error(f"❌ {report_type} {month}: Exception - {str(e)}")
                failed += 1
    
    print_info(f"Monthly periods test: {passed} passed, {failed} failed")
    return failed == 0

def test_historical_quarterly_periods():
    """Test historical quarterly period selection"""
    print_header("📊 TESTING HISTORICAL QUARTERLY PERIODS")
    
    token = get_auth_token()
    if not token:
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test historical quarters
    historical_quarters = ["2025-Q3", "2025-Q2", "2024-Q4", "2024-Q3"]
    report_types = ['individual', 'team', 'organization']
    
    passed = 0
    failed = 0
    
    for quarter in historical_quarters:
        for report_type in report_types:
            print_info(f"Testing {report_type} report for {quarter}...")
            
            try:
                response = requests.get(
                    f"{BACKEND_URL}/reports/period/{report_type}",
                    params={"period": "quarterly", "quarter": quarter},
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate date calculation
                    start_date_str = data.get('start_date', '')
                    period_name = data.get('period_name', '')
                    
                    year_str, quarter_str = quarter.split('-Q')
                    quarter_num = int(quarter_str)
                    expected_month = (quarter_num - 1) * 3 + 1
                    expected_start = f"{year_str}-{expected_month:02d}-01"
                    
                    if start_date_str == expected_start:
                        print_success(f"✅ {report_type} {quarter}: Date calculation correct ({start_date_str})")
                        passed += 1
                    else:
                        print_error(f"❌ {report_type} {quarter}: Date calculation incorrect. Expected {expected_start}, got {start_date_str}")
                        failed += 1
                        
                    # Check period name
                    expected_period_name = f"Q{quarter_num} {year_str}"
                    if expected_period_name in period_name:
                        print_success(f"✅ {report_type} {quarter}: Period name correct ({period_name})")
                    else:
                        print_warning(f"⚠️ {report_type} {quarter}: Period name may be incorrect ({period_name})")
                        
                else:
                    print_error(f"❌ {report_type} {quarter}: Request failed with {response.status_code}")
                    failed += 1
                    
            except Exception as e:
                print_error(f"❌ {report_type} {quarter}: Exception - {str(e)}")
                failed += 1
    
    print_info(f"Quarterly periods test: {passed} passed, {failed} failed")
    return failed == 0

def test_historical_yearly_periods():
    """Test historical yearly period selection"""
    print_header("📅 TESTING HISTORICAL YEARLY PERIODS")
    
    token = get_auth_token()
    if not token:
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test historical years
    historical_years = ["2024", "2023", "2022"]
    report_types = ['individual', 'team', 'organization']
    
    passed = 0
    failed = 0
    
    for year in historical_years:
        for report_type in report_types:
            print_info(f"Testing {report_type} report for {year}...")
            
            try:
                response = requests.get(
                    f"{BACKEND_URL}/reports/period/{report_type}",
                    params={"period": "yearly", "year": year},
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate date calculation
                    start_date_str = data.get('start_date', '')
                    period_name = data.get('period_name', '')
                    
                    expected_start = f"{year}-01-01"
                    
                    if start_date_str == expected_start:
                        print_success(f"✅ {report_type} {year}: Date calculation correct ({start_date_str})")
                        passed += 1
                    else:
                        print_error(f"❌ {report_type} {year}: Date calculation incorrect. Expected {expected_start}, got {start_date_str}")
                        failed += 1
                        
                    # Check period name
                    if year in period_name:
                        print_success(f"✅ {report_type} {year}: Period name correct ({period_name})")
                    else:
                        print_warning(f"⚠️ {report_type} {year}: Period name may be incorrect ({period_name})")
                        
                else:
                    print_error(f"❌ {report_type} {year}: Request failed with {response.status_code}")
                    failed += 1
                    
            except Exception as e:
                print_error(f"❌ {report_type} {year}: Exception - {str(e)}")
                failed += 1
    
    print_info(f"Yearly periods test: {passed} passed, {failed} failed")
    return failed == 0

def test_manager_hierarchy_historical():
    """Test manager hierarchy with historical periods"""
    print_header("👥 TESTING MANAGER HIERARCHY WITH HISTORICAL PERIODS")
    
    token = get_auth_token()
    if not token:
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get available managers
    try:
        managers_response = requests.get(f"{BACKEND_URL}/reports/managers", headers=headers)
        if managers_response.status_code != 200:
            print_error("Could not get available managers")
            return False
            
        managers = managers_response.json().get('managers', [])
        if not managers:
            print_warning("No managers available for testing")
            return True
            
        manager_id = managers[0]['id']
        manager_name = managers[0]['name']
        
        print_info(f"Testing with manager: {manager_name}")
        
        # Test historical periods
        test_cases = [
            ("monthly", "2025-10"),
            ("monthly", "2024-12"),
            ("quarterly", "2025-Q3"),
            ("yearly", "2024")
        ]
        
        passed = 0
        failed = 0
        
        for period, period_value in test_cases:
            print_info(f"Testing manager hierarchy for {period} {period_value}...")
            
            params = {"period": period}
            if period == "monthly":
                params["month"] = period_value
            elif period == "quarterly":
                params["quarter"] = period_value
            elif period == "yearly":
                params["year"] = period_value
            
            try:
                response = requests.get(
                    f"{BACKEND_URL}/reports/manager-hierarchy/{manager_id}",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    required_fields = ['manager_name', 'manager_role', 'period', 'period_name', 'hierarchy_data', 'total_members']
                    
                    if all(field in data for field in required_fields):
                        print_success(f"✅ Manager hierarchy {period} {period_value}: Structure valid")
                        passed += 1
                    else:
                        print_error(f"❌ Manager hierarchy {period} {period_value}: Missing required fields")
                        failed += 1
                        
                else:
                    print_error(f"❌ Manager hierarchy {period} {period_value}: Request failed with {response.status_code}")
                    failed += 1
                    
            except Exception as e:
                print_error(f"❌ Manager hierarchy {period} {period_value}: Exception - {str(e)}")
                failed += 1
        
        print_info(f"Manager hierarchy historical test: {passed} passed, {failed} failed")
        return failed == 0
        
    except Exception as e:
        print_error(f"Exception in manager hierarchy test: {str(e)}")
        return False

def test_parameter_validation():
    """Test parameter validation for historical periods"""
    print_header("🔍 TESTING PARAMETER VALIDATION")
    
    token = get_auth_token()
    if not token:
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    
    passed = 0
    failed = 0
    
    # Test invalid month formats
    print_info("Testing invalid month formats...")
    invalid_months = ["2025-13", "2025-00", "invalid-month", "2025/10"]
    
    for invalid_month in invalid_months:
        try:
            response = requests.get(
                f"{BACKEND_URL}/reports/period/individual",
                params={"period": "monthly", "month": invalid_month},
                headers=headers
            )
            
            if response.status_code == 400:
                print_success(f"✅ Invalid month '{invalid_month}' correctly returned 400")
                passed += 1
            else:
                print_error(f"❌ Invalid month '{invalid_month}' should return 400, got {response.status_code}")
                failed += 1
                
        except Exception as e:
            print_error(f"❌ Exception testing invalid month '{invalid_month}': {str(e)}")
            failed += 1
    
    # Test invalid quarter formats
    print_info("Testing invalid quarter formats...")
    invalid_quarters = ["2025-Q5", "2025-Q0", "invalid-quarter", "2025/Q1"]
    
    for invalid_quarter in invalid_quarters:
        try:
            response = requests.get(
                f"{BACKEND_URL}/reports/period/individual",
                params={"period": "quarterly", "quarter": invalid_quarter},
                headers=headers
            )
            
            if response.status_code == 400:
                print_success(f"✅ Invalid quarter '{invalid_quarter}' correctly returned 400")
                passed += 1
            else:
                print_error(f"❌ Invalid quarter '{invalid_quarter}' should return 400, got {response.status_code}")
                failed += 1
                
        except Exception as e:
            print_error(f"❌ Exception testing invalid quarter '{invalid_quarter}': {str(e)}")
            failed += 1
    
    # Test invalid year formats
    print_info("Testing invalid year formats...")
    invalid_years = ["invalid-year", "202a"]
    
    for invalid_year in invalid_years:
        try:
            response = requests.get(
                f"{BACKEND_URL}/reports/period/individual",
                params={"period": "yearly", "year": invalid_year},
                headers=headers
            )
            
            if response.status_code == 400:
                print_success(f"✅ Invalid year '{invalid_year}' correctly returned 400")
                passed += 1
            else:
                print_error(f"❌ Invalid year '{invalid_year}' should return 400, got {response.status_code}")
                failed += 1
                
        except Exception as e:
            print_error(f"❌ Exception testing invalid year '{invalid_year}': {str(e)}")
            failed += 1
    
    print_info(f"Parameter validation test: {passed} passed, {failed} failed")
    return failed == 0

def main():
    """Run all historical period selection tests"""
    print_header("🕰️ COMPREHENSIVE HISTORICAL PERIOD SELECTION TESTING")
    print_info("Testing extended Manager Reports with historical period selection")
    print_info("Focus: Historical months, quarters, years with custom selectors")
    
    all_passed = True
    
    # Run all test suites
    all_passed &= test_historical_monthly_periods()
    all_passed &= test_historical_quarterly_periods()
    all_passed &= test_historical_yearly_periods()
    all_passed &= test_manager_hierarchy_historical()
    all_passed &= test_parameter_validation()
    
    # Print final results
    print_header("🎯 FINAL RESULTS")
    
    if all_passed:
        print_success("🎉 ALL HISTORICAL PERIOD SELECTION TESTS PASSED!")
        print_success("✅ Historical Period Selection Feature is working correctly")
        return 0
    else:
        print_error("❌ Some Historical Period Selection tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())