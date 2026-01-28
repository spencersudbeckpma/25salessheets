#!/usr/bin/env python3
"""
Team User Roster Export Script
Generates CSV roster for each team with: Name, Email, Role, Reports-to

Usage:
  python3 generate_roster.py

Output:
  Creates CSV files in /app/docs/rosters/
  - team_roster_TEAMNAME.csv for each team
  - all_teams_roster.csv combined
"""

import asyncio
import csv
import os
import re
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'pma_agent')

async def generate_rosters():
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Create output directory
    output_dir = '/app/docs/rosters'
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all teams
    teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    team_dict = {t['id']: t['name'] for t in teams}
    
    # Get all users
    users = await db.users.find(
        {"$or": [{"status": "active"}, {"status": {"$exists": False}}]},
        {"_id": 0, "password_hash": 0}
    ).to_list(10000)
    
    # Build user lookup for manager names
    user_dict = {u['id']: u for u in users}
    
    # Group users by team
    users_by_team = {}
    for user in users:
        team_id = user.get('team_id', 'unassigned')
        if team_id not in users_by_team:
            users_by_team[team_id] = []
        users_by_team[team_id].append(user)
    
    # Role order for sorting
    role_order = {
        'super_admin': 0,
        'state_manager': 1,
        'regional_manager': 2,
        'district_manager': 3,
        'agent': 4
    }
    
    all_rows = []
    
    # Generate roster for each team
    for team_id, team_users in users_by_team.items():
        if team_id == 'unassigned':
            team_name = 'Unassigned'
        else:
            team_name = team_dict.get(team_id, 'Unknown Team')
        
        # Sort by role, then name
        team_users.sort(key=lambda u: (role_order.get(u.get('role', 'agent'), 5), u.get('name', '')))
        
        rows = []
        for user in team_users:
            manager_id = user.get('manager_id')
            if manager_id and manager_id in user_dict:
                reports_to = user_dict[manager_id].get('name', 'Unknown')
            else:
                reports_to = '—'
            
            row = {
                'Name': user.get('name', ''),
                'Email': user.get('email', ''),
                'Role': format_role(user.get('role', '')),
                'Reports To': reports_to,
                'Team': team_name
            }
            rows.append(row)
            all_rows.append(row)
        
        # Write team-specific CSV
        safe_team_name = re.sub(r'[^\w\s-]', '', team_name).replace(' ', '_')
        filename = f"{output_dir}/team_roster_{safe_team_name}.csv"
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['Name', 'Email', 'Role', 'Reports To'])
            writer.writeheader()
            for row in rows:
                writer.writerow({k: v for k, v in row.items() if k != 'Team'})
        
        print(f"✓ Generated: {filename} ({len(rows)} users)")
    
    # Write combined roster
    combined_filename = f"{output_dir}/all_teams_roster.csv"
    with open(combined_filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Team', 'Name', 'Email', 'Role', 'Reports To'])
        writer.writeheader()
        # Sort all rows by team, then role, then name
        all_rows.sort(key=lambda r: (r['Team'], role_order.get(r['Role'].lower().replace(' ', '_'), 5), r['Name']))
        writer.writerows(all_rows)
    
    print(f"\n✓ Generated combined roster: {combined_filename} ({len(all_rows)} total users)")
    print(f"\nGenerated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    client.close()

def format_role(role):
    """Format role for display"""
    return role.replace('_', ' ').title()

if __name__ == '__main__':
    asyncio.run(generate_rosters())
