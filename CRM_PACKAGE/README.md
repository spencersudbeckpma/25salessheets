# CRM Sales Tracker

A comprehensive CRM application for tracking sales activities with hierarchical team management.

## Features

- **Hierarchical Team Management**: State Manager → Regional Manager → District Manager → Agent
- **Daily Activity Tracking**: 8 categories (Contacts, Appointments, Presentations, Referrals, Testimonials, Sales, New Face Sold, Total Premium)
- **Team View**: Daily/Weekly/Monthly/Yearly performance breakdowns
- **Leaderboards**: Top 5 performers across 5 categories
- **Role-Based Access Control**: JWT authentication with hierarchical permissions
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices

## Tech Stack

### Backend
- FastAPI (Python)
- MongoDB
- JWT Authentication
- Bcrypt password hashing

### Frontend
- React 18
- Tailwind CSS
- Shadcn/UI Components
- Recharts for visualizations
- Axios for API calls

## Installation

### Prerequisites
- Node.js (v16+)
- Python (v3.9+)
- MongoDB (running locally or connection string)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Create .env file:
```bash
cp .env.example .env
```

4. Update .env with your MongoDB connection and settings

5. Start the backend server:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create .env file:
```bash
cp .env.example .env
```

4. Update .env with your backend URL

5. Start the development server:
```bash
npm start
# or
yarn start
```

The app should open at http://localhost:3000

## First Time Setup

1. Register your first user with State Manager role
2. Use that account to invite team members
3. Build your team hierarchy

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login (accepts email or username)
- GET /api/auth/me - Get current user

### Activities
- POST /api/activities - Create/update daily activity
- GET /api/activities/my - Get user's activities
- PUT /api/activities/{activity_id} - Update activity

### Team Management
- GET /api/team/hierarchy/{period} - Get team hierarchy with stats
- GET /api/users/team-members - Get all team members
- POST /api/invites - Create team invite
- GET /api/invites/my - Get my invites

### Statistics
- GET /api/stats/my/{period} - Get personal stats
- GET /api/leaderboard/{period} - Get organization leaderboard

## User Roles

1. **State Manager**: Top-level, can see entire organization
2. **Regional Manager**: Manages districts within a region
3. **District Manager**: Manages agents within a district  
4. **Agent**: Individual contributor, tracks personal activities

## License

Proprietary - For internal use only

## Support

Contact your system administrator for support.
