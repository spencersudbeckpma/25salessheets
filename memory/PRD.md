# PMA Agent - Product Requirements Document

## Overview
Team-based activity tracking and performance management application for insurance/sales teams with hierarchical structure.

## Core Features
- **Authentication**: JWT-based auth with role-based access control
- **Team Hierarchy**: State Manager → Regional Manager → District Manager → Agent
- **Activity Tracking**: Daily logging of contacts, appointments, presentations, referrals, testimonials, sales, premium
- **Leaderboard**: Team-wide rankings for key metrics
- **DocuSphere**: Team-scoped document library with role-based permissions (state_manager = write, others = read-only)
- **Reports**: Manager hierarchy reports with period filters (daily, monthly, quarterly, yearly)
- **Team Branding**: Custom branding per team (colors, logo, name)
- **Feature Flags**: Team-based feature toggles with server-side enforcement (403)
- **Suitability Forms**: SNA/NPA client assessment forms
- **Fact Finder**: Client assessment worksheets with 1-5 rating scales

## User Roles
1. **Super Admin**: Full system access, cross-team visibility
2. **State Manager**: Team admin, full feature access, can create/edit DocuSphere content
3. **Regional Manager**: Manages district managers, view subordinate data
4. **District Manager**: Manages agents, view subordinate data  
5. **Agent**: Individual contributor, personal activity tracking

## Technical Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT tokens

## Key Endpoints
- `/api/auth/login` - User authentication
- `/api/stats/my/{period}` - Personal activity stats
- `/api/team/hierarchy/{period}` - Team hierarchy with rollup stats
- `/api/leaderboard/{period}` - Team leaderboard rankings
- `/api/reports/manager-hierarchy/{manager_id}` - Detailed manager reports
- `/api/docusphere/*` - Document library CRUD
- `/api/fact-finders/*` - Fact Finder CRUD + PDF export
- `/api/suitability-forms/*` - Suitability forms CRUD

## Data Models
- **users**: id, name, email, role, team_id, manager_id, status
- **activities**: id, user_id, team_id, date, contacts, appointments, presentations, referrals, testimonials, sales, new_face_sold, premium
- **teams**: id, name, branding, features
- **docusphere_folders**: id, name, parent_id, team_id, created_by
- **docusphere_documents**: id, filename, folder_id, team_id, uploaded_by
- **fact_finders**: id, team_id, created_by, month_key, client_info, health_expenses, retirement_income, final_expenses, extended_care, producer info, notes, status

## Feature Flags (DEFAULT_TEAM_FEATURES)
| Feature | Default | Description |
|---------|---------|-------------|
| activity | ON | Daily activity logging |
| stats | ON | Personal statistics |
| team_view | ON | Hierarchy tree |
| suitability | ON | SNA/NPA forms |
| fact_finder | ON | Client worksheets |
| pma_bonuses | ON | Bonus PDFs |
| docusphere | ON | Document library |
| leaderboard | ON | Rankings |
| analytics | ON | Charts/trends |
| reports | ON | Manager reports |
| team_mgmt | ON | Team management |
| interviews | ON | Interview tracking |
| recruiting | OFF | Recruiting pipeline |

---

## Changelog

### 2025-12-19 - CRITICAL: Cross-Team Data Leak Fix
- **Fixed**: Critical security vulnerability - Multiple analytics, reports, and debug endpoints were missing `team_id` filters, allowing cross-team data leakage
- **Root Cause**: Calls to `get_all_subordinates()` helper function were not passing `team_id` parameter
- **Solution**: Added `team_id` filtering to all affected endpoints:
  - `/users/{user_id}/activities/{date}` (PUT) - Manager activity editing
  - `/users/{user_id}/activities` (GET) - Team member activities
  - `/users/{user_id}` (DELETE) - User removal
  - `/debug/user-activities/{user_id}` - Debug endpoint
  - `/debug/cleanup-user-duplicates/{user_id}` - Cleanup endpoint
  - `/debug/cleanup-all-duplicates` - All duplicates cleanup
  - `/debug/delete-all-user-activities/{user_id}` - Delete all activities
  - `/reports/excel/newface/{period}` - New face Excel report
  - `/auth/admin-reset-password` - Admin password reset
  - `/goals/team/progress` - Team goal progress
  - `/suitability-forms/export` - Suitability export
  - `/suitability-forms/friday-report` - Friday report
  - `/suitability-forms/weekly-report` - Weekly report
- **Testing**: All 28 backend tests pass (100% success rate)
- **Impact**: Team data is now strictly isolated; users can only see data from their assigned team

### 2025-01-29 - Fact Finder Feature
- **Added**: New main tab "Fact Finder" with full CRUD
- **Added**: 4 rating sections (Health Expenses, Retirement Income, Final Expenses, Extended Care)
- **Added**: List view with search, month grouping, filters
- **Added**: PDF export with proper filename format
- **Added**: Team scoping and role-based permissions
- **Added**: Feature flag `fact_finder` with server enforcement

### 2025-01-28 - Admin Documents & Feature Enforcement
- **Added**: Admin UI for downloading Playbook, State Manager Guide, Team Rosters
- **Added**: State Manager Pack (roster + guide bundle)
- **Added**: Backend feature flag enforcement on all endpoints (403 if disabled)
- **Added**: Enforcement for pma_bonuses, suitability endpoints

### 2025-01-28 - Team Rollup Bug Fix
- **Fixed**: State manager's personal activities were not included in team hierarchy rollups
- **Root Cause**: Activity query filtered by team_id, excluding some records
- **Solution**: Removed team_id filter from build_hierarchy() activity query

### 2025-01-28 - Orphaned Activities Diagnostic
- **Added**: Admin UI for diagnosing orphaned activities
- **Added**: Fix button for activities with NULL team_id

### Previous Session
- Fixed Leaderboard bugs (migrated 600+ activities)
- Implemented DocuSphere team scoping and role-based permissions
- Fixed DocuSphere data visibility
- Resolved super_admin branding bug
- Completed feature flag enforcement

---

## Pending Tasks

### P1 - High Priority  
- [ ] Address 25 activity records with NULL team_id (users without team assignment)

### P2 - Medium Priority
- [ ] Refactor monolithic `server.py` into route-based structure
- [ ] Remove temporary migration/diagnostic endpoints after stability confirmed

### P3 - Future/Backlog
- [ ] Granular feature flags for sub-features
- [ ] "All-Time" leaderboard period option

---

## Test Credentials (Preview)
- **Super Admin**: admin@pmagent.net / Bizlink25

## Files Reference
- `backend/server.py` - All API logic (~8000+ lines, needs refactoring)
- `frontend/src/components/FactFinder.jsx` - Fact Finder UI
- `frontend/src/components/Dashboard.jsx` - Main dashboard with tabs
- `frontend/src/components/AdminPanel.jsx` - Admin functionality
- `frontend/src/components/PMADocuSphere.jsx` - Document library
