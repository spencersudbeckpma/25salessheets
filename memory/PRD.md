# Team Sudbeck Sales Tracker - Product Requirements Document

## Overview
A comprehensive sales tracking application for insurance agencies, enabling team management, activity tracking, reporting, and agent progress monitoring. **Now with multi-tenancy support.**

## Core Features

### 1. User Management & Authentication
- JWT-based authentication
- Role-based access: State Manager, Regional Manager, District Manager, Agent
- Hierarchical team structure
- **Multi-tenancy: Users must be assigned to a team to access the app**

### 2. Multi-Tenancy (NEW - Jan 2026)
- **Team-based data isolation**: All data scoped by `team_id`
- **Admin Panel**: State Managers can create teams and assign users
- **Migration completed**: All existing data migrated to "Team Sudbeck"
- **Team hierarchy**: Each team has independent hierarchies
- **Data collections with team_id**: users, activities, interviews, suitability_forms, npa_agents, new_face_customers, recruits, team_goals, goals, invites

### 3. Daily Activity Tracking
- Track: Contacts, Appointments, Presentations, Referrals, Testimonials, Apps, Sales, Premium
- New Face Sold and Bankers Premium tracking

### 4. Reports & Analytics
- Daily, Weekly, Monthly, Quarterly, Yearly reports
- Team View with hierarchical data rollup
- Leaderboard (organization-wide, team-scoped)
- Analytics dashboard

### 5. SNA Tracker (State/New Agent)
- Automatic tracking from first production entry
- 90-day tracking period, $30,000 premium goal
- Shows: Active, On Pace, Behind Pace, Graduated/Completed
- Manual exclude/remove feature for managers

### 6. NPA Tracker (New Producing Agent)
- Track agents toward $1,000 premium goal
- Select Team Member: Links to existing user, auto-calculates premium
- Manual Entry: For external agents not in the system
- Shows progress percentage, upline information

### 7. Interviews Feature
- Regional Breakdown view with stats by region
- Share functionality with team members
- 2nd Interview Answers field for Moving Forward candidates

### 8. Suitability Form
- Complete form for client suitability assessments
- Life Licensed field with Regional Manager assignment
- Weekly Report view with export to Excel (.xlsx)
- Manager notes/results field

### 9. PMA Bonuses
- Bonus tracking and calculation

### 10. DocuSphere
- Document management

### 11. Recruiting
- Team member recruitment pipeline tracking

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
- `backend/server.py` - Main backend file (~5500 lines)
- `frontend/src/components/Dashboard.jsx` - Main dashboard with tabs
- `frontend/src/components/AdminPanel.jsx` - Team/User management (NEW)
- `frontend/src/components/Reports.jsx` - Reports & tracking tabs
- `frontend/src/components/NPATracker.jsx` - NPA tracker component
- `frontend/src/components/SNATracker.jsx` - SNA tracker component
- `frontend/src/components/Interviews.jsx` - Interview management
- `frontend/src/components/SuitabilityForm.jsx` - Suitability form feature

## Database Collections

### teams (NEW)
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
  "role": "state_manager|regional_manager|district_manager|agent",
  "team_id": "string (UUID) - required for non-admin access",
  "manager_id": "string (UUID)",
  "status": "active|archived"
}
```

### activities
```json
{
  "id": "string",
  "user_id": "string",
  "team_id": "string",
  "date": "YYYY-MM-DD",
  "contacts": "float",
  "appointments": "float",
  "presentations": "float",
  "referrals": "int",
  "testimonials": "int",
  "sales": "int",
  "new_face_sold": "float",
  "premium": "float"
}
```

### All other collections now include `team_id` field

## What's Been Implemented

### January 2026
- [x] **Multi-Tenancy Refactor** (Complete)
  - [x] Team model and admin endpoints
  - [x] Migration endpoint to assign existing data to Team Sudbeck
  - [x] All data queries scoped by team_id
  - [x] Admin Panel for team/user management
  - [x] 58 users and all data migrated to Team Sudbeck
- [x] NPA Tracker with automatic premium calculation
- [x] SNA Tracker automatic tracking
- [x] Interview Regional Breakdown
- [x] Interview Share feature
- [x] 2nd Interview Answers field
- [x] Suitability Form with Excel export
- [x] Reports tabs redesign

## Backlog / Future Tasks

### P0 (High Priority)
- [x] Multi-tenancy refactor - COMPLETE
- [x] Restrict team management to super_admin only - COMPLETE
- [x] Deploy to production - READY (passed deployment check)

### P1 (Medium Priority)
- [ ] Code refactoring - break down server.py into modules (routes/, models/)

### P2 (Lower Priority)
- [ ] Add more analytics and reporting features
- [ ] Performance optimizations for large teams

## Test Credentials
- **State Manager**: spencer.sudbeck@pmagent.net / Bizlink25

## Architecture Notes
- Multi-tenancy uses `team_id` field on all data collections
- State Managers have admin privileges (can manage teams, assign users)
- Users without team_id cannot access the app (except state_managers)
- `get_all_subordinates()` now accepts optional `team_id` parameter for scoping
- Migration endpoint: `POST /api/admin/migrate-to-teams`

## Admin API Endpoints
- `GET /api/admin/teams` - List all teams
- `POST /api/admin/teams` - Create team
- `PUT /api/admin/teams/{team_id}` - Update team
- `DELETE /api/admin/teams/{team_id}` - Delete team (only if empty)
- `GET /api/admin/users` - List all users with team info
- `POST /api/admin/users/assign-team` - Assign user to team
- `POST /api/admin/migrate-to-teams` - Run data migration
