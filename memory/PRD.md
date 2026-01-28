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

### Per-Team Branding (January 2026)
- Team logo, primary color, accent color, display name, tagline
- Editable by super_admin in Admin Panel → Teams → Branding
- Login page shows neutral platform branding (PMAUSA logo)
- Post-login UI adapts to user's team branding

### Team Feature Flags (January 2026) ✅ COMPLETED
- Control which tabs/features are visible per team
- Features: activity, stats, team_view, suitability, pma_bonuses, docusphere, leaderboard, analytics, reports, team_mgmt, recruiting, interviews
- Editable by super_admin in Admin Panel → Teams → Features
- Copy features from another team
- Reset to defaults option
- **Backend Enforcement**: API endpoints now return 403 for disabled features

### Data Repair Tools (Admin Panel - Diagnostics Tab)
- Hierarchy Repair, Auto-Repair All Teams
- Force Rebuild Team Hierarchy
- Diagnose/Fix Orphaned Interviews
- Diagnose/Fix Unassigned Users

### Interview Tracking
- Interview submission with activity metrics
- Report generation (XLSX export)
- Statistics dashboard

## API Endpoints

### Admin - Team Features
- `GET /api/admin/teams/{team_id}/features` - Get team features
- `PUT /api/admin/teams/{team_id}/features` - Update team features
- `POST /api/admin/teams/{team_id}/features/reset` - Reset to defaults
- `POST /api/admin/teams/{team_id}/features/copy-from/{source_id}` - Copy features
- `GET /api/teams/my-features` - Get current user's team features

### Admin - Team Branding
- `GET /api/admin/teams/{team_id}/branding` - Get team branding
- `PUT /api/admin/teams/{team_id}/branding` - Update team branding
- `POST /api/admin/setup-all-branding` - Apply branding to all teams

### Admin - User Management
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/{user_id}` - Update user
- `DELETE /api/admin/users/{user_id}` - Delete user
- `GET /api/admin/users` - List all users

### Admin - Data Repair
- `GET /api/admin/diagnose-unassigned-users` - Find users without team
- `POST /api/admin/fix-unassigned-users` - Bulk assign team_id
- `POST /api/admin/create-missing-team-record` - Create Team Sudbeck

## Feature-Protected API Endpoints
The following endpoints now enforce feature flags (return 403 if feature is disabled for team):

| Feature | Protected Endpoints |
|---------|---------------------|
| leaderboard | GET /api/leaderboard/{period} |
| docusphere | GET/POST /api/docusphere/folders |
| recruiting | GET/POST/PUT/DELETE /api/recruiting* |
| interviews | GET/POST/PUT/DELETE /api/interviews* |
| analytics | GET /api/analytics/* |
| reports | GET /api/reports/* |

## Database Schema

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
    "accent_color": "string",
    "tagline": "string"
  },
  "features": {
    "activity": boolean,
    "stats": boolean,
    "team_view": boolean,
    "suitability": boolean,
    "pma_bonuses": boolean,
    "docusphere": boolean,
    "leaderboard": boolean,
    "analytics": boolean,
    "reports": boolean,
    "team_mgmt": boolean,
    "recruiting": boolean,
    "interviews": boolean
  }
}
```

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

## Test Credentials
- **Super Admin**: admin@pmagent.net / Bizlink25 (preview)
- **Production Admin**: spencer.sudbeck@pmagent.net / Bizlink25

## Bugs Fixed (January 2026)
- **Super Admin Branding Bug**: Fixed issue where super_admin saw wrong team branding by assigning correct team_id
- **Feature Flag Backend Enforcement**: Added `check_feature_access` calls to all feature-protected endpoints

## Backlog
- **P1**: Refactor server.py (6000+ lines) into route modules (`routes/auth.py`, `routes/admin.py`, etc.)
- **P2**: Add more granular feature flags for sub-features

## Last Updated
January 28, 2026
