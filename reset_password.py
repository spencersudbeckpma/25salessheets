import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'test_database')

async def reset_password():
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # User details
    email = "spencer.sudbeck@pmagent.net"
    new_password = "Bizlink25"
    
    # Hash the new password
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update the user's password
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": password_hash}}
    )
    
    if result.modified_count > 0:
        print(f"✅ Password successfully reset for {email}")
        print(f"   New password: {new_password}")
    else:
        print(f"❌ User {email} not found or password not updated")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reset_password())
