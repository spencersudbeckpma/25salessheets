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
from datetime import datetime, timezone, timedelta, date as date_class
import bcrypt
import jwt
import string
import random
from pytz import timezone as pytz_timezone

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
    email: str  # Changed from EmailStr to accept username or email
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    user_id: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    contacts: float = 0.0
    appointments: float = 0.0
    presentations: float = 0.0
    referrals: int = 0
    testimonials: int = 0
    sales: int = 0
    new_face_sold: float = 0.0
    premium: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    edited_by: Optional[str] = None
    edited_at: Optional[datetime] = None

class ActivityCreate(BaseModel):
    date: str
    contacts: float = 0.0
    appointments: float = 0.0
    presentations: float = 0.0
    referrals: int = 0
    testimonials: int = 0
    sales: int = 0
    new_face_sold: float = 0.0
    premium: float = 0.0

class NewFaceCustomer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    date: str  # YYYY-MM-DD format
    customer_name: str
    county: str
    policy_amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewFaceCustomerCreate(BaseModel):
    date: str
    customer_name: str
    county: str
    policy_amount: float

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

@api_router.post("/new-face-customers")
async def create_new_face_customer(customer: NewFaceCustomerCreate, current_user: dict = Depends(get_current_user)):
    """Add a new face customer record"""
    # Check how many records exist for this user on this date
    count = await db.new_face_customers.count_documents({
        "user_id": current_user['id'],
        "date": customer.date
    })
    
    if count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 new face customers per day")
    
    new_customer = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "user_name": current_user['name'],
        "date": customer.date,
        "customer_name": customer.customer_name,
        "county": customer.county,
        "policy_amount": customer.policy_amount,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.new_face_customers.insert_one(new_customer)
    return {"message": "New face customer added", "id": new_customer['id']}

@api_router.get("/new-face-customers/my")
async def get_my_new_face_customers(current_user: dict = Depends(get_current_user)):
    """Get my new face customer records"""
    customers = await db.new_face_customers.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    return customers

@api_router.get("/new-face-customers/date/{date}")
async def get_new_face_customers_by_date(date: str, current_user: dict = Depends(get_current_user)):
    """Get new face customers for a specific date"""
    customers = await db.new_face_customers.find(
        {"user_id": current_user['id'], "date": date},
        {"_id": 0}
    ).to_list(10)
    return customers

@api_router.get("/new-face-customers/all")
async def get_all_new_face_customers(current_user: dict = Depends(get_current_user)):
    """Get all new face customers from entire team (Managers only)"""
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all team members recursively
    async def get_all_team_ids(user_id: str):
        ids = [user_id]
        subordinates = await db.users.find({"manager_id": user_id}, {"_id": 0, "id": 1}).to_list(1000)
        for sub in subordinates:
            ids.extend(await get_all_team_ids(sub['id']))
        return ids
    
    team_ids = await get_all_team_ids(current_user['id'])
    
    customers = await db.new_face_customers.find(
        {"user_id": {"$in": team_ids}},
        {"_id": 0}
    ).sort("date", -1).to_list(10000)
    
    return customers

@api_router.delete("/new-face-customers/{customer_id}")
async def delete_new_face_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a new face customer record"""
    customer = await db.new_face_customers.find_one({"id": customer_id}, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Only owner or managers can delete
    if customer['user_id'] != current_user['id'] and current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.new_face_customers.delete_one({"id": customer_id})
    return {"message": "Customer deleted"}

@api_router.get("/reports/excel/newface/{period}")
async def generate_newface_report(period: str, current_user: dict = Depends(get_current_user)):
    """
    Generate Excel report for new face customers by period.
    Shows customer name, county, policy amount, date, and agent.
    """
    if current_user['role'] != 'state_manager':
        raise HTTPException(status_code=403, detail="Access denied")
    
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    # Use Central Time for date calculations
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    if period == "monthly":
        start_date = today.replace(day=1)
        period_name = start_date.strftime('%B %Y')
    elif period == "quarterly":
        quarter = (today.month - 1) // 3
        start_date = today.replace(month=quarter * 3 + 1, day=1)
        period_name = f"Q{quarter + 1} {today.year}"
    elif period == "yearly":
        start_date = today.replace(month=1, day=1)
        period_name = f"Year {today.year}"
    else:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    # Get all team members recursively
    async def get_all_team_ids(user_id: str):
        ids = [user_id]
        subordinates = await db.users.find({"manager_id": user_id}, {"_id": 0, "id": 1}).to_list(1000)
        for sub in subordinates:
            ids.extend(await get_all_team_ids(sub['id']))
        return ids
    
    team_ids = await get_all_team_ids(current_user['id'])
    
    # Get new face customers for the period
    customers = await db.new_face_customers.find({
        "user_id": {"$in": team_ids},
        "date": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "New Face Customers"
    
    # Add title
    ws.merge_cells('A1:F1')
    title_cell = ws['A1']
    title_cell.value = f"New Face Customer Report - {period_name}"
    title_cell.font = Font(size=16, bold=True, color="FFFFFF")
    title_cell.alignment = Alignment(horizontal='center')
    title_cell.fill = PatternFill(start_color="28A745", end_color="28A745", fill_type="solid")
    
    # Add headers
    headers = ["Date", "Agent Name", "Customer Name", "County", "Policy Amount", "Total"]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_num)
        cell.value = header
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="D4EDDA", end_color="D4EDDA", fill_type="solid")
        cell.alignment = Alignment(horizontal='center')
    
    # Add data
    total_policy = 0
    for row_num, customer in enumerate(customers, 3):
        ws.cell(row=row_num, column=1).value = customer.get('date', '')
        ws.cell(row=row_num, column=2).value = customer.get('user_name', 'Unknown')
        ws.cell(row=row_num, column=3).value = customer.get('customer_name', '')
        ws.cell(row=row_num, column=4).value = customer.get('county', '')
        ws.cell(row=row_num, column=5).value = customer.get('policy_amount', 0)
        total_policy += customer.get('policy_amount', 0)
    
    # Add summary row
    if customers:
        summary_row = len(customers) + 3
        ws.cell(row=summary_row, column=1).value = "TOTAL"
        ws.cell(row=summary_row, column=1).font = Font(bold=True)
        ws.cell(row=summary_row, column=2).value = f"{len(customers)} Customers"
        ws.cell(row=summary_row, column=5).value = total_policy
        ws.cell(row=summary_row, column=5).font = Font(bold=True)
        
        for col in range(1, 7):
            ws.cell(row=summary_row, column=col).fill = PatternFill(start_color="C3E6CB", end_color="C3E6CB", fill_type="solid")
    
    # Auto-size columns
    for col_idx in range(1, 7):
        column_letter = ws.cell(row=2, column=col_idx).column_letter
        max_length = 0
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=col_idx, max_col=col_idx):
            for cell in row:
                if cell.value:
                    try:
                        cell_length = len(str(cell.value))
                        if cell_length > max_length:
                            max_length = cell_length
                    except:
                        pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Format currency column
    for row in range(3, ws.max_row + 1):
        cell = ws.cell(row=row, column=5)
        if cell.value and isinstance(cell.value, (int, float)):
            cell.number_format = '$#,##0.00'
    
    # Save to BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    filename = f"new_face_report_{period}_{today.isoformat()}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/excel/{period}")
async def generate_excel_report(period: str, current_user: dict = Depends(get_current_user)):
    """
    Generate Excel report for weekly, monthly, quarterly, or yearly data.
    Returns Excel file with one row per team member showing totals.
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    # Use Central Time for date calculations
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    if period == "weekly":
        start_date = today - timedelta(days=today.weekday())
        period_name = f"Week of {start_date.strftime('%B %d, %Y')}"
    elif period == "monthly":
        start_date = today.replace(day=1)
        period_name = start_date.strftime('%B %Y')
    elif period == "quarterly":
        quarter = (today.month - 1) // 3
        start_date = today.replace(month=quarter * 3 + 1, day=1)
        period_name = f"Q{quarter + 1} {today.year}"
    elif period == "yearly":
        start_date = today.replace(month=1, day=1)
        period_name = f"Year {today.year}"
    else:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    # Get all subordinates recursively
    async def get_all_team_members(user_id: str):
        members = []
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if user_doc:
            # Convert to dict to ensure it's serializable
            user = dict(user_doc)
            members.append(user)
            subordinates = await db.users.find({"manager_id": user_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
            for sub in subordinates:
                sub_members = await get_all_team_members(sub['id'])
                members.extend(sub_members)
        return members
    
    team_members = await get_all_team_members(current_user['id'])
    
    # Get activities for each team member
    report_data = []
    for member in team_members:
        activities = await db.activities.find({
            "user_id": member['id'],
            "date": {"$gte": start_date.isoformat()}
        }, {"_id": 0}).to_list(1000)
        
        totals = {
            "name": str(member.get('name', 'Unknown')),
            "email": str(member.get('email', '')),
            "role": str(member.get('role', 'unknown')).replace('_', ' ').title(),
            "contacts": float(sum(a.get('contacts', 0) for a in activities)),
            "appointments": float(sum(a.get('appointments', 0) for a in activities)),
            "presentations": float(sum(a.get('presentations', 0) for a in activities)),
            "referrals": int(sum(a.get('referrals', 0) for a in activities)),
            "testimonials": int(sum(a.get('testimonials', 0) for a in activities)),
            "sales": int(sum(a.get('sales', 0) for a in activities)),
            "new_face_sold": float(sum(a.get('new_face_sold', 0) for a in activities)),
            "premium": float(sum(a.get('premium', 0) for a in activities))
        }
        report_data.append(totals)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"{period.capitalize()} Report"
    
    # Add title
    ws.merge_cells('A1:K1')
    title_cell = ws['A1']
    title_cell.value = f"Sales Activity Report - {period_name}"
    title_cell.font = Font(size=16, bold=True, color="FFFFFF")
    title_cell.alignment = Alignment(horizontal='center')
    title_cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    
    # Add headers
    headers = ["Name", "Email", "Role", "Contacts", "Appointments", "Presentations", 
               "Referrals", "Testimonials", "Sales", "New Face Sold", "Total Premium"]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_num)
        cell.value = header
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
        cell.alignment = Alignment(horizontal='center')
    
    # Add data
    for row_num, data in enumerate(report_data, 3):
        ws.cell(row=row_num, column=1).value = data['name']
        ws.cell(row=row_num, column=2).value = data['email']
        ws.cell(row=row_num, column=3).value = data['role']
        ws.cell(row=row_num, column=4).value = data['contacts']
        ws.cell(row=row_num, column=5).value = data['appointments']
        ws.cell(row=row_num, column=6).value = data['presentations']
        ws.cell(row=row_num, column=7).value = data['referrals']
        ws.cell(row=row_num, column=8).value = data['testimonials']
        ws.cell(row=row_num, column=9).value = data['sales']
        ws.cell(row=row_num, column=10).value = data['new_face_sold']
        ws.cell(row=row_num, column=11).value = f"${data['premium']:.2f}"
    
    # Auto-size columns
    for col_idx in range(1, 12):  # 11 columns (A to K)
        column_letter = ws.cell(row=2, column=col_idx).column_letter
        max_length = 0
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=col_idx, max_col=col_idx):
            for cell in row:
                if cell.value:
                    try:
                        cell_length = len(str(cell.value))
                        if cell_length > max_length:
                            max_length = cell_length
                    except:
                        pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    filename = f"sales_report_{period}_{today.isoformat()}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/manager-hierarchy/{manager_id}")
async def get_manager_hierarchy_report(manager_id: str, period: str, current_user: dict = Depends(get_current_user), date: str = None, month: str = None, quarter: str = None, year: str = None):
    """
    Get full hierarchy report for a specific manager.
    Shows the manager + all their direct and indirect reports with totals for the period.
    manager_id: ID of the manager to get hierarchy for
    period: 'daily', 'monthly', 'quarterly', or 'yearly'
    date: ISO format date string for daily reports (YYYY-MM-DD)
    month: Optional - specific month for monthly reports in YYYY-MM format
    quarter: Optional - specific quarter for quarterly reports in YYYY-Q1 format
    year: Optional - specific year for yearly reports in YYYY format
    """
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only Managers can access hierarchy reports")
    
    # Verify the requested manager is in current user's hierarchy
    async def get_all_subordinates(user_id: str):
        members = []
        subordinates = await db.users.find(
            {"manager_id": user_id, "$or": [{"status": "active"}, {"status": {"$exists": False}}]},
            {"_id": 0, "password_hash": 0}
        ).to_list(1000)
        for sub in subordinates:
            members.append(sub)
            sub_members = await get_all_subordinates(sub['id'])
            members.extend(sub_members)
        return members
    
    user_hierarchy = await get_all_subordinates(current_user['id'])
    user_hierarchy.insert(0, current_user)  # Include self
    
    target_manager = None
    for member in user_hierarchy:
        if member['id'] == manager_id:
            target_manager = member
            break
    
    if not target_manager:
        raise HTTPException(status_code=403, detail="Manager not found in your hierarchy")
    
    # Get the target manager's hierarchy
    manager_hierarchy = await get_all_subordinates(manager_id)
    manager_hierarchy.insert(0, target_manager)  # Include the manager themselves
    
    # Calculate date range based on period
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    if period == "daily":
        if date:
            start_date = datetime.strptime(date, '%Y-%m-%d').date()
            period_name = f"Daily - {start_date.strftime('%B %d, %Y')}"
            date_filter = start_date.isoformat()
        else:
            start_date = today
            period_name = f"Daily - {start_date.strftime('%B %d, %Y')}"
            date_filter = start_date.isoformat()
    elif period == "monthly":
        if month:
            # Parse the selected month (YYYY-MM format)
            try:
                year_str, month_num = month.split('-')
                start_date = date_class(int(year_str), int(month_num), 1)
                period_name = f"Month of {start_date.strftime('%B %Y')}"
                date_filter = {"$gte": start_date.isoformat()}
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
        else:
            # Default to current month
            start_date = today.replace(day=1)
            period_name = f"Month of {start_date.strftime('%B %Y')}"
            date_filter = {"$gte": start_date.isoformat()}
    elif period == "quarterly":
        if quarter:
            # Parse the selected quarter (YYYY-Q1 format)
            try:
                year_str, quarter_str = quarter.split('-Q')
                quarter_num = int(quarter_str)
                if quarter_num < 1 or quarter_num > 4:
                    raise ValueError("Quarter must be 1-4")
                start_date = date_class(int(year_str), (quarter_num - 1) * 3 + 1, 1)
                period_name = f"Q{quarter_num} {year_str}"
                date_filter = {"$gte": start_date.isoformat()}
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid quarter format. Use YYYY-Q1")
        else:
            # Default to current quarter
            quarter_num = (today.month - 1) // 3
            start_date = today.replace(month=quarter_num * 3 + 1, day=1)
            period_name = f"Q{quarter_num + 1} {today.year}"
            date_filter = {"$gte": start_date.isoformat()}
    elif period == "yearly":
        if year:
            # Parse the selected year
            try:
                year_num = int(year)
                start_date = date_class(year_num, 1, 1)
                period_name = f"Year {year_num}"
                date_filter = {"$gte": start_date.isoformat()}
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid year format. Use YYYY")
        else:
            # Default to current year
            start_date = today.replace(month=1, day=1)
            period_name = f"Year {today.year}"
            date_filter = {"$gte": start_date.isoformat()}
    else:
        raise HTTPException(status_code=400, detail="Invalid period. Use 'daily', 'monthly', 'quarterly', or 'yearly'")
    
    # Build hierarchy structure with totals
    hierarchy_data = []
    
    for member in manager_hierarchy:
        # Get activities for the period
        if period == "daily":
            activities = await db.activities.find({
                "user_id": member['id'],
                "date": date_filter
            }, {"_id": 0}).to_list(1000)
        else:
            activities = await db.activities.find({
                "user_id": member['id'],
                "date": date_filter
            }, {"_id": 0}).to_list(10000)
        
        # Calculate totals
        if period == "daily":
            # For daily, show the single day's data
            activity = activities[0] if activities else {}
            totals = {
                "contacts": activity.get('contacts', 0),
                "appointments": activity.get('appointments', 0),
                "presentations": activity.get('presentations', 0),
                "referrals": activity.get('referrals', 0),
                "testimonials": activity.get('testimonials', 0),
                "sales": activity.get('sales', 0),
                "new_face_sold": activity.get('new_face_sold', 0),
                "premium": activity.get('premium', 0)
            }
        else:
            # For periods, sum all activities
            totals = {
                "contacts": sum(a.get('contacts', 0) for a in activities),
                "appointments": sum(a.get('appointments', 0) for a in activities),
                "presentations": sum(a.get('presentations', 0) for a in activities),
                "referrals": sum(a.get('referrals', 0) for a in activities),
                "testimonials": sum(a.get('testimonials', 0) for a in activities),
                "sales": sum(a.get('sales', 0) for a in activities),
                "new_face_sold": sum(a.get('new_face_sold', 0) for a in activities),
                "premium": sum(a.get('premium', 0) for a in activities)
            }
        
        # Determine relationship to target manager
        if member['id'] == manager_id:
            relationship = "Manager"
        elif member.get('manager_id') == manager_id:
            relationship = "Direct Report"
        else:
            relationship = "Indirect Report"
        
        hierarchy_data.append({
            "id": member['id'],
            "name": member.get('name', 'Unknown'),
            "email": member.get('email', ''),
            "role": member.get('role', 'unknown').replace('_', ' ').title(),
            "relationship": relationship,
            "manager_id": member.get('manager_id'),
            **totals
        })
    
    return {
        "manager_name": target_manager.get('name', 'Unknown'),
        "manager_role": target_manager.get('role', 'unknown').replace('_', ' ').title(),
        "period": period,
        "period_name": period_name,
        "hierarchy_data": hierarchy_data,
        "total_members": len(hierarchy_data)
    }

@api_router.get("/reports/managers")
async def get_available_managers(current_user: dict = Depends(get_current_user)):
    """
    Get list of managers available for individual reporting.
    Returns all users under the current user's hierarchy.
    """
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only Managers can access manager list")
    
    # Helper function to get all subordinates recursively (exclude archived)
    async def get_all_subordinates(user_id: str):
        members = []
        subordinates = await db.users.find(
            {"manager_id": user_id, "$or": [{"status": "active"}, {"status": {"$exists": False}}]},
            {"_id": 0, "password_hash": 0}
        ).to_list(1000)
        for sub in subordinates:
            members.append(sub)
            sub_members = await get_all_subordinates(sub['id'])
            members.extend(sub_members)
        return members
    
    # Get all subordinates
    team_members = await get_all_subordinates(current_user['id'])
    team_members.insert(0, current_user)  # Include self
    
    # Format for dropdown display
    manager_list = []
    for member in team_members:
        manager_list.append({
            "id": member.get('id'),
            "name": member.get('name', 'Unknown'),
            "email": member.get('email', ''),
            "role": member.get('role', 'unknown').replace('_', ' ').title()
        })
    
    return {"managers": manager_list}

@api_router.get("/reports/daily/{report_type}")
async def get_daily_report(report_type: str, date: str, current_user: dict = Depends(get_current_user), user_id: str = None):
    """
    Get daily report for a specific date.
    report_type: 'individual', 'team', or 'organization'
    date: ISO format date string (YYYY-MM-DD)
    user_id: Optional - specific user ID for individual reports (defaults to all team members)
    Returns JSON data for on-screen viewing
    """
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only Managers (State, Regional, District) can access daily reports")
    
    # Validate date format - keep it simple like other endpoints
    try:
        # Simple validation - just ensure format is correct
        datetime.strptime(date, '%Y-%m-%d')
        report_date = date  # Use the date string directly for querying
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Helper function to get all subordinates recursively (exclude archived)
    async def get_all_subordinates(user_id: str):
        members = []
        subordinates = await db.users.find(
            {"manager_id": user_id, "$or": [{"status": "active"}, {"status": {"$exists": False}}]},
            {"_id": 0, "password_hash": 0}
        ).to_list(1000)
        for sub in subordinates:
            members.append(sub)
            sub_members = await get_all_subordinates(sub['id'])
            members.extend(sub_members)
        return members
    
    if report_type == "individual":
        # Get all team members under current user
        team_members = await get_all_subordinates(current_user['id'])
        team_members.insert(0, current_user)  # Include self
        
        # If user_id specified, filter to just that user
        if user_id:
            # Verify the requested user is in the hierarchy
            target_user = None
            for member in team_members:
                if member['id'] == user_id:
                    target_user = member
                    break
            
            if not target_user:
                raise HTTPException(status_code=403, detail="User not found in your hierarchy")
            
            team_members = [target_user]  # Show only the selected user
        
        report_data = []
        for member in team_members:
            activity = await db.activities.find_one({
                "user_id": member['id'],
                "date": report_date
            }, {"_id": 0})
            
            report_data.append({
                "name": member.get('name', 'Unknown'),
                "email": member.get('email', ''),
                "role": member.get('role', 'unknown').replace('_', ' ').title(),
                "contacts": activity.get('contacts', 0) if activity else 0,
                "appointments": activity.get('appointments', 0) if activity else 0,
                "presentations": activity.get('presentations', 0) if activity else 0,
                "referrals": activity.get('referrals', 0) if activity else 0,
                "testimonials": activity.get('testimonials', 0) if activity else 0,
                "sales": activity.get('sales', 0) if activity else 0,
                "new_face_sold": activity.get('new_face_sold', 0) if activity else 0,
                "premium": activity.get('premium', 0) if activity else 0
            })
        
        return {
            "report_type": "individual",
            "date": report_date,
            "data": report_data,
            "selected_user": user_id
        }
    
    elif report_type == "team":
        # Get direct reports and their teams
        direct_reports = await db.users.find({"manager_id": current_user['id']}, {"_id": 0, "password_hash": 0}).to_list(1000)
        
        # If user_id specified, show that manager's team (not filter direct reports)
        if user_id:
            # Get all subordinates to verify the user is in the hierarchy
            all_subordinates = await get_all_subordinates(current_user['id'])
            all_subordinates.insert(0, current_user)  # Include self
            
            # Verify the requested user is in the hierarchy
            target_manager = None
            for member in all_subordinates:
                if member['id'] == user_id:
                    target_manager = member
                    break
            
            if not target_manager:
                raise HTTPException(status_code=403, detail="Manager not found in your hierarchy")
            
            # Get the target manager's team (their direct reports)
            target_direct_reports = await db.users.find({"manager_id": user_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
            direct_reports = target_direct_reports  # Show the selected manager's direct reports
        
        report_data = []
        
        # If a specific manager is selected, include their individual numbers first
        if user_id and target_manager:
            # Add the manager's individual activity
            manager_activity = await db.activities.find_one({
                "user_id": target_manager['id'],
                "date": report_date
            }, {"_id": 0})
            
            manager_totals = {
                "contacts": manager_activity.get('contacts', 0) if manager_activity else 0,
                "appointments": manager_activity.get('appointments', 0) if manager_activity else 0,
                "presentations": manager_activity.get('presentations', 0) if manager_activity else 0,
                "referrals": manager_activity.get('referrals', 0) if manager_activity else 0,
                "testimonials": manager_activity.get('testimonials', 0) if manager_activity else 0,
                "sales": manager_activity.get('sales', 0) if manager_activity else 0,
                "new_face_sold": manager_activity.get('new_face_sold', 0) if manager_activity else 0,
                "premium": manager_activity.get('premium', 0) if manager_activity else 0
            }
            
            report_data.append({
                "team_name": target_manager.get('name', 'Unknown') + " (Individual)",
                "manager": target_manager.get('name', 'Unknown'),
                "role": target_manager.get('role', 'unknown').replace('_', ' ').title(),
                **manager_totals
            })
        
        # Add team data for direct reports
        for manager in direct_reports:
            # Get all members under this manager
            team_members = await get_all_subordinates(manager['id'])
            team_members.insert(0, manager)  # Include manager
            
            # Aggregate totals for this team
            team_totals = {
                "contacts": 0, "appointments": 0, "presentations": 0,
                "referrals": 0, "testimonials": 0, "sales": 0,
                "new_face_sold": 0, "premium": 0
            }
            
            for member in team_members:
                activity = await db.activities.find_one({
                    "user_id": member['id'],
                    "date": report_date
                }, {"_id": 0})
                
                if activity:
                    team_totals["contacts"] += activity.get('contacts', 0)
                    team_totals["appointments"] += activity.get('appointments', 0)
                    team_totals["presentations"] += activity.get('presentations', 0)
                    team_totals["referrals"] += activity.get('referrals', 0)
                    team_totals["testimonials"] += activity.get('testimonials', 0)
                    team_totals["sales"] += activity.get('sales', 0)
                    team_totals["new_face_sold"] += activity.get('new_face_sold', 0)
                    team_totals["premium"] += activity.get('premium', 0)
            
            report_data.append({
                "team_name": manager.get('name', 'Unknown') + "'s Team",
                "manager": manager.get('name', 'Unknown'),
                "role": manager.get('role', 'unknown').replace('_', ' ').title(),
                **team_totals
            })
        
        return {
            "report_type": "team",
            "date": report_date,
            "data": report_data,
            "selected_user": user_id
        }
    
    elif report_type == "organization":
        # Get all organization members
        all_members = await get_all_subordinates(current_user['id'])
        all_members.insert(0, current_user)  # Include self
        
        # Aggregate organization totals
        org_totals = {
            "contacts": 0, "appointments": 0, "presentations": 0,
            "referrals": 0, "testimonials": 0, "sales": 0,
            "new_face_sold": 0, "premium": 0
        }
        
        for member in all_members:
            activity = await db.activities.find_one({
                "user_id": member['id'],
                "date": report_date
            }, {"_id": 0})
            
            if activity:
                org_totals["contacts"] += activity.get('contacts', 0)
                org_totals["appointments"] += activity.get('appointments', 0)
                org_totals["presentations"] += activity.get('presentations', 0)
                org_totals["referrals"] += activity.get('referrals', 0)
                org_totals["testimonials"] += activity.get('testimonials', 0)
                org_totals["sales"] += activity.get('sales', 0)
                org_totals["new_face_sold"] += activity.get('new_face_sold', 0)
                org_totals["premium"] += activity.get('premium', 0)
        
        return {
            "report_type": "organization",
            "date": report_date,
            "total_members": len(all_members),
            "data": org_totals
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid report type. Use 'individual', 'team', or 'organization'")

@api_router.get("/reports/period/{report_type}")
async def get_period_report(report_type: str, period: str, current_user: dict = Depends(get_current_user), user_id: str = None, month: str = None, quarter: str = None, year: str = None):
    """
    Get period report (monthly, quarterly, yearly) for a specific period.
    report_type: 'individual', 'team', or 'organization'
    period: 'monthly', 'quarterly', or 'yearly'
    user_id: Optional - specific user ID for individual reports (defaults to all team members)
    month: Optional - specific month for monthly reports in YYYY-MM format (defaults to current month)
    quarter: Optional - specific quarter for quarterly reports in YYYY-Q1 format (defaults to current quarter)
    year: Optional - specific year for yearly reports in YYYY format (defaults to current year)
    Returns JSON data for on-screen viewing
    """
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only Managers (State, Regional, District) can access period reports")
    
    # Use Central Time for date calculations
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    # Calculate date range based on period
    if period == "monthly":
        if month:
            # Parse the selected month (YYYY-MM format)
            try:
                year, month_num = month.split('-')
                start_date = date_class(int(year), int(month_num), 1)
                period_name = f"Month of {start_date.strftime('%B %Y')}"
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
        else:
            # Default to current month
            start_date = today.replace(day=1)
            period_name = f"Month of {start_date.strftime('%B %Y')}"
    elif period == "quarterly":
        if quarter:
            # Parse the selected quarter (YYYY-Q1 format)
            try:
                year_str, quarter_str = quarter.split('-Q')
                quarter_num = int(quarter_str)
                if quarter_num < 1 or quarter_num > 4:
                    raise ValueError("Quarter must be 1-4")
                start_date = date_class(int(year_str), (quarter_num - 1) * 3 + 1, 1)
                period_name = f"Q{quarter_num} {year_str}"
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid quarter format. Use YYYY-Q1")
        else:
            # Default to current quarter
            quarter_num = (today.month - 1) // 3
            start_date = today.replace(month=quarter_num * 3 + 1, day=1)
            period_name = f"Q{quarter_num + 1} {today.year}"
    elif period == "yearly":
        if year:
            # Parse the selected year
            try:
                year_num = int(year)
                start_date = date_class(year_num, 1, 1)
                period_name = f"Year {year_num}"
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid year format. Use YYYY")
        else:
            # Default to current year
            start_date = today.replace(month=1, day=1)
            period_name = f"Year {today.year}"
    else:
        raise HTTPException(status_code=400, detail="Invalid period. Use 'monthly', 'quarterly', or 'yearly'")
    
    # Helper function to get all subordinates recursively (exclude archived)
    async def get_all_subordinates(user_id: str):
        members = []
        subordinates = await db.users.find(
            {"manager_id": user_id, "$or": [{"status": "active"}, {"status": {"$exists": False}}]},
            {"_id": 0, "password_hash": 0}
        ).to_list(1000)
        for sub in subordinates:
            members.append(sub)
            sub_members = await get_all_subordinates(sub['id'])
            members.extend(sub_members)
        return members
    
    if report_type == "individual":
        # Get all team members under current user
        team_members = await get_all_subordinates(current_user['id'])
        team_members.insert(0, current_user)  # Include self
        
        # If user_id specified, filter to just that user
        if user_id:
            # Verify the requested user is in the hierarchy
            target_user = None
            for member in team_members:
                if member['id'] == user_id:
                    target_user = member
                    break
            
            if not target_user:
                raise HTTPException(status_code=403, detail="User not found in your hierarchy")
            
            team_members = [target_user]  # Show only the selected user
        
        report_data = []
        for member in team_members:
            activities = await db.activities.find({
                "user_id": member['id'],
                "date": {"$gte": start_date.isoformat()}
            }, {"_id": 0}).to_list(10000)
            
            totals = {
                "name": member.get('name', 'Unknown'),
                "email": member.get('email', ''),
                "role": member.get('role', 'unknown').replace('_', ' ').title(),
                "contacts": sum(a.get('contacts', 0) for a in activities),
                "appointments": sum(a.get('appointments', 0) for a in activities),
                "presentations": sum(a.get('presentations', 0) for a in activities),
                "referrals": sum(a.get('referrals', 0) for a in activities),
                "testimonials": sum(a.get('testimonials', 0) for a in activities),
                "sales": sum(a.get('sales', 0) for a in activities),
                "new_face_sold": sum(a.get('new_face_sold', 0) for a in activities),
                "premium": sum(a.get('premium', 0) for a in activities)
            }
            report_data.append(totals)
        
        return {
            "report_type": "individual",
            "period": period,
            "period_name": period_name,
            "start_date": start_date.isoformat(),
            "data": report_data,
            "selected_user": user_id
        }
    
    elif report_type == "team":
        # Get direct reports and their teams
        direct_reports = await db.users.find({"manager_id": current_user['id']}, {"_id": 0, "password_hash": 0}).to_list(1000)
        
        # If user_id specified, show that manager's team (not filter direct reports)
        if user_id:
            # Get all subordinates to verify the user is in the hierarchy
            all_subordinates = await get_all_subordinates(current_user['id'])
            all_subordinates.insert(0, current_user)  # Include self
            
            # Verify the requested user is in the hierarchy
            target_manager = None
            for member in all_subordinates:
                if member['id'] == user_id:
                    target_manager = member
                    break
            
            if not target_manager:
                raise HTTPException(status_code=403, detail="Manager not found in your hierarchy")
            
            # Get the target manager's team (their direct reports)
            target_direct_reports = await db.users.find({"manager_id": user_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
            direct_reports = target_direct_reports  # Show the selected manager's direct reports
        
        report_data = []
        
        # If a specific manager is selected, include their individual numbers first
        if user_id and target_manager:
            # Add the manager's individual activity
            manager_activities = await db.activities.find({
                "user_id": target_manager['id'],
                "date": {"$gte": start_date.isoformat()}
            }, {"_id": 0}).to_list(10000)
            
            manager_totals = {
                "contacts": sum(a.get('contacts', 0) for a in manager_activities),
                "appointments": sum(a.get('appointments', 0) for a in manager_activities),
                "presentations": sum(a.get('presentations', 0) for a in manager_activities),
                "referrals": sum(a.get('referrals', 0) for a in manager_activities),
                "testimonials": sum(a.get('testimonials', 0) for a in manager_activities),
                "sales": sum(a.get('sales', 0) for a in manager_activities),
                "new_face_sold": sum(a.get('new_face_sold', 0) for a in manager_activities),
                "premium": sum(a.get('premium', 0) for a in manager_activities)
            }
            
            report_data.append({
                "team_name": target_manager.get('name', 'Unknown') + " (Individual)",
                "manager": target_manager.get('name', 'Unknown'),
                "role": target_manager.get('role', 'unknown').replace('_', ' ').title(),
                **manager_totals
            })
        
        # Add team data for direct reports
        for manager in direct_reports:
            # Get all members under this manager
            team_members = await get_all_subordinates(manager['id'])
            team_members.insert(0, manager)  # Include manager
            
            # Aggregate totals for this team
            team_totals = {
                "contacts": 0, "appointments": 0, "presentations": 0,
                "referrals": 0, "testimonials": 0, "sales": 0,
                "new_face_sold": 0, "premium": 0
            }
            
            for member in team_members:
                activities = await db.activities.find({
                    "user_id": member['id'],
                    "date": {"$gte": start_date.isoformat()}
                }, {"_id": 0}).to_list(10000)
                
                for activity in activities:
                    team_totals["contacts"] += activity.get('contacts', 0)
                    team_totals["appointments"] += activity.get('appointments', 0)
                    team_totals["presentations"] += activity.get('presentations', 0)
                    team_totals["referrals"] += activity.get('referrals', 0)
                    team_totals["testimonials"] += activity.get('testimonials', 0)
                    team_totals["sales"] += activity.get('sales', 0)
                    team_totals["new_face_sold"] += activity.get('new_face_sold', 0)
                    team_totals["premium"] += activity.get('premium', 0)
            
            report_data.append({
                "team_name": manager.get('name', 'Unknown') + "'s Team",
                "manager": manager.get('name', 'Unknown'),
                "role": manager.get('role', 'unknown').replace('_', ' ').title(),
                **team_totals
            })
        
        return {
            "report_type": "team",
            "period": period,
            "period_name": period_name,
            "start_date": start_date.isoformat(),
            "data": report_data,
            "selected_user": user_id
        }
    
    elif report_type == "organization":
        # Get all organization members
        all_members = await get_all_subordinates(current_user['id'])
        all_members.insert(0, current_user)  # Include self
        
        # Aggregate organization totals
        org_totals = {
            "contacts": 0, "appointments": 0, "presentations": 0,
            "referrals": 0, "testimonials": 0, "sales": 0,
            "new_face_sold": 0, "premium": 0
        }
        
        for member in all_members:
            activities = await db.activities.find({
                "user_id": member['id'],
                "date": {"$gte": start_date.isoformat()}
            }, {"_id": 0}).to_list(10000)
            
            for activity in activities:
                org_totals["contacts"] += activity.get('contacts', 0)
                org_totals["appointments"] += activity.get('appointments', 0)
                org_totals["presentations"] += activity.get('presentations', 0)
                org_totals["referrals"] += activity.get('referrals', 0)
                org_totals["testimonials"] += activity.get('testimonials', 0)
                org_totals["sales"] += activity.get('sales', 0)
                org_totals["new_face_sold"] += activity.get('new_face_sold', 0)
                org_totals["premium"] += activity.get('premium', 0)
        
        return {
            "report_type": "organization",
            "period": period,
            "period_name": period_name,
            "start_date": start_date.isoformat(),
            "total_members": len(all_members),
            "data": org_totals
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid report type. Use 'individual', 'team', or 'organization'")

@api_router.get("/reports/period/excel/{report_type}")
async def download_period_report_excel(report_type: str, period: str, current_user: dict = Depends(get_current_user), user_id: str = None, month: str = None, quarter: str = None, year: str = None):
    """
    Download period report (monthly, quarterly, yearly) as Excel file.
    report_type: 'individual', 'team', or 'organization'
    period: 'monthly', 'quarterly', or 'yearly'
    user_id: Optional - specific user ID for individual/team reports
    month: Optional - specific month for monthly reports in YYYY-MM format
    quarter: Optional - specific quarter for quarterly reports in YYYY-Q1 format
    year: Optional - specific year for yearly reports in YYYY format
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only Managers (State, Regional, District) can download period reports")
    
    # Get the report data with all parameters
    report_json = await get_period_report(report_type, period, current_user, user_id, month, quarter, year)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"{period.capitalize()} {report_type.capitalize()}"
    
    # Add title
    period_name = report_json.get('period_name', f'{period.capitalize()} Report')
    
    ws.merge_cells('A1:K1')
    title_cell = ws['A1']
    title_cell.value = f"{period.capitalize()} {report_type.capitalize()} Report - {period_name}"
    title_cell.font = Font(size=16, bold=True, color="FFFFFF")
    title_cell.alignment = Alignment(horizontal='center')
    title_cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    
    if report_type == "individual":
        # Add headers
        headers = ["Name", "Email", "Role", "Contacts", "Appointments", "Presentations", 
                   "Referrals", "Testimonials", "Sales", "New Face Sold", "Total Premium"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center')
        
        # Add data
        for row_num, data in enumerate(report_json['data'], 3):
            ws.cell(row=row_num, column=1).value = data['name']
            ws.cell(row=row_num, column=2).value = data['email']
            ws.cell(row=row_num, column=3).value = data['role']
            ws.cell(row=row_num, column=4).value = data['contacts']
            ws.cell(row=row_num, column=5).value = data['appointments']
            ws.cell(row=row_num, column=6).value = data['presentations']
            ws.cell(row=row_num, column=7).value = data['referrals']
            ws.cell(row=row_num, column=8).value = data['testimonials']
            ws.cell(row=row_num, column=9).value = data['sales']
            ws.cell(row=row_num, column=10).value = data['new_face_sold']
            ws.cell(row=row_num, column=11).value = data['premium']
        
        # Add totals row for individual reports
        if report_json['data']:
            totals_row = len(report_json['data']) + 4  # +3 for headers, +1 for spacing
            ws.cell(row=totals_row, column=1).value = "TOTALS"
            ws.cell(row=totals_row, column=1).font = Font(bold=True)
            ws.cell(row=totals_row, column=1).fill = PatternFill(start_color="FFE6E6", end_color="FFE6E6", fill_type="solid")
            
            # Calculate totals
            total_contacts = sum(data['contacts'] for data in report_json['data'])
            total_appointments = sum(data['appointments'] for data in report_json['data'])
            total_presentations = sum(data['presentations'] for data in report_json['data'])
            total_referrals = sum(data['referrals'] for data in report_json['data'])
            total_testimonials = sum(data['testimonials'] for data in report_json['data'])
            total_sales = sum(data['sales'] for data in report_json['data'])
            total_new_face = sum(data['new_face_sold'] for data in report_json['data'])
            total_premium = sum(data['premium'] for data in report_json['data'])
            
            ws.cell(row=totals_row, column=4).value = total_contacts
            ws.cell(row=totals_row, column=4).font = Font(bold=True)
            ws.cell(row=totals_row, column=5).value = total_appointments
            ws.cell(row=totals_row, column=5).font = Font(bold=True)
            ws.cell(row=totals_row, column=6).value = total_presentations
            ws.cell(row=totals_row, column=6).font = Font(bold=True)
            ws.cell(row=totals_row, column=7).value = total_referrals
            ws.cell(row=totals_row, column=7).font = Font(bold=True)
            ws.cell(row=totals_row, column=8).value = total_testimonials
            ws.cell(row=totals_row, column=8).font = Font(bold=True)
            ws.cell(row=totals_row, column=9).value = total_sales
            ws.cell(row=totals_row, column=9).font = Font(bold=True)
            ws.cell(row=totals_row, column=10).value = total_new_face
            ws.cell(row=totals_row, column=10).font = Font(bold=True)
            ws.cell(row=totals_row, column=11).value = total_premium
            ws.cell(row=totals_row, column=11).font = Font(bold=True)
    
    elif report_type == "team":
        # Add headers
        headers = ["Team Name", "Manager", "Role", "Contacts", "Appointments", "Presentations", 
                   "Referrals", "Testimonials", "Sales", "New Face Sold", "Total Premium"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center')
        
        # Add data
        for row_num, data in enumerate(report_json['data'], 3):
            ws.cell(row=row_num, column=1).value = data['team_name']
            ws.cell(row=row_num, column=2).value = data['manager']
            ws.cell(row=row_num, column=3).value = data['role']
            ws.cell(row=row_num, column=4).value = data['contacts']
            ws.cell(row=row_num, column=5).value = data['appointments']
            ws.cell(row=row_num, column=6).value = data['presentations']
            ws.cell(row=row_num, column=7).value = data['referrals']
            ws.cell(row=row_num, column=8).value = data['testimonials']
            ws.cell(row=row_num, column=9).value = data['sales']
            ws.cell(row=row_num, column=10).value = data['new_face_sold']
            ws.cell(row=row_num, column=11).value = data['premium']
        
        # Add totals row for team reports
        if report_json['data']:
            totals_row = len(report_json['data']) + 4  # +3 for headers, +1 for spacing
            ws.cell(row=totals_row, column=1).value = "TOTALS"
            ws.cell(row=totals_row, column=1).font = Font(bold=True)
            ws.cell(row=totals_row, column=1).fill = PatternFill(start_color="FFE6E6", end_color="FFE6E6", fill_type="solid")
            
            # Calculate totals
            total_contacts = sum(data['contacts'] for data in report_json['data'])
            total_appointments = sum(data['appointments'] for data in report_json['data'])
            total_presentations = sum(data['presentations'] for data in report_json['data'])
            total_referrals = sum(data['referrals'] for data in report_json['data'])
            total_testimonials = sum(data['testimonials'] for data in report_json['data'])
            total_sales = sum(data['sales'] for data in report_json['data'])
            total_new_face = sum(data['new_face_sold'] for data in report_json['data'])
            total_premium = sum(data['premium'] for data in report_json['data'])
            
            ws.cell(row=totals_row, column=4).value = total_contacts
            ws.cell(row=totals_row, column=4).font = Font(bold=True)
            ws.cell(row=totals_row, column=5).value = total_appointments
            ws.cell(row=totals_row, column=5).font = Font(bold=True)
            ws.cell(row=totals_row, column=6).value = total_presentations
            ws.cell(row=totals_row, column=6).font = Font(bold=True)
            ws.cell(row=totals_row, column=7).value = total_referrals
            ws.cell(row=totals_row, column=7).font = Font(bold=True)
            ws.cell(row=totals_row, column=8).value = total_testimonials
            ws.cell(row=totals_row, column=8).font = Font(bold=True)
            ws.cell(row=totals_row, column=9).value = total_sales
            ws.cell(row=totals_row, column=9).font = Font(bold=True)
            ws.cell(row=totals_row, column=10).value = total_new_face
            ws.cell(row=totals_row, column=10).font = Font(bold=True)
            ws.cell(row=totals_row, column=11).value = total_premium
            ws.cell(row=totals_row, column=11).font = Font(bold=True)
    
    elif report_type == "organization":
        # Add headers
        headers = ["Metric", "Total"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center')
        
        # Add data
        metrics = [
            ("Total Members", report_json['total_members']),
            ("Contacts", report_json['data']['contacts']),
            ("Appointments", report_json['data']['appointments']),
            ("Presentations", report_json['data']['presentations']),
            ("Referrals", report_json['data']['referrals']),
            ("Testimonials", report_json['data']['testimonials']),
            ("Sales", report_json['data']['sales']),
            ("New Face Sold", report_json['data']['new_face_sold']),
            ("Total Premium", report_json['data']['premium'])
        ]
        
        for row_num, (metric, value) in enumerate(metrics, 3):
            ws.cell(row=row_num, column=1).value = metric
            ws.cell(row=row_num, column=2).value = value
    
    # Auto-adjust column widths
    for col_idx in range(1, ws.max_column + 1):
        max_length = 0
        column_letter = ws.cell(row=2, column=col_idx).column_letter
        for row in range(1, ws.max_row + 1):
            cell = ws.cell(row=row, column=col_idx)
            try:
                if cell.value and len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    filename = f"{period}_{report_type}_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/daily/excel/{report_type}")
async def download_daily_report_excel(report_type: str, date: str, current_user: dict = Depends(get_current_user), user_id: str = None):
    """
    Download daily report as Excel file.
    report_type: 'individual', 'team', or 'organization'
    date: ISO format date string (YYYY-MM-DD)
    user_id: Optional - specific user ID for individual/team reports
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only Managers (State, Regional, District) can download daily reports")
    
    # Get the report data with all parameters
    report_json = await get_daily_report(report_type, date, current_user, user_id)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = f"Daily {report_type.capitalize()}"
    
    # Add title
    report_date_obj = datetime.fromisoformat(date).date()
    date_str = report_date_obj.strftime('%B %d, %Y')
    
    ws.merge_cells('A1:K1')
    title_cell = ws['A1']
    title_cell.value = f"Daily {report_type.capitalize()} Report - {date_str}"
    title_cell.font = Font(size=16, bold=True, color="FFFFFF")
    title_cell.alignment = Alignment(horizontal='center')
    title_cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    
    if report_type == "individual":
        # Add headers
        headers = ["Name", "Email", "Role", "Contacts", "Appointments", "Presentations", 
                   "Referrals", "Testimonials", "Sales", "New Face Sold", "Total Premium"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center')
        
        # Add data
        for row_num, data in enumerate(report_json['data'], 3):
            ws.cell(row=row_num, column=1).value = data['name']
            ws.cell(row=row_num, column=2).value = data['email']
            ws.cell(row=row_num, column=3).value = data['role']
            ws.cell(row=row_num, column=4).value = data['contacts']
            ws.cell(row=row_num, column=5).value = data['appointments']
            ws.cell(row=row_num, column=6).value = data['presentations']
            ws.cell(row=row_num, column=7).value = data['referrals']
            ws.cell(row=row_num, column=8).value = data['testimonials']
            ws.cell(row=row_num, column=9).value = data['sales']
            ws.cell(row=row_num, column=10).value = data['new_face_sold']
            ws.cell(row=row_num, column=11).value = data['premium']
        
        # Add totals row for individual reports
        if report_json['data']:
            totals_row = len(report_json['data']) + 4  # +3 for headers, +1 for spacing
            ws.cell(row=totals_row, column=1).value = "TOTALS"
            ws.cell(row=totals_row, column=1).font = Font(bold=True)
            ws.cell(row=totals_row, column=1).fill = PatternFill(start_color="FFE6E6", end_color="FFE6E6", fill_type="solid")
            
            # Calculate totals
            total_contacts = sum(data['contacts'] for data in report_json['data'])
            total_appointments = sum(data['appointments'] for data in report_json['data'])
            total_presentations = sum(data['presentations'] for data in report_json['data'])
            total_referrals = sum(data['referrals'] for data in report_json['data'])
            total_testimonials = sum(data['testimonials'] for data in report_json['data'])
            total_sales = sum(data['sales'] for data in report_json['data'])
            total_new_face = sum(data['new_face_sold'] for data in report_json['data'])
            total_premium = sum(data['premium'] for data in report_json['data'])
            
            ws.cell(row=totals_row, column=4).value = total_contacts
            ws.cell(row=totals_row, column=4).font = Font(bold=True)
            ws.cell(row=totals_row, column=5).value = total_appointments
            ws.cell(row=totals_row, column=5).font = Font(bold=True)
            ws.cell(row=totals_row, column=6).value = total_presentations
            ws.cell(row=totals_row, column=6).font = Font(bold=True)
            ws.cell(row=totals_row, column=7).value = total_referrals
            ws.cell(row=totals_row, column=7).font = Font(bold=True)
            ws.cell(row=totals_row, column=8).value = total_testimonials
            ws.cell(row=totals_row, column=8).font = Font(bold=True)
            ws.cell(row=totals_row, column=9).value = total_sales
            ws.cell(row=totals_row, column=9).font = Font(bold=True)
            ws.cell(row=totals_row, column=10).value = total_new_face
            ws.cell(row=totals_row, column=10).font = Font(bold=True)
            ws.cell(row=totals_row, column=11).value = total_premium
            ws.cell(row=totals_row, column=11).font = Font(bold=True)
    
    elif report_type == "team":
        # Add headers
        headers = ["Team Name", "Manager", "Role", "Contacts", "Appointments", "Presentations", 
                   "Referrals", "Testimonials", "Sales", "New Face Sold", "Total Premium"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center')
        
        # Add data
        for row_num, data in enumerate(report_json['data'], 3):
            ws.cell(row=row_num, column=1).value = data['team_name']
            ws.cell(row=row_num, column=2).value = data['manager']
            ws.cell(row=row_num, column=3).value = data['role']
            ws.cell(row=row_num, column=4).value = data['contacts']
            ws.cell(row=row_num, column=5).value = data['appointments']
            ws.cell(row=row_num, column=6).value = data['presentations']
            ws.cell(row=row_num, column=7).value = data['referrals']
            ws.cell(row=row_num, column=8).value = data['testimonials']
            ws.cell(row=row_num, column=9).value = data['sales']
            ws.cell(row=row_num, column=10).value = data['new_face_sold']
            ws.cell(row=row_num, column=11).value = data['premium']
        
        # Add totals row for team reports
        if report_json['data']:
            totals_row = len(report_json['data']) + 4  # +3 for headers, +1 for spacing
            ws.cell(row=totals_row, column=1).value = "TOTALS"
            ws.cell(row=totals_row, column=1).font = Font(bold=True)
            ws.cell(row=totals_row, column=1).fill = PatternFill(start_color="FFE6E6", end_color="FFE6E6", fill_type="solid")
            
            # Calculate totals
            total_contacts = sum(data['contacts'] for data in report_json['data'])
            total_appointments = sum(data['appointments'] for data in report_json['data'])
            total_presentations = sum(data['presentations'] for data in report_json['data'])
            total_referrals = sum(data['referrals'] for data in report_json['data'])
            total_testimonials = sum(data['testimonials'] for data in report_json['data'])
            total_sales = sum(data['sales'] for data in report_json['data'])
            total_new_face = sum(data['new_face_sold'] for data in report_json['data'])
            total_premium = sum(data['premium'] for data in report_json['data'])
            
            ws.cell(row=totals_row, column=4).value = total_contacts
            ws.cell(row=totals_row, column=4).font = Font(bold=True)
            ws.cell(row=totals_row, column=5).value = total_appointments
            ws.cell(row=totals_row, column=5).font = Font(bold=True)
            ws.cell(row=totals_row, column=6).value = total_presentations
            ws.cell(row=totals_row, column=6).font = Font(bold=True)
            ws.cell(row=totals_row, column=7).value = total_referrals
            ws.cell(row=totals_row, column=7).font = Font(bold=True)
            ws.cell(row=totals_row, column=8).value = total_testimonials
            ws.cell(row=totals_row, column=8).font = Font(bold=True)
            ws.cell(row=totals_row, column=9).value = total_sales
            ws.cell(row=totals_row, column=9).font = Font(bold=True)
            ws.cell(row=totals_row, column=10).value = total_new_face
            ws.cell(row=totals_row, column=10).font = Font(bold=True)
            ws.cell(row=totals_row, column=11).value = total_premium
            ws.cell(row=totals_row, column=11).font = Font(bold=True)
    
    elif report_type == "organization":
        # Add headers
        headers = ["Metric", "Total"]
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center')
        
        # Add data
        metrics = [
            ("Total Members", report_json['total_members']),
            ("Contacts", report_json['data']['contacts']),
            ("Appointments", report_json['data']['appointments']),
            ("Presentations", report_json['data']['presentations']),
            ("Referrals", report_json['data']['referrals']),
            ("Testimonials", report_json['data']['testimonials']),
            ("Sales", report_json['data']['sales']),
            ("New Face Sold", report_json['data']['new_face_sold']),
            ("Total Premium", report_json['data']['premium'])
        ]
        
        for row_num, (metric, value) in enumerate(metrics, 3):
            ws.cell(row=row_num, column=1).value = metric
            ws.cell(row=row_num, column=2).value = value
    
    # Auto-adjust column widths
    for col_idx in range(1, ws.max_column + 1):
        max_length = 0
        column_letter = ws.cell(row=2, column=col_idx).column_letter
        for row in range(1, ws.max_row + 1):
            cell = ws.cell(row=row, column=col_idx)
            try:
                if cell.value and len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    filename = f"daily_{report_type}_report_{date}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/admin/diagnostic")
async def diagnostic(current_user: dict = Depends(get_current_user)):
    """Diagnostic endpoint to check database state"""
    if current_user['role'] != 'state_manager':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from datetime import date
    from pytz import timezone as pytz_timezone
    
    # Get today in Central Time
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date().isoformat()
    
    # Get counts
    user_count = await db.users.count_documents({})
    activity_count = await db.activities.count_documents({})
    today_activity_count = await db.activities.count_documents({"date": today})
    
    # Get current user's activities
    my_activities = await db.activities.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    my_today = [a for a in my_activities if a.get('date') == today]
    
    # Get my subordinates
    subordinates = await db.users.find({"manager_id": current_user['id']}, {"_id": 0, "name": 1, "id": 1}).to_list(100)
    
    return {
        "database": os.getenv('DB_NAME', 'unknown'),
        "today": today,
        "today_central_time": f"{today} (America/Chicago)",
        "counts": {
            "total_users": user_count,
            "total_activities": activity_count,
            "activities_for_today": today_activity_count
        },
        "current_user": {
            "name": current_user['name'],
            "id": current_user['id'],
            "total_activities": len(my_activities),
            "activities_today": len(my_today),
            "today_data": {
                "contacts": my_today[0].get('contacts', 0),
                "appointments": my_today[0].get('appointments', 0),
                "premium": my_today[0].get('premium', 0)
            } if my_today else None
        },
        "subordinates_count": len(subordinates),
        "subordinates": [s['name'] for s in subordinates]
    }

@api_router.post("/admin/populate-todays-activities")
async def populate_todays_activities(current_user: dict = Depends(get_current_user)):
    """
    Admin endpoint to populate today's activities for all users.
    Run this ONCE after deployment if daily rollup shows zeros.
    Only accessible to state_manager role.
    """
    if current_user['role'] != 'state_manager':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from datetime import date
    from pytz import timezone as pytz_timezone
    import uuid
    
    # Get today in Central Time
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date().isoformat()
    
    # Get all users
    all_users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    added_count = 0
    for user in all_users:
        # Check if activity exists for today
        existing = await db.activities.find_one({"user_id": user['id'], "date": today})
        
        if not existing:
            # Add today's activity with sample data
            activity = {
                "id": str(uuid.uuid4()),
                "user_id": user['id'],
                "date": today,
                "contacts": 10.0,
                "appointments": 5.0,
                "presentations": 3.0,
                "referrals": 2,
                "testimonials": 1,
                "sales": 1,
                "new_face_sold": 1,
                "premium": 1000.00,
                "created_at": datetime.now(timezone.utc),
                "edited_by": user['id'],
                "edited_at": datetime.now(timezone.utc)
            }
            
            await db.activities.insert_one(activity)
            added_count += 1
    
    return {
        "message": f"Successfully added {added_count} activities for today ({today})",
        "date": today,
        "activities_added": added_count,
        "total_users": len(all_users)
    }

@api_router.post("/auth/reset-spencer-password")
async def reset_spencer_password():
    """One-time endpoint to reset Spencer's password in production"""
    import bcrypt
    
    email = "spencer.sudbeck@pmagent.net"
    new_password = "Bizlink25"
    
    # Hash the new password
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update the user's password and add username
    result = await db.users.update_one(
        {"email": email},
        {"$set": {
            "password_hash": password_hash,
            "username": "spencer.sudbeck"
        }}
    )
    
    if result.modified_count > 0:
        return {"message": "Password reset successful", "email": email}
    else:
        raise HTTPException(status_code=404, detail="User not found or no changes made")

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    # Try to find user by email first, then by username
    login_identifier = login_data.email.strip()  # Strip whitespace
    
    # Check if it looks like an email (contains @)
    if '@' in login_identifier:
        user = await db.users.find_one({"email": login_identifier}, {"_id": 0})
    else:
        # Try to find by username
        user = await db.users.find_one({"username": login_identifier}, {"_id": 0})
        
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is archived
    if user.get('status') == 'archived':
        raise HTTPException(status_code=403, detail="Account is archived. Please contact your administrator.")
    
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

@api_router.post("/auth/change-password")
async def change_password(password_request: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    """
    Change user's password.
    Requires current password verification and sets new password.
    """
    try:
        # Get the user's current password hash from database
        user = await db.users.find_one({"id": current_user['id']})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not bcrypt.checkpw(password_request.current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Validate new password (basic validation)
        if len(password_request.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
        
        # Hash the new password
        salt = bcrypt.gensalt()
        new_password_hash = bcrypt.hashpw(password_request.new_password.encode('utf-8'), salt)
        
        # Update password in database
        await db.users.update_one(
            {"id": current_user['id']},
            {"$set": {"password_hash": new_password_hash.decode('utf-8')}}
        )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

@api_router.post("/auth/admin-reset-password")
async def admin_reset_password(reset_request: PasswordResetRequest, current_user: dict = Depends(get_current_user)):
    """
    Admin reset password for team members.
    Only State Managers can reset passwords for users in their hierarchy.
    """
    try:
        # Only State Managers can reset passwords
        if current_user['role'] != 'state_manager':
            raise HTTPException(status_code=403, detail="Only State Managers can reset passwords")
        
        # Helper function to get all subordinates recursively
        async def get_all_subordinates(user_id: str):
            members = []
            subordinates = await db.users.find({"manager_id": user_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
            for sub in subordinates:
                members.append(sub)
                sub_members = await get_all_subordinates(sub['id'])
                members.extend(sub_members)
            return members
        
        # Get all users under current user's hierarchy
        all_subordinates = await get_all_subordinates(current_user['id'])
        all_subordinates.insert(0, current_user)  # Include self
        
        # Find the target user
        target_user = None
        for member in all_subordinates:
            if member['id'] == reset_request.user_id:
                target_user = member
                break
        
        if not target_user:
            raise HTTPException(status_code=403, detail="User not found in your hierarchy")
        
        # Validate new password (basic validation)
        if len(reset_request.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
        
        # Hash the new password
        salt = bcrypt.gensalt()
        new_password_hash = bcrypt.hashpw(reset_request.new_password.encode('utf-8'), salt)
        
        # Update password in database
        await db.users.update_one(
            {"id": reset_request.user_id},
            {"$set": {"password_hash": new_password_hash.decode('utf-8')}}
        )
        
        return {
            "message": f"Password reset successfully for {target_user.get('name', 'user')}",
            "user_name": target_user.get('name', 'Unknown'),
            "user_email": target_user.get('email', 'Unknown')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")

@api_router.post("/auth/forgot-password")
async def forgot_password(forgot_request: ForgotPasswordRequest):
    """
    Generate temporary password for users who forgot their password.
    Since we don't have email service, generates a temporary password that admins can share.
    """
    try:
        # Check if user exists
        user = await db.users.find_one({"email": forgot_request.email})
        if not user:
            # Don't reveal if user exists or not for security
            return {"message": "If the email exists, password reset instructions would be sent"}
        
        # Generate a temporary password
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        # Hash the temporary password
        salt = bcrypt.gensalt()
        temp_password_hash = bcrypt.hashpw(temp_password.encode('utf-8'), salt)
        
        # Update user with temporary password
        await db.users.update_one(
            {"email": forgot_request.email},
            {"$set": {"password_hash": temp_password_hash.decode('utf-8')}}
        )
        
        return {
            "message": "Temporary password generated",
            "temporary_password": temp_password,
            "user_name": user.get('name', 'Unknown'),
            "instructions": "Use this temporary password to login, then change it immediately using the Change Password feature"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate temporary password: {str(e)}")
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
    
    # Use Central Time for date calculations
    if user_date:
        today = datetime.strptime(user_date, '%Y-%m-%d').date()
    else:
        central_tz = pytz_timezone('America/Chicago')
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

@api_router.get("/team/week-dates")
async def get_week_dates(current_user: dict = Depends(get_current_user)):
    """
    Get the current week's date range in Central Time for frontend use.
    Returns Monday through Sunday dates for the current week.
    """
    # Use Central Time for date calculations
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    # Calculate Monday of current week
    monday = today - timedelta(days=today.weekday())
    
    # Generate all 7 days of the week
    week_dates = []
    days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    for i in range(7):
        current_day = monday + timedelta(days=i)
        week_dates.append({
            "date": current_day.isoformat(),
            "day_name": days_of_week[i],
            "is_today": current_day == today
        })
    
    return {
        "week_dates": week_dates,
        "week_start": monday.isoformat(),
        "today": today.isoformat()
    }

@api_router.get("/team/hierarchy/{period}")
async def get_team_hierarchy(period: str, current_user: dict = Depends(get_current_user), user_date: str = None):
    from datetime import timedelta
    
    # Use Central Time for date calculations
    if user_date:
        today = datetime.strptime(user_date, '%Y-%m-%d').date()
    else:
        central_tz = pytz_timezone('America/Chicago')
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
        
        # Debug logging
        print(f"DEBUG build_hierarchy: User={user.get('name')} | Activities found={len(activities)} | Period={period} | Start date={start_date.isoformat()}")
        
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
        
        print(f"DEBUG own_stats: Contacts={own_stats['contacts']}, Appointments={own_stats['appointments']}, Premium={own_stats['premium']}")
        
        # Get subordinates and build their hierarchies (exclude archived users)
        subordinates = await db.users.find(
            {"manager_id": user_id, "$or": [{"status": "active"}, {"status": {"$exists": False}}]},
            {"_id": 0}
        ).to_list(1000)
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
                print(f"DEBUG rollup: Adding child {child_hierarchy.get('name')} stats - Contacts={child_hierarchy['stats']['contacts']}")
                rolled_up_stats["contacts"] += child_hierarchy["stats"]["contacts"]
                rolled_up_stats["appointments"] += child_hierarchy["stats"]["appointments"]
                rolled_up_stats["presentations"] += child_hierarchy["stats"]["presentations"]
                rolled_up_stats["referrals"] += child_hierarchy["stats"]["referrals"]
                rolled_up_stats["testimonials"] += child_hierarchy["stats"]["testimonials"]
                rolled_up_stats["sales"] += child_hierarchy["stats"]["sales"]
                rolled_up_stats["new_face_sold"] += child_hierarchy["stats"]["new_face_sold"]
                rolled_up_stats["premium"] += child_hierarchy["stats"]["premium"]
        
        print(f"DEBUG final rolled_up_stats for {user.get('name')}: Contacts={rolled_up_stats['contacts']}, Premium={rolled_up_stats['premium']}")
        
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

# Debug endpoint to check for duplicates
@api_router.get("/debug/user-activities/{user_id}")
async def debug_user_activities(user_id: str, current_user: dict = Depends(get_current_user)):
    """Debug endpoint to check a user's activities for duplicates"""
    subordinates = await get_all_subordinates(current_user['id'])
    
    if user_id not in subordinates and user_id != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    
    # Get all activities
    activities = await db.activities.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Check for duplicates by date
    date_counts = {}
    for activity in activities:
        date = activity['date']
        if date not in date_counts:
            date_counts[date] = []
        date_counts[date].append({
            "id": activity['id'],
            "presentations": activity.get('presentations', 0),
            "premium": activity.get('premium', 0),
            "edited_by": activity.get('edited_by'),
            "created_at": activity.get('created_at')
        })
    
    duplicates = {date: acts for date, acts in date_counts.items() if len(acts) > 1}
    
    return {
        "user": user,
        "total_activities": len(activities),
        "activities_by_date": date_counts,
        "duplicates": duplicates,
        "has_duplicates": len(duplicates) > 0
    }

# Cleanup endpoint to remove duplicates for a user
@api_router.post("/debug/cleanup-user-duplicates/{user_id}")
async def cleanup_user_duplicates(user_id: str, current_user: dict = Depends(get_current_user)):
    """Remove duplicate activities for a user, keeping the most recent one"""
    subordinates = await get_all_subordinates(current_user['id'])
    
    if user_id not in subordinates and user_id != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all activities for this user
    activities = await db.activities.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Group by date
    date_groups = {}
    for activity in activities:
        date = activity['date']
        if date not in date_groups:
            date_groups[date] = []
        date_groups[date].append(activity)
    
    # Find and remove duplicates
    deleted_count = 0
    cleaned_dates = []
    
    for date, acts in date_groups.items():
        if len(acts) > 1:
            # Sort by edited_at (most recent first), then created_at
            sorted_acts = sorted(acts, key=lambda x: (x.get('edited_at') or x.get('created_at'), x.get('created_at')), reverse=True)
            
            # Keep the first (most recent), delete the rest
            keep = sorted_acts[0]
            delete_ids = [a['id'] for a in sorted_acts[1:]]
            
            result = await db.activities.delete_many({"id": {"$in": delete_ids}})
            deleted_count += result.deleted_count
            cleaned_dates.append({
                "date": date,
                "kept": keep['id'],
                "deleted": delete_ids,
                "deleted_count": result.deleted_count
            })
    
    return {
        "user_id": user_id,
        "total_deleted": deleted_count,
        "dates_cleaned": cleaned_dates,
        "message": f"Removed {deleted_count} duplicate activities"
    }

# Cleanup ALL duplicates in the system (manager only)
@api_router.post("/debug/cleanup-all-duplicates")
async def cleanup_all_duplicates(current_user: dict = Depends(get_current_user)):
    """Remove all duplicate activities in the system (keeps most recent)"""
    # Get all subordinates
    subordinate_ids = await get_all_subordinates(current_user['id'])
    
    # Get all activities for subordinates
    activities = await db.activities.find({"user_id": {"$in": subordinate_ids}}, {"_id": 0}).to_list(10000)
    
    # Group by user_id and date
    groups = {}
    for activity in activities:
        key = (activity['user_id'], activity['date'])
        if key not in groups:
            groups[key] = []
        groups[key].append(activity)
    
    # Find and remove duplicates
    total_deleted = 0
    users_cleaned = {}
    
    for (user_id, date), acts in groups.items():
        if len(acts) > 1:
            # Sort by edited_at (most recent first), then created_at
            sorted_acts = sorted(acts, key=lambda x: (x.get('edited_at') or x.get('created_at'), x.get('created_at')), reverse=True)
            
            # Keep the first (most recent), delete the rest
            keep = sorted_acts[0]
            delete_ids = [a['id'] for a in sorted_acts[1:]]
            
            result = await db.activities.delete_many({"id": {"$in": delete_ids}})
            total_deleted += result.deleted_count
            
            if user_id not in users_cleaned:
                user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
                users_cleaned[user_id] = {
                    "name": user['name'] if user else "Unknown",
                    "dates_cleaned": []
                }
            users_cleaned[user_id]["dates_cleaned"].append(date)
    
    return {
        "total_deleted": total_deleted,
        "users_affected": len(users_cleaned),
        "details": users_cleaned,
        "message": f"Removed {total_deleted} duplicate activities across {len(users_cleaned)} users"
    }

# Delete ALL activities for a specific user (nuclear option)
@api_router.delete("/debug/delete-all-user-activities/{user_id}")
async def delete_all_user_activities(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete ALL activities for a specific user (use with caution!)"""
    subordinates = await get_all_subordinates(current_user['id'])
    
    if user_id not in subordinates and user_id != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get user info first
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Count activities before deletion
    count = await db.activities.count_documents({"user_id": user_id})
    
    # Delete ALL activities
    result = await db.activities.delete_many({"user_id": user_id})
    
    return {
        "user": user,
        "activities_deleted": result.deleted_count,
        "message": f"Deleted all {result.deleted_count} activities for {user['name']}"
    }

# Leaderboard
@api_router.get("/leaderboard/{period}")
async def get_leaderboard(period: str, current_user: dict = Depends(get_current_user), user_date: str = None):
    from datetime import timedelta
    
    # Use Central Time for date calculations
    if user_date:
        today = datetime.strptime(user_date, '%Y-%m-%d').date()
    else:
        central_tz = pytz_timezone('America/Chicago')
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
    
    # Get ALL users in the organization (find the root state manager)
    # First, traverse up to find the top-level manager
    current_manager = current_user
    while current_manager.get('manager_id'):
        parent = await db.users.find_one({"id": current_manager['manager_id']}, {"_id": 0})
        if parent:
            current_manager = parent
        else:
            break
    
    # Now get all users under the top manager (entire organization)
    all_user_ids = await get_all_subordinates(current_manager['id'])
    
    # Get all users info
    users = await db.users.find({"id": {"$in": all_user_ids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    user_dict = {u['id']: u for u in users}
    
    # Get all activities for the period for the ENTIRE organization
    activities = await db.activities.find({
        "user_id": {"$in": all_user_ids},
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
                "referrals": 0,
                "testimonials": 0,
                "new_face_sold": 0,
                "premium": 0.0
            }
        user_stats[uid]['presentations'] += activity['presentations']
        user_stats[uid]['referrals'] += activity['referrals']
        user_stats[uid]['testimonials'] += activity['testimonials']
        user_stats[uid]['new_face_sold'] += activity['new_face_sold']
        user_stats[uid]['premium'] += activity['premium']
    
    # Create leaderboards for each category - Top 5 from ENTIRE organization
    leaderboard = {
        "presentations": sorted(user_stats.values(), key=lambda x: x['presentations'], reverse=True)[:5],
        "referrals": sorted(user_stats.values(), key=lambda x: x['referrals'], reverse=True)[:5],
        "testimonials": sorted(user_stats.values(), key=lambda x: x['testimonials'], reverse=True)[:5],
        "new_face_sold": sorted(user_stats.values(), key=lambda x: x['new_face_sold'], reverse=True)[:5],
        "premium": sorted(user_stats.values(), key=lambda x: x['premium'], reverse=True)[:5]
    }
    
    return leaderboard


# ============================================
# Team Reorganization & Archiving Endpoints
# ============================================

class UserReassignment(BaseModel):
    role: Optional[str] = None
    manager_id: Optional[str] = None

@api_router.put("/users/{user_id}/reassign")
async def reassign_user(user_id: str, reassignment: UserReassignment, current_user: dict = Depends(get_current_user)):
    """Reassign a user's role and/or manager (for promotions/transfers)"""
    # Only managers can reassign
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only managers can reassign team members")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update dict
    update_data = {}
    if reassignment.role is not None:
        # Validate role
        valid_roles = ['agent', 'district_manager', 'regional_manager', 'state_manager']
        if reassignment.role not in valid_roles:
            raise HTTPException(status_code=400, detail="Invalid role")
        update_data['role'] = reassignment.role
    
    if reassignment.manager_id is not None:
        # Validate manager exists
        if reassignment.manager_id != "":
            manager = await db.users.find_one({"id": reassignment.manager_id}, {"_id": 0})
            if not manager:
                raise HTTPException(status_code=404, detail="Manager not found")
        update_data['manager_id'] = reassignment.manager_id if reassignment.manager_id != "" else None
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No changes provided")
    
    # Update user
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "User reassigned successfully", "updates": update_data}

@api_router.put("/users/{user_id}/archive")
async def archive_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Archive a user (when they quit) - preserves all data but removes from active hierarchy"""
    # Only state managers can archive
    if current_user['role'] != 'state_manager':
        raise HTTPException(status_code=403, detail="Only state managers can archive users")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get('status') == 'archived':
        raise HTTPException(status_code=400, detail="User is already archived")
    
    # Check if user has subordinates
    subordinates = await db.users.find({"manager_id": user_id, "status": {"$ne": "archived"}}, {"_id": 0}).to_list(1000)
    subordinate_count = len(subordinates)
    
    # Archive the user (keep all historical data)
    await db.users.update_one({"id": user_id}, {"$set": {"status": "archived", "archived_at": datetime.now(timezone.utc).isoformat()}})
    
    return {
        "message": "User archived successfully",
        "subordinates_count": subordinate_count,
        "warning": f"This user has {subordinate_count} subordinate(s) who need to be reassigned" if subordinate_count > 0 else None
    }

@api_router.put("/users/{user_id}/unarchive")
async def unarchive_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Unarchive a user (restore to active)"""
    if current_user['role'] != 'state_manager':
        raise HTTPException(status_code=403, detail="Only state managers can unarchive users")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get('status') != 'archived':
        raise HTTPException(status_code=400, detail="User is not archived")
    
    await db.users.update_one({"id": user_id}, {"$set": {"status": "active"}, "$unset": {"archived_at": ""}})
    
    return {"message": "User unarchived successfully"}

@api_router.get("/users/archived/list")
async def get_archived_users(current_user: dict = Depends(get_current_user)):
    """Get list of all archived users"""
    if current_user['role'] != 'state_manager':
        raise HTTPException(status_code=403, detail="Only state managers can view archived users")
    
    archived = await db.users.find({"status": "archived"}, {"_id": 0, "password_hash": 0}).sort("archived_at", -1).to_list(1000)
    
    # Get activity stats for each archived user
    for user in archived:
        activities = await db.activities.find({"user_id": user['id']}, {"_id": 0}).to_list(10000)
        total_stats = {
            "presentations": sum(a.get('presentations', 0) for a in activities),
            "appointments": sum(a.get('appointments', 0) for a in activities),
            "sales": sum(a.get('sales', 0) for a in activities),
            "premium": sum(a.get('premium', 0) for a in activities)
        }
        user['total_stats'] = total_stats
    
    return archived

@api_router.get("/users/active/list")
async def get_active_users_for_reassignment(current_user: dict = Depends(get_current_user)):
    """Get all active users for team reorganization"""
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only managers can access this")
    
    # Get all active users (or users without status field - default to active)
    users = await db.users.find(
        {"$or": [{"status": "active"}, {"status": {"$exists": False}}]},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    # Add manager name to each user
    for user in users:
        if user.get('manager_id'):
            manager = await db.users.find_one({"id": user['manager_id']}, {"_id": 0, "name": 1})
            user['manager_name'] = manager['name'] if manager else "Unknown"
        else:
            user['manager_name'] = "None"
    
    return users



# ============================================
# Weekly Averages & Analytics Endpoints
# ============================================

@api_router.get("/analytics/personal-averages")
async def get_personal_averages(current_user: dict = Depends(get_current_user)):
    """Get personal weekly averages for different time periods"""
    from datetime import timedelta
    
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    # Calculate date ranges
    periods = {
        "last_4_weeks": today - timedelta(weeks=4),
        "last_8_weeks": today - timedelta(weeks=8),
        "last_12_weeks": today - timedelta(weeks=12),
        "ytd": today.replace(month=1, day=1)
    }
    
    result = {}
    
    for period_name, start_date in periods.items():
        # Get activities for this period
        activities = await db.activities.find({
            "user_id": current_user['id'],
            "date": {"$gte": start_date.isoformat()}
        }, {"_id": 0}).to_list(10000)
        
        # Calculate totals
        totals = {
            "presentations": sum(a.get('presentations', 0) for a in activities),
            "appointments": sum(a.get('appointments', 0) for a in activities),
            "sales": sum(a.get('sales', 0) for a in activities),
            "premium": sum(a.get('premium', 0) for a in activities)
        }
        
        # Calculate weeks in period
        days_in_period = (today - start_date).days
        weeks_in_period = max(days_in_period / 7, 1)
        
        # Calculate averages
        averages = {
            "presentations": round(totals["presentations"] / weeks_in_period, 1),
            "appointments": round(totals["appointments"] / weeks_in_period, 1),
            "sales": round(totals["sales"] / weeks_in_period, 1),
            "premium": round(totals["premium"] / weeks_in_period, 2)
        }
        
        result[period_name] = {
            "averages": averages,
            "totals": totals,
            "weeks": round(weeks_in_period, 1)
        }
    
    return result

@api_router.get("/analytics/team-averages")
async def get_team_averages(current_user: dict = Depends(get_current_user)):
    """Get team averages for managers"""
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only managers can access team analytics")
    
    from datetime import timedelta
    
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    # Get all subordinates
    async def get_all_subordinates(user_id: str):
        ids = []
        subordinates = await db.users.find(
            {"manager_id": user_id, "$or": [{"status": "active"}, {"status": {"$exists": False}}]},
            {"_id": 0, "id": 1}
        ).to_list(1000)
        for sub in subordinates:
            ids.append(sub['id'])
            ids.extend(await get_all_subordinates(sub['id']))
        return ids
    
    team_ids = await get_all_subordinates(current_user['id'])
    
    # Calculate for each period
    periods = {
        "last_4_weeks": today - timedelta(weeks=4),
        "last_8_weeks": today - timedelta(weeks=8),
        "last_12_weeks": today - timedelta(weeks=12),
        "ytd": today.replace(month=1, day=1)
    }
    
    result = {}
    
    for period_name, start_date in periods.items():
        # Get activities for entire team
        activities = await db.activities.find({
            "user_id": {"$in": team_ids},
            "date": {"$gte": start_date.isoformat()}
        }, {"_id": 0}).to_list(100000)
        
        # Calculate team totals
        team_totals = {
            "presentations": sum(a.get('presentations', 0) for a in activities),
            "appointments": sum(a.get('appointments', 0) for a in activities),
            "sales": sum(a.get('sales', 0) for a in activities),
            "premium": sum(a.get('premium', 0) for a in activities)
        }
        
        days_in_period = (today - start_date).days
        weeks_in_period = max(days_in_period / 7, 1)
        
        # Calculate team averages (per team member per week)
        team_member_count = len(team_ids) if team_ids else 1
        
        team_avg_per_member = {
            "presentations": round(team_totals["presentations"] / weeks_in_period / team_member_count, 1),
            "appointments": round(team_totals["appointments"] / weeks_in_period / team_member_count, 1),
            "sales": round(team_totals["sales"] / weeks_in_period / team_member_count, 1),
            "premium": round(team_totals["premium"] / weeks_in_period / team_member_count, 2)
        }
        
        result[period_name] = {
            "team_averages_per_member": team_avg_per_member,
            "team_totals": team_totals,
            "team_size": team_member_count,
            "weeks": round(weeks_in_period, 1)
        }
    
    return result

@api_router.get("/analytics/individual-member-averages")
async def get_individual_member_averages(current_user: dict = Depends(get_current_user), period: str = "last_4_weeks"):
    """Get individual averages for each team member"""
    if current_user['role'] not in ['state_manager', 'regional_manager', 'district_manager']:
        raise HTTPException(status_code=403, detail="Only managers can access this")
    
    from datetime import timedelta
    
    central_tz = pytz_timezone('America/Chicago')
    today = datetime.now(central_tz).date()
    
    # Calculate date range
    period_map = {
        "last_4_weeks": today - timedelta(weeks=4),
        "last_8_weeks": today - timedelta(weeks=8),
        "last_12_weeks": today - timedelta(weeks=12),
        "ytd": today.replace(month=1, day=1)
    }
    
    start_date = period_map.get(period, today - timedelta(weeks=4))
    
    # Get all subordinates
    async def get_all_subordinates_with_info(user_id: str):
        result = []
        subordinates = await db.users.find(
            {"manager_id": user_id, "$or": [{"status": "active"}, {"status": {"$exists": False}}]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
        ).to_list(1000)
        for sub in subordinates:
            result.append(sub)
            result.extend(await get_all_subordinates_with_info(sub['id']))
        return result
    
    team_members = await get_all_subordinates_with_info(current_user['id'])
    
    # Calculate averages for each member
    days_in_period = (today - start_date).days
    weeks_in_period = max(days_in_period / 7, 1)
    
    member_averages = []
    
    for member in team_members:
        activities = await db.activities.find({
            "user_id": member['id'],
            "date": {"$gte": start_date.isoformat()}
        }, {"_id": 0}).to_list(10000)
        
        totals = {
            "presentations": sum(a.get('presentations', 0) for a in activities),
            "appointments": sum(a.get('appointments', 0) for a in activities),
            "sales": sum(a.get('sales', 0) for a in activities),
            "premium": sum(a.get('premium', 0) for a in activities)
        }
        
        averages = {
            "presentations": round(totals["presentations"] / weeks_in_period, 1),
            "appointments": round(totals["appointments"] / weeks_in_period, 1),
            "sales": round(totals["sales"] / weeks_in_period, 1),
            "premium": round(totals["premium"] / weeks_in_period, 2)
        }
        
        member_averages.append({
            "id": member['id'],
            "name": member['name'],
            "email": member['email'],
            "role": member['role'],
            "averages": averages,
            "totals": totals
        })
    
    return {
        "period": period,
        "weeks": round(weeks_in_period, 1),
        "members": member_averages
    }

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