"""
Script to populate production database with demo team hierarchy and activities.
Run this once after deployment to have demo data in production.
"""
import os
import asyncio
import bcrypt
import uuid
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'test_database')

async def populate_demo_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Populating demo data...")
    
    # Create State Manager demo account
    state_email = "demo.manager@preview.com"
    state_password = "Manager2024"
    state_username = "demomanager"
    
    existing = await db.users.find_one({"email": state_email})
    
    if existing:
        print(f"State Manager demo already exists")
        state_user_id = existing['id']
    else:
        password_hash = bcrypt.hashpw(state_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        state_user_id = str(uuid.uuid4())
        state_user = {
            "id": state_user_id,
            "email": state_email,
            "username": state_username,
            "name": "Demo State Manager",
            "role": "state_manager",
            "manager_id": None,
            "password_hash": password_hash,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await db.users.insert_one(state_user)
        print(f"✅ State Manager created: {state_email}")
    
    # Create Regional Manager
    regional_id = str(uuid.uuid4())
    regional_existing = await db.users.find_one({"email": "demo.regional@preview.com"})
    
    if not regional_existing:
        regional_user = {
            "id": regional_id,
            "email": "demo.regional@preview.com",
            "username": "demoregional",
            "name": "Demo Regional Manager",
            "role": "regional_manager",
            "manager_id": state_user_id,
            "password_hash": bcrypt.hashpw("Regional2024".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "created_at": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(regional_user)
        print(f"✅ Regional Manager created")
    else:
        regional_id = regional_existing['id']
    
    # Create District Manager
    district_id = str(uuid.uuid4())
    district_existing = await db.users.find_one({"email": "demo.district@preview.com"})
    
    if not district_existing:
        district_user = {
            "id": district_id,
            "email": "demo.district@preview.com",
            "username": "demodistrict",
            "name": "Demo District Manager",
            "role": "district_manager",
            "manager_id": regional_id,
            "password_hash": bcrypt.hashpw("District2024".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "created_at": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(district_user)
        print(f"✅ District Manager created")
    else:
        district_id = district_existing['id']
    
    # Create Agents
    agent_ids = []
    for i in range(1, 3):
        agent_email = f"demo.agent{i}@preview.com"
        agent_existing = await db.users.find_one({"email": agent_email})
        
        if not agent_existing:
            agent_id = str(uuid.uuid4())
            agent_user = {
                "id": agent_id,
                "email": agent_email,
                "username": f"demoagent{i}",
                "name": f"Demo Agent {i}",
                "role": "agent",
                "manager_id": district_id,
                "password_hash": bcrypt.hashpw(f"Agent{i}2024".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                "created_at": datetime.utcnow().isoformat()
            }
            await db.users.insert_one(agent_user)
            agent_ids.append(agent_id)
            print(f"✅ Agent {i} created")
        else:
            agent_ids.append(agent_existing['id'])
    
    # Add activities for all users
    all_user_ids = [state_user_id, regional_id, district_id] + agent_ids
    
    for user_id in all_user_ids:
        activities_count = await db.activities.count_documents({"user_id": user_id})
        
        if activities_count == 0:
            sample_activities = []
            today = date.today()
            
            for i in range(7):
                activity_date = today - timedelta(days=i)
                multiplier = 1 + (all_user_ids.index(user_id) * 0.3)
                
                sample_activities.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "date": activity_date.isoformat(),
                    "contacts": round(8 * multiplier + i * 0.5, 1),
                    "appointments": round(5 * multiplier + i * 0.5, 1),
                    "presentations": round(3 * multiplier + i * 0.5, 1),
                    "referrals": int(2 * multiplier) + i,
                    "testimonials": int(1 * multiplier) + (i // 2),
                    "sales": int(1 * multiplier) + (i // 3),
                    "new_face_sold": int(1 * multiplier),
                    "premium": round(750.00 * multiplier + (i * 125), 2),
                    "created_at": datetime.utcnow().isoformat(),
                    "edited_by": user_id,
                    "edited_at": datetime.utcnow().isoformat()
                })
            
            if sample_activities:
                await db.activities.insert_many(sample_activities)
                print(f"✅ Added {len(sample_activities)} activities for user")
    
    print("\n✅ Demo data population complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_demo_data())
