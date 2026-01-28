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
- **Feature Flags**: Team-based feature toggles

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

## Data Models
- **users**: id, name, email, role, team_id, manager_id, status
- **activities**: id, user_id, team_id, date, contacts, appointments, presentations, referrals, testimonials, sales, new_face_sold, premium
- **teams**: id, name, branding, features
- **docusphere_folders**: id, name, parent_id, team_id, created_by
- **docusphere_documents**: id, filename, folder_id, team_id, uploaded_by

---

## Changelog

### 2025-01-28 - Team Rollup Bug Fix
- **Fixed**: State manager's personal activities were not included in team hierarchy rollups
- **Root Cause**: `/api/team/hierarchy/{period}` was filtering activity queries by `team_id`, excluding activities without team_id
- **Solution**: Removed team_id filter from activity query in `build_hierarchy()` to match `/stats/my/{period}` behavior
- **File Modified**: `backend/server.py` (lines 4046-4058)

### Previous Session (from handoff)
- Fixed Leaderboard bugs (migrated 600+ activities with team_id)
- Implemented DocuSphere team scoping and role-based permissions
- Fixed DocuSphere data visibility (migrated 22 folders, 185 documents)
- Fixed personal rollup bug for state_manager
- Resolved super_admin branding bug
- Completed feature flag enforcement on all endpoints
- Removed debug UI indicators

---

## Pending Tasks

### P0 - Critical
- ✅ Team rollup bug (FIXED 2025-01-28)

### P1 - High Priority  
- [ ] Verify fix in production with acceptance test
- [ ] Address 25 activity records with NULL team_id (users without team assignment)

### P2 - Medium Priority
- [ ] Refactor monolithic `server.py` into route-based structure (`backend/routes/`)
- [ ] Remove temporary migration/diagnostic endpoints after stability confirmed

### P3 - Future/Backlog
- [ ] Granular feature flags for sub-features
- [ ] "All-Time" leaderboard period option
- [ ] Additional enhancements as requested

---

## Test Credentials (Preview)
- **Super Admin**: admin@pmagent.net / Bizlink25

## Known Technical Debt
- `backend/server.py` is a monolith (~7000+ lines) containing all logic
- Multiple temporary migration endpoints need cleanup
- Some legacy activities may not have team_id set
