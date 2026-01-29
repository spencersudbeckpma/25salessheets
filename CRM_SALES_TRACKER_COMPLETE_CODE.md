# CRM Sales Tracker - Complete Code Package

This document contains all the code for the CRM Sales Tracker application.

## Project Structure
```
/app/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ActivityInput.jsx
│   │   │   ├── StatsView.jsx
│   │   │   ├── TeamView.jsx
│   │   │   ├── TeamManagement.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── AdminCleanup.jsx
│   │   │   └── ui/ (Shadcn components)
│   │   └── hooks/
│   │       └── use-toast.js
```

---

## BACKEND FILES

### File: backend/.env
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="crm_sales_tracker"
CORS_ORIGINS="*"
JWT_SECRET_KEY="your-secret-key-change-this-in-production"
```

### File: backend/requirements.txt
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.2
pymongo==4.6.0
pydantic==2.5.0
pydantic[email]==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.1.1
python-multipart==0.0.6
python-dotenv==1.0.0
pytz==2023.3
```

---

## FRONTEND FILES

### File: frontend/.env
```env
REACT_APP_BACKEND_URL=https://secure-analytics-2.preview.emergentagent.com
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

### File: frontend/package.json
```json
{
  "name": "crm-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-slot": "^1.0.2",
    "axios": "^1.6.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.294.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "react-scripts": "5.0.1",
    "recharts": "^2.10.3",
    "sonner": "^1.2.0",
    "tailwind-merge": "^2.1.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "tailwindcss": "^3.3.6"
  }
}
```

### File: frontend/tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### File: frontend/postcss.config.js
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- Python (v3.9+)
- MongoDB

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Update .env with your MongoDB connection
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend Setup
```bash
cd frontend
npm install
# or
yarn install

# Update .env with your backend URL
npm start
# or
yarn start
```

### Database
The application will automatically create the required collections in MongoDB on first run.

### First User
Register your first user as a State Manager to get started.

---

## Features
- ✅ Hierarchical team management (State, Regional, District, Agent)
- ✅ Daily activity tracking (8 categories)
- ✅ Team View with daily/weekly/monthly/yearly breakdowns
- ✅ Personal statistics dashboard
- ✅ Manager team management and data editing
- ✅ Organization-wide leaderboard (5 categories, top 5 per category)
- ✅ JWT authentication with role-based access
- ✅ Mobile responsive design
- ✅ Username or email login support

---

**NOTE:** You'll need to copy the actual code files from the sections below. This is just the structure overview.
