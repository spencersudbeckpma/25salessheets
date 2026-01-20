# Team Sudbeck Sales Tracker - Product Requirements Document

## Overview
A comprehensive sales tracking application for insurance agencies, enabling team management, activity tracking, reporting, and agent progress monitoring.

## Core Features

### 1. User Management & Authentication
- JWT-based authentication
- Role-based access: State Manager, Regional Manager, District Manager, Agent
- Hierarchical team structure

### 2. Daily Activity Tracking
- Track: Contacts, Appointments, Presentations, Referrals, Testimonials, Apps, Sales, Premium
- New Face Sold and Bankers Premium tracking

### 3. Reports & Analytics
- Daily, Weekly, Monthly, Quarterly, Yearly reports
- Team View with hierarchical data
- Leaderboard
- Analytics dashboard

### 4. SNA Tracker (State/New Agent)
- **Automatic tracking** from first production entry
- 90-day tracking period
- $30,000 premium goal
- Shows: Active, On Pace, Behind Pace, Graduated/Completed
- Manual exclude/remove feature for managers

### 5. NPA Tracker (New Producing Agent)
- Track agents toward $1,000 premium goal
- Two modes:
  - **Select Team Member**: Links to existing user, **automatically calculates premium from activities**
  - **Manual Entry**: For external agents not in the system
- Shows progress percentage, upline information
- Achieved NPA list with achievement date

### 6. Interviews Feature
- Regional Breakdown view with stats by region
- Share functionality
- Updated interview guide form

### 7. PMA Bonuses
- Bonus tracking and calculation

### 8. DocuSphere
- Document management

### 9. Recruiting
- Team member recruitment tracking

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
- `backend/server.py` - Main backend file (4000+ lines, needs refactoring)
- `frontend/src/components/Reports.jsx` - Reports & tracking tabs
- `frontend/src/components/NPATracker.jsx` - NPA tracker component
- `frontend/src/components/SNATracker.jsx` - SNA tracker component
- `frontend/src/components/Interviews.jsx` - Interview management

## Database Collections

### npa_agents
```
{
  id: string,
  user_id: string (optional - links to users collection),
  name: string,
  phone: string,
  email: string,
  start_date: string,
  upline_dm: string,
  upline_rm: string,
  total_premium: float (manual entry only),
  notes: string,
  added_by: string,
  added_by_name: string,
  created_at: string,
  achievement_date: string
}
```

### sna_excluded_users
```
{
  user_id: string,
  excluded_by: string,
  excluded_at: datetime
}
```

### activities
```
{
  user_id: string,
  date: string,
  premium: float,
  ... (other activity fields)
}
```

## What's Been Implemented

### January 2026
- [x] NPA Tracker with automatic premium calculation from activities
- [x] NPA Tracker team member dropdown selection
- [x] NPA Tracker manual entry mode
- [x] SNA Tracker automatic tracking
- [x] SNA Tracker manual exclude feature
- [x] Reports tabs redesign (compact, color-coded)
- [x] Interview Regional Breakdown
- [x] Interview Share feature
- [x] Weekly Report date range picker
- [x] Fixed hierarchy data rollup for interviews

## Backlog / Future Tasks

### P0 (High Priority)
- [ ] Deploy all changes to production

### P1 (Medium Priority)
- [ ] Verify Team Goals saving issue
- [ ] Code refactoring - break down server.py into modules

### P2 (Lower Priority)
- [ ] Add more analytics and reporting features
- [ ] Performance optimizations for large teams

## Test Credentials
- **State Manager**: spencer.sudbeck@pmagent.net / Bizlink25

## Notes
- The `user_id` field in NPA tracker is crucial: when present, premium is calculated from `activities` collection
- Tabs use color-coded active states: blue (Reports), green (SNA), amber (NPA)
- Backend needs refactoring - server.py is over 4000 lines
