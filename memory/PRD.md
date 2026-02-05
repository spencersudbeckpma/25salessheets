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
- `/api/admin/teams/{id}/full-config` - Complete team configuration (Phase 1+2)
- `/api/teams/my-features` - User's effective features + view settings

## Data Models
- **users**: id, name, email, role, team_id, manager_id, status
- **activities**: id, user_id, team_id, date, contacts, appointments, presentations, referrals, testimonials, sales, new_face_sold, premium
- **teams**: id, name, branding, features, role_tab_overrides, ui_settings, team_settings.views
- **docusphere_folders**: id, name, parent_id, team_id, created_by
- **docusphere_documents**: id, filename, folder_id, team_id, uploaded_by
- **fact_finders**: id, team_id, created_by, month_key, client_info, health_expenses, retirement_income, final_expenses, extended_care, producer info, notes, status

## Team Configuration Schema (Phase 1 + 2)
```json
{
  "features": { ... },              // Tab visibility flags
  "role_tab_overrides": {           // Role-based tab restrictions
    "agent": { "hidden_tabs": [] },
    "district_manager": { "hidden_tabs": [] },
    "regional_manager": { "hidden_tabs": [] }
  },
  "ui_settings": {
    "default_landing_tab": "activity",
    "default_leaderboard_period": "weekly"
  },
  "team_settings": {
    "views": {
      "kpi_cards": [                // Order + visibility
        { "id": "dials", "label": "Dials", "enabled": true },
        ...
      ],
      "subtabs": {                  // Server-enforced (403 if disabled)
        "new_faces": true,
        "sna": true,
        "npa": true
      }
    }
  },
  "branding": { ... }
}
```

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

### 2025-02-05 - Access Control Changes: DocuSphere & SNA Report
**1) DocuSphere Upload Permissions (Expanded)**
- **Before**: Only State Manager could upload
- **After**: State Manager, Regional Manager, District Manager can upload
- **Guardrails**:
  - Agents remain read-only (403 on upload attempt)
  - All uploads MUST be team-scoped by `team_id`
  - No cross-team uploads or visibility
  - Super admin uploads only when assigned to a team

**2) SNA Report Manager Downline Access (Expanded)**
- **Before**: State Manager only
- **After**: State Manager, Regional Manager, District Manager
- **Hierarchy Rules**:
  - State Manager: Full team visibility
  - Regional Manager: See their full downline (DMs + Agents under those DMs)
  - District Manager: See their direct agent downline only (uses `manager_id`)
  - Agent: No access (403)
- **Guardrails**:
  - STRICT `team_id` enforcement (no cross-team visibility)
  - Managers cannot see peers or managers above them

**Testing**: 16 backend tests - 100% pass rate

### 2025-02-05 - NEW: Deletion + Undo Guardrails (Soft Delete)
- **NEW FEATURE**: Safe deletion system for Recruits and Interviews
- **Soft Delete (Archive)**: Items are marked as archived, not permanently deleted
  - Recruits: `is_archived`, `archived_at`, `archived_by`, `archived_by_name`
  - Interviews: `archived`, `archived_at`, `archived_by`, `archived_by_name`
- **Permissions**:
  - Recruits: SM/RM/DM can archive within their team (RM/DM limited to own recruits)
  - Interviews: Creator OR State Manager OR super_admin can archive
  - Restore: State Manager and super_admin only
- **UI Guardrails**:
  - Type-to-confirm modal: User must type "DELETE" to confirm
  - Archive filter dropdown (Active/Archived) visible to SM/super_admin only
  - Archived view shows: name, archived by, archived date, Restore button
- **Data Safety**:
  - Archived items excluded from all normal lists, stats, reports, leaderboards
  - Server-side `team_id` enforcement on all delete/restore endpoints (403 on cross-team)
  - Indefinite retention (no auto-purge)
- **New API Endpoints**:
  - `DELETE /api/recruiting/{id}` - Soft delete (archive) recruit
  - `POST /api/recruiting/{id}/restore` - Restore archived recruit
  - `GET /api/recruiting/archived` - List archived recruits
  - `DELETE /api/interviews/{id}` - Soft delete (archive) interview
  - `POST /api/interviews/{id}/restore` - Restore archived interview
  - `GET /api/interviews/archived` - List archived interviews
- **Testing**: 100% backend/frontend pass rate (17 pytest tests + UI verification)

### 2025-02-05 - P0 BUG FIX: Interview Form Save Issue
- **FIXED**: Interview form failed to save after UI modification that split "Red Flags/Notes" into separate fields
- **Root Cause**: Frontend was updated to send `red_flags` and `extra_notes` fields, but the backend POST `/api/interviews` endpoint was still expecting the old `red_flags_notes` field
- **Fix Applied**: Updated `backend/server.py` line 7929 to handle new fields:
  - Changed from: `"red_flags_notes": interview_data.get('red_flags_notes', '')`
  - Changed to: `"red_flags": interview_data.get('red_flags', '')` and `"extra_notes": interview_data.get('extra_notes', '')`
- **Testing**: Verified via curl (POST/PUT) and frontend screenshot - form saves correctly
- **DB Schema Change**: `interviews` collection now uses `red_flags` and `extra_notes` instead of `red_flags_notes`
- **Backward Compatibility**: Frontend handles both old and new field names for viewing existing interviews

### 2025-02-04 - NEW: Manager Check-In (Weekly Accountability)
- **NEW FEATURE**: Weekly check-in tab for manager accountability
- **Tab**: "Check-In" - visible only to managers (DM, RM, State Manager, super_admin)
- **Fields per check-in**:
  - `week_start_date` (normalized to Monday)
  - `number_in_field` (days in field)
  - `household_presentation_target`
  - `premium_target`
  - `monday_matters_topic` (free text)
  - `status` (draft/submitted)
- **Views**:
  - "My Check-Ins" - user's own entries grouped by month
  - "Team Check-Ins" - see downline check-ins (role-based hierarchy)
- **Permissions**:
  - Any manager can create/edit their own check-ins
  - State managers see all team check-ins
  - RM/DM see only their downline
  - Only creator or state_manager can delete
- **Export**: CSV export for selected week (team-scoped)
- **Feature Flag**: `manager_checkin` (toggle per team in Admin)
- **API Endpoints**:
  - `POST /api/checkins` - Create check-in
  - `GET /api/checkins` - List with filters (week_start, month, my_only)
  - `GET /api/checkins/{id}` - Get single check-in
  - `PUT /api/checkins/{id}` - Update (creator only)
  - `DELETE /api/checkins/{id}` - Delete
  - `GET /api/checkins/weeks/list` - Available weeks
  - `GET /api/checkins/export/csv?week_start=YYYY-MM-DD` - CSV export
- **Guardrails**: 100% team-scoped, team_id required on all records

### 2025-02-04 - P0 BUG FIX: State Manager Create User Team Assignment
- **FIXED**: Users created by state_manager were missing team_id (data isolation breach)
- **Root Cause**: `/api/auth/create-user` endpoint did not assign team_id at all
- **Fix Applied**:
  - state_manager/regional_manager/district_manager: ALWAYS uses their own team_id (server-side enforced, ignores client input)
  - super_admin: Uses their team_id as default, can optionally specify different team
  - All created users MUST have valid team_id (400 error if missing)
  - Added `created_by` field for audit trail
  - Added `team_name` to user record
  - Added logging for user creation events
- **Guardrails**:
  - state_manager cannot assign users to different team (forced to their own)
  - Manager validation ensures manager_id is in same team
  - If no manager specified, state_manager becomes default manager
- **Acceptance Tests**:
  - ✅ super_admin creates user → team_id assigned correctly
  - ✅ User record contains team_id, team_name, created_by
  - ✅ Response includes team information

### 2025-02-04 - Team View Visibility & Ordering Controls
- **NEW FEATURE**: Per-user visibility and ordering controls for Team View display
- **Hide from Team View**:
  - Per-user `hide_from_team_view` boolean flag
  - Hidden users don't appear in Team View hierarchy
  - BUT their data STILL rolls up to manager totals, team totals, leaderboards, reports
  - Hidden user's children are promoted up (appear under the hidden user's parent)
- **Display Order**:
  - Per-user `team_view_order` number field
  - Lower number = higher display priority
  - Up/down arrow controls in UI
  - Affects ONLY visual display, not data
- **Permissions**:
  - super_admin: Can toggle/reorder any user
  - state_manager: Can toggle/reorder users in their team
  - regional_manager/district_manager: Can toggle/reorder users in their hierarchy only
- **API Endpoints**:
  - `GET /api/users/{user_id}/team-view-settings` - Get user's visibility settings
  - `PUT /api/users/{user_id}/team-view-settings` - Update visibility/order
  - `GET /api/team/team-view-order` - Get all team users with settings
  - `PUT /api/team/team-view-order/batch` - Batch update display order
- **UI Location**: Team Management → Team View tab
- **Guardrails**: Visibility only - no data logic changes, aggregation identical, reports/leaderboards unchanged

### 2025-02-04 - CRITICAL: PMA Bonuses Team Isolation Fix
- **FIXED**: Critical data isolation breach where bonus documents were visible across teams
- **Root Cause**: No `team_id` filtering on any PMA Bonus endpoints
- **Guardrails Implemented**:
  1. **STRICT Team Scoping**: Every bonus document MUST have a valid `team_id`
  2. **GET /api/pma-bonuses**: Returns ONLY documents matching user's `team_id` (NULL excluded)
  3. **POST /api/pma-bonuses**: 
     - state_manager → uploads to their own team (automatic)
     - super_admin → MUST explicitly select team (required parameter)
  4. **Download/Delete**: Enforces `team_id` match, no cross-team access
  5. **Legacy Safety**: Documents with NULL/missing `team_id` are hidden from all users
- **Admin Diagnostics Added**:
  - `GET /api/admin/pma-bonuses/diagnostic` - Shows team distribution, orphaned records
  - `POST /api/admin/pma-bonuses/migrate-team-id` - Backfills `team_id` based on uploader's team
- **Frontend Updates**:
  - super_admin sees team selection dropdown (required before upload)
  - Upload button disabled until team selected
  - "Document visible ONLY to selected team" messaging
- **Acceptance Tests**:
  - ✅ super_admin upload without team_id → 400 error
  - ✅ super_admin upload with team_id → Success, document scoped
  - ✅ GET returns only team's documents
  - ✅ Diagnostic shows healthy isolation status

### 2025-02-04 - RM/DM Team Leaderboards (Updated)
- **Added**: Two new leaderboard views with team rollups
  - **RM Team Leaderboard**: Each row = Regional Manager with summed downline metrics (RM + all DMs + all agents)
  - **DM Team Leaderboard**: Each row = District Manager with summed downline metrics (DM + all agents)
- **Metrics Displayed**:
  - **Total Premium** (ranked by this) - Green color
  - **Total Presentations** - Purple color
- **Endpoints Added**:
  - `GET /api/leaderboard/rm-teams/{period}` - RM team rankings
  - `GET /api/leaderboard/dm-teams/{period}` - DM team rankings
  - Periods: weekly, monthly, quarterly, yearly
- **Response Format**: `{ managers: [{ manager_id, manager_name, role, team_size, total_premium, total_presentations }], period, view_type, start_date, end_date }`
- **Admin Controls** (Admin → Teams → Customize → Views → Leaderboard Views):
  - Enable Individual Leaderboard (existing)
  - Enable RM Team Leaderboard (new)
  - Enable DM Team Leaderboard (new)
- **Toggle Behavior**: OFF = tab hidden in UI AND API returns 403
- **Data Rules**: 100% team-scoped, super_admin treated same as state_manager on product pages
- **Frontend**: Tabs shown/hidden based on admin toggles, period selection preserved

### 2025-02-04 - Interview File Uploads (Updated)
- **Changed**: Files now tied to **interview_id** (not recruit_id)
- **Visibility**: "Candidate Files" section appears when interview status is "Moving Forward" or "Completed"
- **Storage**: MongoDB GridFS (persistent across redeploys)
- **Endpoints Updated**:
  - `GET /api/interviews/{interview_id}/files` - List files
  - `POST /api/interviews/{interview_id}/files` - Upload file
  - `GET /api/interviews/{interview_id}/files/{file_id}/download` - Download
  - `DELETE /api/interviews/{interview_id}/files/{file_id}` - Delete
- **Access Control**: SM/RM/DM can upload, delete by uploader or SM only

### 2025-02-03 - KPI Toggle Fix for Daily Activity Input
- **Fixed**: KPI toggles in Admin Panel now hide fields in Daily Activity Input form
- **Added**: `GET /api/team/view-settings` endpoint for frontend to fetch team's KPI visibility
- **Updated**: ActivityInput.jsx filters input fields based on enabled KPI cards
- **Added**: Missing "Apps" field to default KPI cards list

### 2025-02-03 - Team-Scoped Recruiting States
### 2025-01-29 - Full Data Health Check Admin UI
- **Added**: Complete team-by-team data integrity check accessible from mobile without terminal
- **Added**: Build info banner showing Version, Build timestamp, and Check timestamp
- **Added**: Team-by-team health check table with columns:
  - Team name, Status (PASS/FAIL), Users, Recruits, Interviews, New Faces, SNA, NPA, Activities, Issues
- **Added**: PASS/FAIL status calculated based on:
  - Missing team_id records → FAIL
  - Cross-team owner mismatch → FAIL
- **Added**: One-click backfill buttons for 6 collections (super_admin only):
  - Recruits, Interviews, New Face Customers, Activities, SNA Agents, NPA Agents
- **Added**: Backfill buttons conditionally appear only when records are missing team_id
- **Added**: Auto-rerun health check after successful backfill
- **Location**: Admin → Diagnostics tab → "Full Data Health Check" (top section)
- **Endpoints Added**:
  - `GET /api/admin/full-health-check` - Returns build_info, summary, teams array with counts
  - `POST /api/admin/backfill-sna-agents-team-id` - Backfills SNA agents
  - `POST /api/admin/backfill-npa-agents-team-id` - Backfills NPA agents
- **Mobile-Friendly**: Tested on iPhone viewport (390x844)
- **Testing**: 100% backend (21/21) and frontend tests passed

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

### 2025-12-19 - Phase 1: Team Customization
- **Added**: Team Feature Flags UI (toggle 16 features per team)
- **Added**: Role-Based Tab Overrides (hide tabs per role, server-enforced)
- **Added**: Team Defaults Panel (landing tab, leaderboard period)
- **Added**: Full team branding (logo, colors, display name, tagline)
- **Location**: Admin → Teams → Customize button

### 2025-12-19 - Phase 2: Team View & Layout Customization
- **Added**: KPI Cards configuration (toggle visibility, reorder)
- **Added**: Sub-Tab Visibility (New Faces, SNA, NPA) with server-side 403 enforcement
- **Added**: `team_settings.views` config field on team records
- **Added**: `check_subtab_access()` helper for backend enforcement
- **Added**: Views tab in Customization modal
- **Constraint**: Config-driven, no per-team code branches, no redeploy needed

### Previous Session
- Fixed Leaderboard bugs (migrated 600+ activities)
- Implemented DocuSphere team scoping and role-based permissions
- Fixed DocuSphere data visibility
- Resolved super_admin branding bug
- Completed feature flag enforcement

### 2025-01-30 - New Metrics Implementation
- **Added**: Two new metrics to Daily Activity tracking: `fact_finders` (int) and `bankers_premium` (float)
- **CRITICAL CONSTRAINT**: `bankers_premium` is tracked SEPARATELY from `premium` - never combined
- **Backend Updates**:
  - Activity model updated with new fields (lines 281-314)
  - `/api/stats/my/{period}` returns fact_finders and bankers_premium
  - `/api/team/hierarchy/{period}` includes new metrics in rolled-up stats
  - `/api/leaderboard/{period}` includes new metrics as separate categories
  - Reports endpoints updated to include new metrics
- **Frontend Updates**:
  - ActivityInput.jsx: Added "Fact Finders" input field
  - StatsView.jsx: Added stat cards for Fact Finders and Bankers Premium
  - TeamView.jsx: Added new metrics display in hierarchy view
  - Leaderboard.jsx: Added METRIC_DISPLAY entries for new metrics
- **Configuration**: Team admins can enable/disable new metrics in Leaderboard via Admin panel
- **Testing**: All backend endpoints pass (100% test suite - 19/19), frontend displays verified

### 2025-01-30 - Suitability Flexible Reporting (Lifetime Retention)
- **Problem Solved**: Suitability tab was "weekly only" with no access to historical data
- **New Features**:
  - Report periods: Weekly (any week via date picker), Monthly (calendar month), All-Time (lifetime)
  - Existing records preserved - no deletion, filter-based reporting only
  - State Manager sees full team (team_id scoped, not limited by subordinates)
  - DM/RM see their downline via get_all_subordinates()
  - Agents see only their own forms (My Forms tab only, no Reports tab)
- **Backend Changes**:
  - Added `GET /api/suitability-forms/report` with params: period (weekly|monthly|all-time), week_start_date, month
  - Added `GET /api/suitability-forms/report/excel` for Excel export of any period
  - Access control: agent=own, DM/RM=downline, state_manager/super_admin=full team
- **Frontend Changes**:
  - SuitabilityForm.jsx: Renamed "Weekly Report" to "Reports" tab (managers only)
  - Added period selector (Weekly/Monthly/All-Time)
  - Added week date picker (visible when Weekly selected)
  - Added month picker (visible when Monthly selected)
  - Agents see only 2 tabs: New Form, My Forms
  - Managers see 3 tabs: New Form, My Forms, Reports
- **Data Retention**: All existing Suitability records remain accessible in All-Time view
- **Testing**: 100% backend and frontend tests passing (iteration_8.json)

### 2025-01-30 - Team View Metric Toggles
- **Added**: Admin control over which metrics appear in Team View / Daily Activity section
- **Location**: Admin → Teams → Customize → Views tab → "Team View / Daily Activity Metrics"
- **Behavior**:
  - Admins can enable/disable each metric's visibility in Team View
  - Admins can reorder metrics using up/down arrows
  - Backend always computes all metrics; this controls visibility only
  - `bankers_premium` and `fact_finders` are disabled by default
- **Backend Changes**:
  - Added `CANONICAL_TEAM_ACTIVITY_METRICS` list (10 metrics)
  - Added `DEFAULT_TEAM_ACTIVITY_CONFIG` with default enabled/order states
  - `/api/team/hierarchy/{period}` returns `team_activity_config` and `enabled_activity_metrics`
  - `get_team_view_settings()` merges new canonical metrics with saved config
- **Frontend Changes**:
  - AdminPanel.jsx: Added "Team View / Daily Activity Metrics" section with toggles
  - TeamView.jsx: Uses `isMetricEnabled()` to conditionally render metrics
- **Testing**: 100% backend and frontend tests passing (iteration_7.json)

### 2025-01-30 - KPI-Filtered Reports (Phase 1)
- **Implemented**: JSON report endpoints respect team's KPI configuration by default
- **Behavior**:
  - `filter_by_kpi=true` (default): Reports only show metrics enabled in team's KPI config
  - `filter_by_kpi=false`: Reports show ALL metrics
  - Excel exports: Always show ALL metrics (Phase 2 will add dynamic filtering)
- **Response Indicators**: `applied_kpi_filter: bool`, `enabled_metrics: [...]`
- **Affected Endpoints**:
  - `GET /api/reports/daily/{report_type}` - JSON with KPI filtering
  - `GET /api/reports/period/{report_type}` - JSON with KPI filtering
  - `GET /api/reports/period/excel/{report_type}` - Forces filter_by_kpi=False
- **Helper Functions Added**: `get_enabled_report_metrics()`, `build_report_row()`, `get_metric_label()`
- **Testing**: 19/19 tests passing

---

## Pending Tasks

### P0 - Critical (COMPLETED)
- [x] Fix cross-team data leak - All endpoints now filter by team_id (FIXED 2025-12-19)
- [x] Phase 1: Team Customization (COMPLETED 2025-12-19)
- [x] Phase 2: View & Layout Customization (COMPLETED 2025-12-19)
- [x] Phase 2 Verification (VERIFIED 2025-01-29):
  - KPI card persistence: Order and visibility changes saved correctly
  - Server-side enforcement: 403 returned for disabled sub-tabs (non-super_admin)
  - Default KPI labels match live dashboard
  - Frontend UI fully functional
- [x] Fix super_admin data scoping bypass (FIXED 2025-01-29):
  - ISSUE: super_admin was bypassing team_id filters on ALL product pages (leaderboard, interviews, fact finders, etc.)
  - FIX: Removed super_admin bypass from all product endpoints. Super admin now:
    1. Bypasses feature flags ONLY (can see all tabs/features)
    2. Is team-scoped on ALL product pages (same as state_manager)
    3. Has cross-team visibility ONLY in Admin panel with explicit team selection
  - ENDPOINTS FIXED: leaderboard, interviews, interviews/stats, users/archived/list, users/active/list, fact-finders, fact-finders/months/list, sna-tracker, npa-tracker, reports/manager-list
  - ACCEPTANCE TESTS PASSED:
    - Super Admin sees ONLY Team Sudbeck data on product pages
    - Team Quick state_manager sees ONLY Team Quick data
    - Admin panel cross-team config access works with explicit team_id
- [x] Add fact_finders and bankers_premium metrics (COMPLETED 2025-01-30):
  - New metrics tracked across all Daily Activity flows
  - bankers_premium kept separate from premium (never combined)
  - Available in stats, leaderboard, hierarchy, reports
- [x] Team View Metric Toggles (COMPLETED 2025-01-30):
  - Admins can control which metrics appear in Team View via Admin → Customize → Views
  - 10 configurable metrics with enable/disable and reorder functionality
  - bankers_premium and fact_finders disabled by default
  - Backend returns enabled_activity_metrics in /api/team/hierarchy/{period}
- [x] Suitability Flexible Reporting (COMPLETED 2025-01-30):
  - Report periods: Weekly (any week), Monthly (calendar month), All-Time (lifetime)
  - All existing data preserved - no deletion, filter-based only
  - State Manager sees full team (team_id scoped)
  - Agents see My Forms only; Managers see My Forms + Reports
  - Excel export for all periods
- [x] Team-Scoped Recruiting States (COMPLETED 2025-02-03):
  - State dropdown in Recruiting tab is now team-scoped (no more hardcoded global list)
  - Admin can configure states per team via Admin → Teams → Customize → Views tab → "Recruiting States"
  - States stored in `team_settings.views.recruiting_states` as array of {code, name} objects
  - Both "Add Recruit" form and filter dropdown use team-configured states
  - API: `GET /api/recruiting/states` returns team-specific states

### P1 - High Priority (PAUSED)
- [ ] Refactor monolithic `server.py` into route-based structure (backend/routes/) - **PAUSED: App in active rollout**

### P2 - Medium Priority
- [ ] Remove temporary migration/diagnostic endpoints after stability confirmed
- [ ] Cleanup migration endpoints after production data is fully migrated
- [ ] Add "Copy leaderboard settings from another team" feature to Admin UI
- [ ] KPI-Filtered Excel Reports (Phase 2) - Add dynamic headers and KPI filtering to all Excel exports

### P3 - Future/Backlog
- [ ] Granular feature flags for sub-features
- [ ] "All-Time" leaderboard period option

---

## Test Credentials (Preview)
- **Super Admin**: admin@pmagent.net / Bizlink25

## Files Reference
- `backend/server.py` - All API logic (~8000+ lines, needs refactoring)
- `frontend/src/components/ActivityInput.jsx` - Daily Activity input with new metrics
- `frontend/src/components/FactFinder.jsx` - Fact Finder UI
- `frontend/src/components/Dashboard.jsx` - Main dashboard with tabs
- `frontend/src/components/AdminPanel.jsx` - Admin functionality
- `frontend/src/components/PMADocuSphere.jsx` - Document library
- `frontend/src/components/StatsView.jsx` - Personal statistics with new metrics
- `frontend/src/components/TeamView.jsx` - Team hierarchy with new metrics
- `frontend/src/components/Leaderboard.jsx` - Configurable leaderboard
