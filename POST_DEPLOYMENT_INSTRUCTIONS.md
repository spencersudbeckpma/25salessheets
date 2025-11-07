# Post-Deployment Instructions for CRM Sales Tracker

## After you Redeploy the app, follow these steps ONCE:

### Step 1: Login to your deployed app
- Go to your deployed CRM URL
- Login as Spencer (State Manager)
  - Username: `spencer.sudbeck`
  - Password: `Bizlink25`

### Step 2: Open Browser Console
On your iPad/device:
- Safari: Not easily accessible on iPad
- **Easier method**: Use the admin UI button (see Step 3)

### Step 3: Call the Admin Endpoint (Choose ONE method)

#### Method A: Using Admin Cleanup Tab
1. Navigate to the **"Admin"** tab in your CRM dashboard
2. Look for a button that says "Populate Today's Activities"
3. Click it once
4. You should see a success message

#### Method B: Using Browser (if Admin UI not available)
Open a new browser tab and go to:
```
https://your-crm-app-url.emergentagent.com/api/admin/populate-todays-activities
```
(Replace with your actual deployed URL)

This will show an error page, but that's okay - we need to use a proper tool.

#### Method C: After logging in, paste this in browser console:
```javascript
fetch(window.location.origin + '/api/admin/populate-todays-activities', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(d => alert('Success! Added ' + d.activities_added + ' activities for today'))
.catch(e => alert('Error: ' + e));
```

### Step 4: Verify the Rollup
1. Go to **Team View** tab
2. Select **"Daily"** period
3. You should now see all team members with activities
4. Manager stats should show rolled-up totals (own + all subordinates)

---

## What This Does:
- Adds sample activities for TODAY for all users in your system
- Each user gets: 10 contacts, 5 appointments, 3 presentations, etc.
- This is ONE-TIME only to populate data for testing
- Going forward, you and your team enter activities normally

## Troubleshooting:
- If you still see zeros after running this:
  1. Check that you're looking at "Daily" period (not Weekly/Monthly)
  2. Refresh the page
  3. Check backend logs for any errors

---

**Note**: Only State Managers can run this admin endpoint. It's protected and can only be called once per day per user.
