from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import string
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DAYS = 30

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str  # state_manager, regional_manager, district_manager, agent
    manager_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    manager_id: Optional[str] = None
    invite_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    contacts: int = 0
    appointments: int = 0
    presentations: float = 0.0
    referrals: int = 0
    testimonials: int = 0
    sales: int = 0
    new_face_sold: int = 0
    premium: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    edited_by: Optional[str] = None
    edited_at: Optional[datetime] = None

class ActivityCreate(BaseModel):
    date: str
    contacts: int = 0
    appointments: int = 0
    presentations: float = 0.0
    referrals: int = 0
    testimonials: int = 0
    sales: int = 0
    new_face_sold: int = 0
    premium: float = 0.0

class Invite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invite_code: str
    name: str
    email: EmailStr
    role: str
    manager_id: str
    status: str = "pending"  # pending, accepted
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InviteCreate(BaseModel):
    name: str
    email: EmailStr
    role: str

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_invite_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_all_subordinates(user_id: str) -> List[str]:
    """Get all subordinates recursively"""
    subordinates = [user_id]
    direct_reports = await db.users.find({"manager_id": user_id}, {"_id": 0}).to_list(1000)
    for report in direct_reports:
        sub_list = await get_all_subordinates(report['id'])
        subordinates.extend(sub_list)
    return list(set(subordinates))

# Authentication Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # If invite code provided, validate it
    if user_data.invite_code:
        invite = await db.invites.find_one({"invite_code": user_data.invite_code, "status": "pending"}, {"_id": 0})
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid invite code")
        
        # Use invite details
        user_data.name = invite['name']
        user_data.role = invite['role']
        user_data.manager_id = invite['manager_id']
        
        # Mark invite as accepted
        await db.invites.update_one({"invite_code": user_data.invite_code}, {"$set": {"status": "accepted"}})
    
    # Hash password
    hashed_pw = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        manager_id=user_data.manager_id
    )
    
    doc = user.model_dump()
    doc['password_hash'] = hashed_pw
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    # Create token
    token = create_jwt_token(user.id, user.email)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "manager_id": user.manager_id
        }
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user['id'], user['email'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "manager_id": user.get('manager_id')
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "role": current_user['role'],
        "manager_id": current_user.get('manager_id')
    }

# Activity Routes
@api_router.post("/activities")
async def create_activity(activity_data: ActivityCreate, current_user: dict = Depends(get_current_user)):
    # Check if activity exists for date
    existing = await db.activities.find_one({"user_id": current_user['id'], "date": activity_data.date})
    if existing:
        raise HTTPException(status_code=400, detail="Activity already exists for this date")
    
    activity = Activity(
        user_id=current_user['id'],
        date=activity_data.date,
        contacts=activity_data.contacts,
        appointments=activity_data.appointments,
        presentations=activity_data.presentations,
        referrals=activity_data.referrals,
        testimonials=activity_data.testimonials,
        sales=activity_data.sales,
        new_face_sold=activity_data.new_face_sold,
        premium=activity_data.premium
    )
    
    doc = activity.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.activities.insert_one(doc)
    
    return {"message": "Activity created", "activity": activity.model_dump()}

@api_router.put("/activities/{date}")
async def update_activity(date: str, activity_data: ActivityCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.activities.find_one({"user_id": current_user['id'], "date": date})
    
    update_data = activity_data.model_dump()
    update_data['edited_by'] = current_user['id']
    update_data['edited_at'] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.activities.update_one({"user_id": current_user['id'], "date": date}, {"$set": update_data})
    else:
        # Create new activity
        data_dict = activity_data.model_dump()
        activity = Activity(
            user_id=current_user['id'],
            date=date,
            contacts=data_dict['contacts'],
            appointments=data_dict['appointments'],
            presentations=data_dict['presentations'],
            referrals=data_dict['referrals'],
            testimonials=data_dict['testimonials'],
            sales=data_dict['sales'],
            new_face_sold=data_dict['new_face_sold'],
            premium=data_dict['premium'],
            edited_by=current_user['id'],
            edited_at=datetime.now(timezone.utc)
        )
        doc = activity.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc.get('edited_at'):
            doc['edited_at'] = doc['edited_at'].isoformat()
        await db.activities.insert_one(doc)
    
    return {"message": "Activity updated"}

@api_router.get("/activities/my")
async def get_my_activities(current_user: dict = Depends(get_current_user)):
    activities = await db.activities.find({"user_id": current_user['id']}, {"_id": 0}).sort("date", -1).to_list(1000)
    return activities

# Manager editing team member activities
@api_router.put("/users/{user_id}/activities/{date}")
async def update_team_activity(user_id: str, date: str, activity_data: ActivityCreate, current_user: dict = Depends(get_current_user)):
    # Get all subordinates
    subordinates = await get_all_subordinates(current_user['id'])
    
    if user_id not in subordinates or user_id == current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to edit this user's data")
    
    existing = await db.activities.find_one({"user_id": user_id, "date": date})
    
    update_data = activity_data.model_dump()
    update_data['edited_by'] = current_user['id']
    update_data['edited_at'] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.activities.update_one({"user_id": user_id, "date": date}, {"$set": update_data})
    else:
        # Create new activity
        data_dict = activity_data.model_dump()
        activity = Activity(
            user_id=user_id,
            date=date,
            contacts=data_dict['contacts'],
            appointments=data_dict['appointments'],
            presentations=data_dict['presentations'],
            referrals=data_dict['referrals'],
            testimonials=data_dict['testimonials'],
            sales=data_dict['sales'],
            new_face_sold=data_dict['new_face_sold'],
            premium=data_dict['premium'],
            edited_by=current_user['id'],
            edited_at=datetime.now(timezone.utc)
        )
        doc = activity.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc.get('edited_at'):
            doc['edited_at'] = doc['edited_at'].isoformat()
        await db.activities.insert_one(doc)
    
    return {"message": "Team member activity updated"}

@api_router.get("/users/{user_id}/activities")
async def get_team_member_activities(user_id: str, current_user: dict = Depends(get_current_user)):
    subordinates = await get_all_subordinates(current_user['id'])
    
    if user_id not in subordinates:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's data")
    
    activities = await db.activities.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    return activities

# Statistics Routes
@api_router.get("/stats/my/{period}")
async def get_my_stats(period: str, current_user: dict = Depends(get_current_user), user_date: str = None):
    from datetime import timedelta
    from pytz import timezone as pytz_timezone
    
    # Use Central Time if no date provided
    central_tz = pytz_timezone('America/Chicago')
    if user_date:
        today = datetime.strptime(user_date, '%Y-%m-%d').date()
    else:
        today = datetime.now(central_tz).date()
    
    if period == "daily":
        start_date = today
    elif period == "weekly":
        start_date = today - timedelta(days=today.weekday())
    elif period == "monthly":
        start_date = today.replace(day=1)
    elif period == "quarterly":
        quarter = (today.month - 1) // 3
        start_date = today.replace(month=quarter * 3 + 1, day=1)
    elif period == "yearly":
        start_date = today.replace(month=1, day=1)
    else:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    activities = await db.activities.find({
        "user_id": current_user['id'],
        "date": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    # Aggregate stats
    stats = {
        "contacts": sum(a['contacts'] for a in activities),
        "appointments": sum(a['appointments'] for a in activities),
        "presentations": sum(a['presentations'] for a in activities),
        "referrals": sum(a['referrals'] for a in activities),
        "testimonials": sum(a['testimonials'] for a in activities),
        "sales": sum(a['sales'] for a in activities),
        "new_face_sold": sum(a['new_face_sold'] for a in activities),
        "premium": sum(a['premium'] for a in activities)
    }
    
    return stats

# Team Routes
@api_router.get("/team/members")
async def get_team_members(current_user: dict = Depends(get_current_user)):
    members = await db.users.find({"manager_id": current_user['id']}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return members

@api_router.get("/team/hierarchy/{period}")
async def get_team_hierarchy(period: str, current_user: dict = Depends(get_current_user), user_date: str = None):
    from datetime import timedelta
    from pytz import timezone as pytz_timezone
    
    # Use Central Time if no date provided
    central_tz = pytz_timezone('America/Chicago')
    if user_date:
        today = datetime.strptime(user_date, '%Y-%m-%d').date()
    else:
        today = datetime.now(central_tz).date()
    
    if period == "daily":
        start_date = today
    elif period == "weekly":
        start_date = today - timedelta(days=today.weekday())
    elif period == "monthly":
        start_date = today.replace(day=1)
    elif period == "yearly":
        start_date = today.replace(month=1, day=1)
    else:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    async def build_hierarchy(user_id: str) -> dict:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            return None
        
        # Get user's own stats for the specified period
        activities = await db.activities.find({
            "user_id": user_id,
            "date": {"$gte": start_date.isoformat()}
        }, {"_id": 0}).to_list(1000)
        
        own_stats = {
            "contacts": sum(a['contacts'] for a in activities),
            "appointments": sum(a['appointments'] for a in activities),
            "presentations": sum(a['presentations'] for a in activities),
            "referrals": sum(a['referrals'] for a in activities),
            "testimonials": sum(a['testimonials'] for a in activities),
            "sales": sum(a['sales'] for a in activities),
            "new_face_sold": sum(a['new_face_sold'] for a in activities),
            "premium": sum(a['premium'] for a in activities)
        }
        
        # Get subordinates and build their hierarchies
        subordinates = await db.users.find({"manager_id": user_id}, {"_id": 0}).to_list(1000)
        children = []
        
        # Initialize rolled up stats with own stats
        rolled_up_stats = {
            "contacts": own_stats["contacts"],
            "appointments": own_stats["appointments"],
            "presentations": own_stats["presentations"],
            "referrals": own_stats["referrals"],
            "testimonials": own_stats["testimonials"],
            "sales": own_stats["sales"],
            "new_face_sold": own_stats["new_face_sold"],
            "premium": own_stats["premium"]
        }
        
        # Recursively build children and roll up their stats
        for sub in subordinates:
            child_hierarchy = await build_hierarchy(sub['id'])
            if child_hierarchy:
                children.append(child_hierarchy)
                # Add child's rolled up stats to parent's rolled up stats
                rolled_up_stats["contacts"] += child_hierarchy["stats"]["contacts"]
                rolled_up_stats["appointments"] += child_hierarchy["stats"]["appointments"]
                rolled_up_stats["presentations"] += child_hierarchy["stats"]["presentations"]
                rolled_up_stats["referrals"] += child_hierarchy["stats"]["referrals"]
                rolled_up_stats["testimonials"] += child_hierarchy["stats"]["testimonials"]
                rolled_up_stats["sales"] += child_hierarchy["stats"]["sales"]
                rolled_up_stats["new_face_sold"] += child_hierarchy["stats"]["new_face_sold"]
                rolled_up_stats["premium"] += child_hierarchy["stats"]["premium"]
        
        return {
            **user,
            "stats": rolled_up_stats,  # This now includes own + all subordinates
            "children": children
        }
    
    hierarchy = await build_hierarchy(current_user['id'])
    return hierarchy

@api_router.get("/users/team-members")
async def get_all_team_members(current_user: dict = Depends(get_current_user)):
    subordinate_ids = await get_all_subordinates(current_user['id'])
    subordinate_ids.remove(current_user['id'])  # Remove self
    
    members = await db.users.find({"id": {"$in": subordinate_ids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return members

# Invite Routes
@api_router.post("/invites")
async def create_invite(invite_data: InviteCreate, current_user: dict = Depends(get_current_user)):
    # Validate role hierarchy
    role_hierarchy = {
        "state_manager": ["regional_manager"],
        "regional_manager": ["district_manager"],
        "district_manager": ["agent"],
        "agent": []
    }
    
    if invite_data.role not in role_hierarchy.get(current_user['role'], []):
        raise HTTPException(status_code=403, detail="Cannot invite this role")
    
    invite_code = generate_invite_code()
    
    invite = Invite(
        invite_code=invite_code,
        name=invite_data.name,
        email=invite_data.email,
        role=invite_data.role,
        manager_id=current_user['id']
    )
    
    doc = invite.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.invites.insert_one(doc)
    
    return {"message": "Invite created", "invite_code": invite_code, "invite": invite.model_dump()}

@api_router.get("/invites/my")
async def get_my_invites(current_user: dict = Depends(get_current_user)):
    invites = await db.invites.find({"manager_id": current_user['id']}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invites

@api_router.delete("/invites/{invite_id}")
async def delete_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    invite = await db.invites.find_one({"id": invite_id, "manager_id": current_user['id']})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    await db.invites.delete_one({"id": invite_id})
    return {"message": "Invite deleted"}

@api_router.get("/invites/verify/{invite_code}")
async def verify_invite(invite_code: str):
    invite = await db.invites.find_one({"invite_code": invite_code, "status": "pending"}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite code")
    
    return invite

# User Management
@api_router.delete("/users/{user_id}")
async def remove_user(user_id: str, current_user: dict = Depends(get_current_user)):
    subordinates = await get_all_subordinates(current_user['id'])
    
    if user_id not in subordinates or user_id == current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to remove this user")
    
    await db.users.delete_one({"id": user_id})
    await db.activities.delete_many({"user_id": user_id})
    
    return {"message": "User removed"}

# Leaderboard
@api_router.get("/leaderboard/{period}")
async def get_leaderboard(period: str, current_user: dict = Depends(get_current_user)):
    from datetime import timedelta
    
    today = datetime.now(timezone.utc).date()
    
    if period == "weekly":
        start_date = today - timedelta(days=today.weekday())
    elif period == "monthly":
        start_date = today.replace(day=1)
    elif period == "quarterly":
        quarter = (today.month - 1) // 3
        start_date = today.replace(month=quarter * 3 + 1, day=1)
    elif period == "yearly":
        start_date = today.replace(month=1, day=1)
    else:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    # Get all subordinates including self
    subordinate_ids = await get_all_subordinates(current_user['id'])
    
    # Get all users
    users = await db.users.find({"id": {"$in": subordinate_ids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    user_dict = {u['id']: u for u in users}
    
    # Get all activities for the period
    activities = await db.activities.find({
        "user_id": {"$in": subordinate_ids},
        "date": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Aggregate by user
    user_stats = {}
    for activity in activities:
        uid = activity['user_id']
        if uid not in user_stats:
            user_stats[uid] = {
                "user_id": uid,
                "name": user_dict.get(uid, {}).get('name', 'Unknown'),
                "presentations": 0,
                "testimonials": 0,
                "new_face_sold": 0,
                "premium": 0.0
            }
        user_stats[uid]['presentations'] += activity['presentations']
        user_stats[uid]['testimonials'] += activity['testimonials']
        user_stats[uid]['new_face_sold'] += activity['new_face_sold']
        user_stats[uid]['premium'] += activity['premium']
    
    # Create leaderboards for each category - Top 3
    leaderboard = {
        "presentations": sorted(user_stats.values(), key=lambda x: x['presentations'], reverse=True)[:3],
        "testimonials": sorted(user_stats.values(), key=lambda x: x['testimonials'], reverse=True)[:3],
        "new_face_sold": sorted(user_stats.values(), key=lambda x: x['new_face_sold'], reverse=True)[:3],
        "premium": sorted(user_stats.values(), key=lambda x: x['premium'], reverse=True)[:3]
    }
    
    return leaderboard

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()