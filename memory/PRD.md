# PMA Agent - Product Requirements Document

## Original Problem Statement
Multi-tenant sales activity tracking application with role-based access control for insurance agency hierarchy management.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT-based authentication with case-insensitive email lookup

## User Roles (Hierarchy)
1. `super_admin` - Global access, admin panel
2. `state_manager` - Team-level admin
3. `regional_manager` - Regional oversight
4. `district_manager` - District management
5. `agent` - Field agents

## Key Features Implemented

### Multi-Tenancy & Teams
- Team-based data isolation
- User assignment to teams
- Team management in Admin Panel

### User Management (Admin Panel)
- Create, edit, delete users
- Assign/reassign users to teams
- Role management
- Case-insensitive email lookup

### Data Repair Tools (Admin Panel - Diagnostics Tab)
- **Hierarchy Repair**: Fix broken manager_id relationships
- **Auto-Repair All Teams**: One-click fix for all teams
- **Force Rebuild Team Hierarchy**: Aggressive rebuild option
- **Diagnose Interviews**: Find orphaned interviews
- **Fix Orphaned Interviews**: Reassign to state managers
- **Diagnose Unassigned Users**: Find users without team_id (NEW - Jan 2026)
- **Fix Unassigned Users**: Bulk-assign team_id to users (NEW - Jan 2026)

### Interview Tracking
- Interview submission with activity metrics
- Report generation (XLSX export)
- Statistics dashboard

## Recent Fixes (January 2026)

### Unassigned Users Bug
- **Issue**: Agents getting "Access denied - not assigned to team" error
- **Cause**: Users in database without team_id field
- **Solution**: New diagnostic/fix tool in Admin Panel

## In Progress
- Per-Team Branding (paused to fix unassigned users bug)
  - Team logo, primary/accent colors, display name
  - Editable by super_admin

## Backlog
- **P1**: Refactor server.py (5500+ lines) into route modules

## API Endpoints

### Admin - User Management
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/{user_id}` - Update user  
- `DELETE /api/admin/users/{user_id}` - Delete user
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/assign-team` - Assign user to team

### Admin - Team Management
- `GET /api/admin/teams` - List teams
- `POST /api/admin/teams` - Create team
- `PUT /api/admin/teams/{team_id}` - Update team
- `DELETE /api/admin/teams/{team_id}` - Delete team

### Admin - Data Repair
- `GET /api/admin/teams/{team_id}/broken-hierarchy` - Find broken hierarchies
- `POST /api/admin/repair-manager-ids` - Batch repair manager_id
- `POST /api/admin/auto-repair-all-teams` - Auto-repair all teams
- `POST /api/admin/force-rebuild-team-hierarchy` - Force rebuild
- `GET /api/admin/diagnose-interviews` - Find orphaned interviews
- `POST /api/admin/fix-orphaned-interviews` - Fix orphaned interviews
- `GET /api/admin/diagnose-unassigned-users` - Find users without team (NEW)
- `POST /api/admin/fix-unassigned-users` - Bulk assign team_id (NEW)

### Admin - Branding
- `GET /api/admin/teams/{team_id}/branding` - Get team branding
- `PUT /api/admin/teams/{team_id}/branding` - Update team branding
- `GET /api/branding/my-team` - Get current user's team branding

## Database Schema

### users
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "password_hash": "string",
  "role": "string",
  "team_id": "string",
  "manager_id": "string",
  "status": "active|archived"
}
```

### teams
```json
{
  "id": "string",
  "name": "string",
  "created_at": "datetime",
  "settings": { "is_default": boolean },
  "branding": {
    "logo_url": "string",
    "display_name": "string",
    "primary_color": "string",
    "accent_color": "string"
  }
}
```

### interviews
```json
{
  "id": "string",
  "interviewer_id": "string",
  "team_id": "string",
  "candidate_name": "string",
  "interview_date": "datetime",
  "original_interviewer_id": "string",
  "reassigned_at": "datetime",
  "reassigned_by": "string"
}
```

## Test Credentials
- **Super Admin**: admin@pmagent.net / Bizlink25 (preview)
- **Production Admin**: spencer.sudbeck@pmagent.net / Bizlink25
- **New Team Users**: first.last@pmagent.net / PMA2026
