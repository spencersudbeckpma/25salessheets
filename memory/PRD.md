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

### Per-Team Branding (January 2026)
- Team logo, primary color, accent color, display name, tagline
- Editable by super_admin in Admin Panel → Teams → Branding
- Login page shows neutral platform branding (PMAUSA logo)
- Post-login UI adapts to user's team branding

### Team Feature Flags (January 2026) ✅ COMPLETED
- Control which tabs/features are visible per team
- Features: activity, stats, team_view, suitability, pma_bonuses, docusphere, leaderboard, analytics, reports, team_mgmt, recruiting, interviews
- **Backend Enforcement**: API endpoints return 403 for disabled features

### Leaderboard Fix (January 28, 2026) ✅ COMPLETED
- Fixed issue where non-super_admin users only saw their subordinates' data
- Now ALL team members see the same leaderboard (team-wide ranking)
- Period selection (weekly/monthly/quarterly/yearly) works correctly for all roles

### Environment + Build Version Indicator (January 28, 2026) ✅ NEW
- Shows on login page and dashboard footer
- Displays: Environment (PREVIEW/PRODUCTION/LOCAL) + Build hash + Timestamp
- Helps verify deployments

### Data Migration (January 28, 2026) ✅ COMPLETED
- Migrated orphaned data records to Team Sudbeck
- 39 records migrated, 57 merged
- All data now has valid user and team references

## API Endpoints

### Leaderboard (Fixed)
- `GET /api/leaderboard/{period}` - Returns top 5 for entire team (all roles see same data)
- Periods: daily, weekly, monthly, quarterly, yearly
- Debug info (`_debug` field) visible to super_admin only

### Admin - Team Features
- `GET /api/admin/teams/{team_id}/features` - Get team features
- `PUT /api/admin/teams/{team_id}/features` - Update team features

### Admin - Team Branding
- `GET /api/admin/teams/{team_id}/branding` - Get team branding
- `PUT /api/admin/teams/{team_id}/branding` - Update team branding

## Test Credentials (Preview Environment)
- **Super Admin**: admin@pmagent.net / Bizlink25
- **State Manager**: spencer.sudbeck@pmagent.net / Bizlink25
- **Agent**: sam.agent@pmagent.net / Bizlink25

## Current Build
- **Git Hash**: 1c1b075
- **Timestamp**: 2026-01-28 05:31:17 UTC

## Bugs Fixed (January 28, 2026)
- **Super Admin Branding Bug**: Fixed team_id assignment
- **Leaderboard Hierarchy Bug**: All roles now see full team data
- **Data Integrity Issues**: Migrated orphaned records

## Backlog
- **P1**: Refactor server.py (6000+ lines) into route modules
- **P2**: Add more granular feature flags for sub-features

## Last Updated
January 28, 2026
