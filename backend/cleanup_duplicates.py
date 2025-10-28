#!/usr/bin/env python3
"""
Cleanup script to find and remove duplicate activities
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def find_and_fix_duplicates():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔍 Searching for duplicate activities...")
    print("=" * 60)
    
    # Find duplicates
    pipeline = [
        {
            "$group": {
                "_id": {"user_id": "$user_id", "date": "$date"},
                "count": {"$sum": 1},
                "docs": {"$push": "$$ROOT"}
            }
        },
        {
            "$match": {"count": {"$gt": 1}}
        }
    ]
    
    duplicates = await db.activities.aggregate(pipeline).to_list(None)
    
    if not duplicates:
        print("✅ No duplicates found!")
        return
    
    print(f"❌ Found {len(duplicates)} sets of duplicates:\n")
    
    for dup in duplicates:
        user_id = dup['_id']['user_id']
        date = dup['_id']['date']
        count = dup['count']
        docs = dup['docs']
        
        # Get user name
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
        user_name = user['name'] if user else "Unknown"
        
        print(f"User: {user_name} ({user_id})")
        print(f"Date: {date}")
        print(f"Duplicate count: {count}")
        print(f"Activities:")
        
        for i, doc in enumerate(docs, 1):
            print(f"  #{i}: ID={doc['id']}, Presentations={doc.get('presentations', 0)}, "
                  f"Premium={doc.get('premium', 0)}, Edited by={doc.get('edited_by', 'self')}")
        
        # Keep the most recently edited/created one
        sorted_docs = sorted(docs, key=lambda x: x.get('edited_at') or x.get('created_at'), reverse=True)
        keep = sorted_docs[0]
        delete_ids = [d['id'] for d in sorted_docs[1:]]
        
        print(f"  ✅ Keeping: ID={keep['id']}")
        print(f"  ❌ Deleting: {', '.join(delete_ids)}")
        
        # Delete duplicates
        result = await db.activities.delete_many({"id": {"$in": delete_ids}})
        print(f"  Deleted {result.deleted_count} duplicate(s)\n")
    
    print("=" * 60)
    print(f"✅ Cleanup complete! Removed duplicates for {len(duplicates)} user/date combinations")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(find_and_fix_duplicates())
