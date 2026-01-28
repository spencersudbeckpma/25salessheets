# PMA Agent - Super Admin Playbook

A step-by-step guide for managing teams, users, and system administration.

---

## Table of Contents
1. [Logging In as Super Admin](#1-logging-in-as-super-admin)
2. [Creating a New Team](#2-creating-a-new-team)
3. [Configuring Feature Flags](#3-configuring-feature-flags)
4. [Creating Users](#4-creating-users)
5. [Setting Up Hierarchy](#5-setting-up-hierarchy)
6. [Team Branding](#6-team-branding)
7. [DocuSphere Rules](#7-docusphere-rules)
8. [Diagnostics & Recovery](#8-diagnostics--recovery)
9. [Common Issues & Solutions](#9-common-issues--solutions)

---

## 1. Logging In as Super Admin

1. Go to your app URL (e.g., `https://sales-activity-hub.emergent.host`)
2. Enter your super admin email and password
3. You will see the full navigation with an **Admin** tab

**Note:** Super admins can see all teams and bypass feature restrictions.

---

## 2. Creating a New Team

### Steps:
1. Click **Admin** in the navigation
2. You're on the **Teams** tab by default
3. Click **+ New Team**
4. Enter the team name (e.g., "Team Nebraska")
5. Click **Create Team**

### What happens:
- A new team record is created
- Default feature flags are applied (all features ON except Recruiting)
- No users are assigned yet

---

## 3. Configuring Feature Flags

Feature flags control which tabs/features each team can access.

### Default Features (enabled by default):
| Feature | Description |
|---------|-------------|
| Activity | Daily activity logging |
| Stats | Personal statistics view |
| Team View | Hierarchy tree with rollups |
| Suitability | Suitability forms (SNA/NPA) |
| PMA Bonuses | Bonus PDF uploads |
| DocuSphere | Document library |
| Leaderboard | Team rankings |
| Analytics | Charts and trends |
| Reports | Manager reports & exports |
| Team Mgmt | Team management (managers only) |
| Interviews | Interview tracking |

### Features disabled by default:
| Feature | Description |
|---------|-------------|
| Recruiting | Recruiting pipeline (enable per team) |

### To Configure Features:
1. Go to **Admin → Teams**
2. Find the team row
3. Click the **gear icon** (⚙️) on the right
4. Toggle features ON/OFF
5. Changes save automatically

### Copy Features from Another Team:
1. Click the team's gear icon
2. Scroll to "Copy from another team"
3. Select the source team
4. Click **Copy**

### Reset to Defaults:
1. Click the team's gear icon
2. Click **Reset to Defaults**

---

## 4. Creating Users

### Steps:
1. Go to **Admin → Users**
2. Click **+ Create User**
3. Fill in the form:
   - **Team**: Select from dropdown
   - **Full Name**: User's display name
   - **Email**: Login username (must be unique)
   - **Password**: Temporary password (user should change)
   - **Role**: See role descriptions below
   - **Manager**: Optional - can set later in Team Mgmt

4. Click **Create User**

### Roles (hierarchy order):
| Role | Access Level |
|------|--------------|
| State Manager | Full team access, can manage DocuSphere, see all reports |
| Regional Manager | Sees direct + indirect reports, limited admin |
| District Manager | Sees direct reports only |
| Agent | Personal data only |

### Important:
- Email must be unique across all teams
- Users cannot log in until assigned to a team
- Role determines what tabs appear and what data is visible

---

## 5. Setting Up Hierarchy

Hierarchy determines who reports to whom and affects:
- What data managers can see
- How rollups are calculated
- Team View tree structure

### Setting Manager Assignment:

#### Option A: During User Creation
1. When creating a user, select their manager from the dropdown
2. Only users from the same team appear as options

#### Option B: Edit Existing User
1. Go to **Admin → Users**
2. Click the **pencil icon** next to the user
3. Change the **Manager** field
4. Click **Save**

#### Option C: Use Team Management (State Managers)
1. Log in as State Manager
2. Go to **Team Mgmt** tab
3. Use the **Reorganize** sub-tab
4. Drag users to reassign managers

### Hierarchy Rules:
- State Manager is at the top (no manager)
- Regional Managers report to State Manager
- District Managers report to Regional Managers
- Agents report to District Managers
- A user can only have ONE manager
- Managers must be from the SAME team

### Repair Broken Hierarchy:
1. Go to **Admin → Repair Hierarchy**
2. Click **Check Hierarchy** for the team
3. Review any issues found
4. Click **Auto-Repair** or manually fix

---

## 6. Team Branding

Each team can have custom branding (colors, logo, name).

### To Set Branding:
1. Go to **Admin → Teams**
2. Click the **paint palette icon** for the team
3. Set:
   - **Display Name**: Shows in header
   - **Tagline**: Optional subtitle
   - **Primary Color**: Main theme color (hex, e.g., #1e40af)
   - **Accent Color**: Secondary color
   - **Logo URL**: Link to team logo image
4. Click **Save Branding**

### Notes:
- Users from that team see their team's branding when logged in
- Super admin sees the branding of the team they're currently viewing
- Logo should be hosted externally (URL to image)

---

## 7. DocuSphere Rules

DocuSphere is the document library feature.

### Access Rules by Role:

| Role | Can View | Can Upload | Can Create Folders | Can Delete |
|------|----------|------------|-------------------|------------|
| State Manager | ✅ Team docs | ✅ | ✅ | ✅ |
| Regional Manager | ✅ Team docs | ❌ | ❌ | ❌ |
| District Manager | ✅ Team docs | ❌ | ❌ | ❌ |
| Agent | ✅ Team docs | ❌ | ❌ | ❌ |

### Key Points:
- Documents are **team-scoped** (Team A cannot see Team B's docs)
- Only **State Managers** can upload, create folders, or delete
- All other roles have **read-only** access
- Documents can be organized in folders and subfolders

### If Documents Are Missing:
1. Verify the user is assigned to the correct team
2. Check that DocuSphere feature is enabled for the team
3. Run **Diagnostics → Diagnose Orphaned Activities** (data integrity)

---

## 8. Diagnostics & Recovery

### Access Diagnostics:
1. Go to **Admin → Diagnostics**

### Available Diagnostic Tools:

#### A. Diagnose Interviews
- Finds interviews with deleted/orphaned owners
- Click **Diagnose Interviews** to scan
- Click **Fix Orphaned Interviews** to reassign to State Manager

#### B. Find Unassigned Users
- Finds users without a team assignment
- These users CANNOT log in
- Select users and assign them to a team

#### C. Diagnose Orphaned Activities
- Finds activity records missing team_id
- These won't appear in team rollups
- Click **Fix Orphaned Activities** to repair

### When to Run Diagnostics:
- After bulk user imports
- If rollup numbers seem wrong
- If users report missing data
- After deleting users

---

## 9. Common Issues & Solutions

### Issue: User can't log in
**Check:**
1. Is the user assigned to a team? (Admin → Users → check Team column)
2. Is the password correct?
3. Is the user status "active"? (not archived)

**Fix:** Assign user to team or reset password

---

### Issue: Manager sees wrong data in rollups
**Check:**
1. Is hierarchy set correctly? (Admin → Users → check Reports-to)
2. Are all subordinates assigned to same team?
3. Run Diagnostics → Diagnose Orphaned Activities

**Fix:** Correct hierarchy or run activity migration

---

### Issue: Feature tab missing for user
**Check:**
1. Is the feature enabled for their team? (Admin → Teams → gear icon)
2. Does their role have access to that feature?

**Fix:** Enable feature flag for team

---

### Issue: DocuSphere empty
**Check:**
1. Is DocuSphere enabled for the team?
2. Is user assigned to correct team?
3. Have documents been uploaded by State Manager?

**Fix:** Enable feature and/or upload documents

---

### Issue: Leaderboard shows zeros
**Check:**
1. Is the time period correct?
2. Have activities been logged?
3. Run Diagnostics to check data integrity

**Fix:** Verify activities exist and have correct team_id

---

## Quick Reference: Admin Navigation

| Tab | Purpose |
|-----|---------|
| Teams | Create teams, set branding, configure features |
| Users | Create/edit users, view all users across teams |
| Repair Hierarchy | Fix broken manager relationships |
| Diagnostics | Data integrity tools and recovery |

---

## Support

For technical issues beyond this playbook, contact your system administrator or development team.

---

*Document generated from PMA Agent production system*
*Last updated: January 2025*
