"""
Add TODAY's activities for all users to test rollup
"""
import asyncio
import uuid
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'test_database')

async def add_todays_activities():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    today = date.today().isoformat()
    print(f"Adding activities for today: {today}")
    
    # Get all users
    users = await db.users.find({}).to_list(1000)
    
    added_count = 0
    for user in users:
        # Check if activity exists for today
        existing = await db.activities.find_one({"user_id": user['id'], "date": today})
        
        if not existing:
            # Add today's activity
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
                "created_at": datetime.utcnow().isoformat(),
                "edited_by": user['id'],
                "edited_at": datetime.utcnow().isoformat()
            }
            
            await db.activities.insert_one(activity)
            added_count += 1
            print(f"  ✅ Added activity for {user['name']}")
    
    print(f"\n✅ Added {added_count} activities for today!")
    client.close()

if __name__ == "__main__":
    asyncio.run(add_todays_activities())
