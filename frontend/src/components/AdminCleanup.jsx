import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import PasswordManagement from './PasswordManagement';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminCleanup = ({ user }) => {
  const [searchName, setSearchName] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/diagnostic`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDiagnosticInfo(response.data);
      toast.success('Diagnostic complete - check results below');
    } catch (error) {
      toast.error('Diagnostic failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/team-members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const filtered = response.data.filter(u => 
        u.name.toLowerCase().includes(searchName.toLowerCase())
      );
      
      setFoundUsers(filtered);
      toast.success(`Found ${filtered.length} user(s)`);
    } catch (error) {
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const viewUserActivities = async (userId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/${userId}/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setActivities(response.data);
      setSelectedUser(userId);
      toast.success(`Found ${response.data.length} activities`);
    } catch (error) {
      toast.error('Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllActivities = async (userId, userName) => {
    if (!window.confirm(`⚠️ DELETE ALL activities for ${userName}?\n\nThis cannot be undone!`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API}/debug/delete-all-user-activities/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(response.data.message);
      setActivities([]);
      setSelectedUser(null);
      // Refresh the search
      searchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete activities');
    } finally {
      setLoading(false);
    }
  };

  const populateTodaysActivities = async () => {
    if (!window.confirm('This will add sample activities for TODAY for all users. Continue?')) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/populate-todays-activities`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`✅ ${response.data.message}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to populate activities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg bg-white" data-testid="admin-cleanup-card">
      <CardHeader>
        <CardTitle className="text-xl text-red-600">🛠️ Admin Tools</CardTitle>
        <p className="text-sm text-gray-600">Administrative functions and data management</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button 
              onClick={runDiagnostic} 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              🔍 Run Diagnostic (Check Database)
            </Button>
            <Button 
              onClick={populateTodaysActivities} 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              📊 Populate Today's Activities (All Users)
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Run diagnostic first to see database state, then populate if needed.
          </p>
        </div>

        {/* Diagnostic Results */}
        {diagnosticInfo && (
          <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">📋 Diagnostic Results</h3>
            <div className="space-y-2 text-sm font-mono">
              <div><strong>Database:</strong> {diagnosticInfo.database}</div>
              <div><strong>Today's Date:</strong> {diagnosticInfo.today}</div>
              <div><strong>Total Users:</strong> {diagnosticInfo.counts.total_users}</div>
              <div><strong>Total Activities:</strong> {diagnosticInfo.counts.total_activities}</div>
              <div className={diagnosticInfo.counts.activities_for_today > 0 ? 'text-green-700' : 'text-red-700'}>
                <strong>Activities for TODAY:</strong> {diagnosticInfo.counts.activities_for_today}
                {diagnosticInfo.counts.activities_for_today === 0 && ' ⚠️ NO DATA - Click Populate button above!'}
              </div>
              <hr className="my-2"/>
              <div><strong>Your Name:</strong> {diagnosticInfo.current_user.name}</div>
              <div><strong>Your Activities Today:</strong> {diagnosticInfo.current_user.activities_today}</div>
              <div><strong>Your Subordinates:</strong> {diagnosticInfo.subordinates_count}</div>
              {diagnosticInfo.subordinates.length > 0 && (
                <div className="ml-4">
                  {diagnosticInfo.subordinates.map((name, i) => (
                    <div key={i}>- {name}</div>
                  ))}
                </div>
              )}
              {diagnosticInfo.current_user.today_data && (
                <div className="mt-2 p-2 bg-white rounded">
                  <strong>Your Today's Data:</strong>
                  <div>Contacts: {diagnosticInfo.current_user.today_data.contacts}</div>
                  <div>Appointments: {diagnosticInfo.current_user.today_data.appointments}</div>
                  <div>Premium: ${diagnosticInfo.current_user.today_data.premium}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="space-y-3">
          <Label htmlFor="search-name">Search User by Name</Label>
          <div className="flex gap-2">
            <Input
              id="search-name"
              placeholder="Enter name (e.g., James)"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button onClick={searchUsers} disabled={loading || !searchName}>
              Search
            </Button>
          </div>
        </div>

        {/* Found Users */}
        {foundUsers.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Found Users:</h3>
            {foundUsers.map(user => (
              <div key={user.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                    <div className="text-xs text-gray-500">{user.role.replace('_', ' ').toUpperCase()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewUserActivities(user.id)}
                    >
                      View Activities
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteAllActivities(user.id, user.name)}
                    >
                      Delete All Data
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activities List */}
        {selectedUser && activities.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <h3 className="font-semibold">Activities ({activities.length}):</h3>
            {activities.map(act => (
              <div key={act.id} className="p-3 border rounded bg-white text-sm">
                <div className="font-semibold">{act.date}</div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>Contacts: {act.contacts}</div>
                  <div>Appointments: {act.appointments}</div>
                  <div>Presentations: {act.presentations}</div>
                  <div>Premium: ${act.premium}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedUser && activities.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No activities found for this user
          </div>
        )}
      </CardContent>
    </Card>

      {/* Password Management Section */}
      <div className="mt-8">
        <PasswordManagement user={user} />
      </div>
    </div>
  );
};

export default AdminCleanup;
