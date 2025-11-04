import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminCleanup = ({ user }) => {
  const [searchName, setSearchName] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Card className="shadow-lg bg-white" data-testid="admin-cleanup-card">
      <CardHeader>
        <CardTitle className="text-xl text-red-600">🛠️ Admin Cleanup Tool</CardTitle>
        <p className="text-sm text-gray-600">Search for users and manage their activities</p>
      </CardHeader>
      <CardContent className="space-y-6">
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
  );
};

export default AdminCleanup;
