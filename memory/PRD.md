# Team Sudbeck Sales Tracker - Product Requirements Document

## Overview
A comprehensive sales tracking application for insurance agencies, enabling team management, activity tracking, reporting, and agent progress monitoring. **Now with multi-tenancy support and strict data isolation.**

## Core Features

### 1. User Management & Authentication
- JWT-based authentication
- Role-based access: super_admin, State Manager, Regional Manager, District Manager, Agent
- Hierarchical team structure
- **Multi-tenancy: Users must be assigned to a team to access the app**

### 2. Multi-Tenancy (Jan 2026 - COMPLETE)
- **Team-based data isolation**: All data scoped by `team_id`
- **Admin Panel**: Super Admin ONLY can create teams and assign users across teams
- **Migration completed**: All existing data migrated to "Team Sudbeck"
- **Team hierarchy**: Each team has independent hierarchies
- **Data collections with team_id**: users, activities, interviews, suitability_forms, npa_agents, new_face_customers, recruits, team_goals, goals, invites

### 3. Role-Based Access Control (Jan 27, 2026 - COMPLETE)
#### Acceptance Criteria VERIFIED:
- **super_admin**: Can see ALL teams/users ONLY in Admin tab
- **state_manager**: Can see ONLY their own team, ONLY their hierarchy (downline), NO "All Users" view
- **regional_manager / district_manager**: Same team-only + downline-only restrictions

### 4. Daily Activity Tracking
- Track: Contacts, Appointments, Presentations, Referrals, Testimonials, Apps, Sales, Premium
- New Face Sold and Bankers Premium tracking

### 5. Reports & Analytics
- Daily, Weekly, Monthly, Quarterly, Yearly reports
- Team View with hierarchical data rollup
- Leaderboard (organization-wide, team-scoped)
- Analytics dashboard

### 6. SNA Tracker (State/New Agent)
- Automatic tracking from first production entry
- 90-day tracking period, $30,000 premium goal

### 7. NPA Tracker (New Producing Agent)
- Track agents toward $1,000 premium goal
- Select Team Member: Links to existing user, auto-calculates premium

### 8. Interviews Feature
- Regional Breakdown view with stats by region
- Share functionality with team members

### 9. Suitability Form
- Complete form for client suitability assessments
- Weekly Report view with export to Excel (.xlsx)

### 10. PMA Bonuses & DocuSphere
- Bonus tracking and document management

## Technical Architecture

### Backend
- FastAPI (Python)
- MongoDB database
- JWT authentication
- RESTful API with /api prefix

### Frontend
- React
- Tailwind CSS
- Shadcn/UI components
- Axios for API calls

### Key Files
- `backend/server.py` - Main backend file (~5700 lines)
- `frontend/src/components/Dashboard.jsx` - Main dashboard with tabs
- `frontend/src/components/AdminPanel.jsx` - Team/User management (super_admin only)
- `frontend/src/components/TeamManagement.jsx` - Team-scoped management (managers)

## Database Collections

### teams
```json
{
  "id": "string (UUID)",
  "name": "string",
  "created_at": "datetime",
  "settings": {"is_default": true/false}
}
```

### users
```json
{
  "id": "string (UUID)",
  "email": "string",
  "name": "string",
  "role": "super_admin|state_manager|regional_manager|district_manager|agent",
  "team_id": "string (UUID) - required for non-super_admin access",
  "manager_id": "string (UUID)",
  "status": "active|archived"
}
```

## What's Been Implemented

### January 27, 2026 - Hierarchy & Scoping Fix (COMPLETE)
- [x] **Backend enforcement** for team_id and role-based hierarchy filtering
  - [x] `/users/active/list` - Now filters by team_id + hierarchy for non-super_admin
  - [x] `/users/archived/list` - Now filters by team_id for non-super_admin
  - [x] `/reports/managers` - Now scoped to team hierarchy
- [x] **Hierarchy repair/backfill endpoints** for broken manager_id
  - [x] `GET /admin/teams/{team_id}/hierarchy` - View hierarchy tree
  - [x] `GET /admin/teams/{team_id}/broken-hierarchy` - Detect broken relationships
  - [x] `POST /admin/repair-manager-ids` - Batch repair manager_id
- [x] **Frontend updates**
  - [x] Renamed "All Users" tab to "My Team" in TeamManagement
  - [x] Scoped to managers (state_manager, regional_manager, district_manager)
  - [x] Removed cross-team visibility

### January 2026 - Multi-Tenancy Refactor (COMPLETE)
- [x] Team model and admin endpoints
- [x] Migration endpoint to assign existing data to Team Sudbeck
- [x] All data queries scoped by team_id
- [x] Admin Panel for team/user management
- [x] 4 new teams created (Gaines, Koch, Quick, Graham)
- [x] 120+ users added with hierarchies

## Admin API Endpoints

### Team Management (super_admin only)
- `GET /api/admin/teams` - List all teams
- `POST /api/admin/teams` - Create team
- `PUT /api/admin/teams/{team_id}` - Update team
- `DELETE /api/admin/teams/{team_id}` - Delete team (only if empty)
- `GET /api/admin/teams/{team_id}/users` - Get team users
- `GET /api/admin/teams/{team_id}/hierarchy` - Get hierarchy tree
- `GET /api/admin/teams/{team_id}/broken-hierarchy` - Find broken hierarchy

### User Management (super_admin only)
- `GET /api/admin/users` - List all users with team info
- `POST /api/admin/users` - Create user in team
- `POST /api/admin/users/assign-team` - Assign user to team
- `POST /api/admin/repair-manager-ids` - Batch repair manager_id

## Test Credentials
- **Super Admin**: admin@pmagent.net / Admin2026
- **Team Sudbeck SM**: spencer.sudbeck@pmagent.net / Bizlink25
- **Team Quick SM**: sean.quick@pmagent.net / PMA2026

## Backlog / Future Tasks

### P1 (Medium Priority)
- [ ] Code refactoring - break down server.py into modules (routes/, models/)

### P2 (Lower Priority)
- [ ] Add more analytics and reporting features
- [ ] Performance optimizations for large teams

## Architecture Notes
- Multi-tenancy uses `team_id` field on all data collections
- Super Admin has global access but is NOT assigned to any team
- State Managers have admin privileges within their team ONLY
- `get_all_subordinates()` accepts `team_id` parameter for scoping
