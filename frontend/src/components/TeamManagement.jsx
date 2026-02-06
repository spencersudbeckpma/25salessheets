import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserPlus, Mail, Trash2, Edit2, Save, X, Lock, Eye, EyeOff, Shield, Settings, ArrowUp, ArrowDown, Users } from 'lucide-react';
import PasswordManagement from './PasswordManagement';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Reorganize User Card Component
const ReorganizeUserCard = ({ member, availableManagers, onReassign }) => {
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [selectedManager, setSelectedManager] = useState(member.manager_id || '');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when member prop changes (after save + refetch)
  useEffect(() => {
    setSelectedRole(member.role);
    setSelectedManager(member.manager_id || '');
  }, [member.role, member.manager_id]);

  useEffect(() => {
    const roleChanged = selectedRole !== member.role;
    const managerChanged = selectedManager !== (member.manager_id || '');
    setHasChanges(roleChanged || managerChanged);
  }, [selectedRole, selectedManager, member.role, member.manager_id]);

  const handleSave = () => {
    onReassign(member.id, selectedRole, selectedManager);
  };

  const handleReset = () => {
    setSelectedRole(member.role);
    setSelectedManager(member.manager_id || '');
  };

  return (
    <div className="p-4 bg-white border rounded-lg">
      <div className="mb-3">
        <div className="font-semibold text-lg">{member.name}</div>
        <div className="text-sm text-gray-600">{member.email}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <Label className="text-sm font-medium">Role</Label>
          <select
            className="w-full p-2 border rounded-md mt-1"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="agent">Agent</option>
            <option value="district_manager">District Manager</option>
            <option value="regional_manager">Regional Manager</option>
            <option value="state_manager">State Manager</option>
          </select>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Manager</Label>
          <select
            className="w-full p-2 border rounded-md mt-1"
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
          >
            <option value="">No Manager</option>
            {availableManagers.map(manager => (
              <option key={manager.id} value={manager.id}>
                {manager.name} ({manager.role.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasChanges && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Save size={14} className="mr-1" />
            Save Changes
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <X size={14} className="mr-1" />
            Reset
          </Button>
        </div>
      )}
    </div>
  );
};

// Change Password Section Component
const ChangePasswordSection = ({ user }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      toast.error('Current password is required');
      return false;
    }
    if (!formData.newPassword) {
      toast.error('New password is required');
      return false;
    }
    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      toast.error('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/auth/change-password`, {
        current_password: formData.currentPassword,
        new_password: formData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Password changed successfully!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <Shield size={20} className="text-blue-600" />
          Change Your Password
        </h3>
        <p className="text-sm text-gray-600">
          Update your password to keep your account secure
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="text-sm font-semibold">Current Password</Label>
          <div className="relative mt-1">
            <input
              type={showPasswords.current ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold">New Password</Label>
          <div className="relative mt-1">
            <input
              type={showPasswords.new ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
        </div>

        <div>
          <Label className="text-sm font-semibold">Confirm New Password</Label>
          <div className="relative mt-1">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          <Lock size={18} className="mr-2" />
          {loading ? 'Changing Password...' : 'Change Password'}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        Changing password for: <strong>{user.name}</strong>
      </div>
    </div>
  );
};

// Admin Section Component
const AdminSection = ({ user }) => {
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
      toast.success('Diagnostic complete');
    } catch (error) {
      toast.error('Diagnostic failed');
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
    } catch (error) {
      toast.error('Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllActivities = async (userId, userName) => {
    if (!window.confirm(`⚠️ DELETE ALL activities for ${userName}?\n\nThis cannot be undone!`)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API}/debug/delete-all-user-activities/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      setActivities([]);
      setSelectedUser(null);
      searchUsers();
    } catch (error) {
      toast.error('Failed to delete activities');
    } finally {
      setLoading(false);
    }
  };

  const populateTodaysActivities = async () => {
    if (!window.confirm('Add sample activities for TODAY for all users?')) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/populate-todays-activities`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Failed to populate activities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Settings size={20} />
          Admin Tools
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={runDiagnostic} disabled={loading} variant="outline">
            🔍 Run Diagnostic
          </Button>
          <Button onClick={populateTodaysActivities} disabled={loading} variant="outline">
            📊 Populate Today's Activities
          </Button>
        </div>
      </div>

      {/* Diagnostic Results */}
      {diagnosticInfo && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
          <h3 className="font-semibold mb-3">📋 Diagnostic Results</h3>
          <div className="space-y-1 text-sm">
            <div><strong>Database:</strong> {diagnosticInfo.database}</div>
            <div><strong>Today:</strong> {diagnosticInfo.today}</div>
            <div><strong>Total Users:</strong> {diagnosticInfo.counts.total_users}</div>
            <div><strong>Total Activities:</strong> {diagnosticInfo.counts.total_activities}</div>
            <div className={diagnosticInfo.counts.activities_for_today > 0 ? 'text-green-700' : 'text-red-700'}>
              <strong>Activities Today:</strong> {diagnosticInfo.counts.activities_for_today}
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-gray-50 p-6 rounded-lg border">
        <h3 className="font-semibold mb-3">Search Users</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
          />
          <Button onClick={searchUsers} disabled={loading || !searchName}>Search</Button>
        </div>
      </div>

      {/* Found Users */}
      {foundUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Found Users:</h3>
          {foundUsers.map(u => (
            <div key={u.id} className="p-4 border rounded-lg bg-white flex justify-between items-center">
              <div>
                <div className="font-semibold">{u.name}</div>
                <div className="text-sm text-gray-600">{u.email}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => viewUserActivities(u.id)}>
                  View Activities
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteAllActivities(u.id, u.name)}>
                  Delete All Data
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activities List */}
      {selectedUser && activities.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          <h3 className="font-semibold">Activities ({activities.length}):</h3>
          {activities.slice(0, 10).map(act => (
            <div key={act.id} className="p-3 border rounded bg-white text-sm">
              <div className="font-semibold">{act.date}</div>
              <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                <div>Contacts: {act.contacts}</div>
                <div>Premium: ${act.premium}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Password Management for Team */}
      <div className="mt-6">
        <PasswordManagement user={user} />
      </div>
    </div>
  );
};

const TeamManagement = ({ user }) => {
  // Get today's date in local timezone
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [invites, setInvites] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newInvite, setNewInvite] = useState({ name: '', email: '', role: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '', manager_id: '' });
  const [editMember, setEditMember] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [activeUsers, setActiveUsers] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [availableManagers, setAvailableManagers] = useState([]);
  // Team View Settings state
  const [teamViewUsers, setTeamViewUsers] = useState([]);
  const [teamViewLoading, setTeamViewLoading] = useState(false);
  const [savingTeamView, setSavingTeamView] = useState(false);

  useEffect(() => {
    fetchInvites();
    fetchTeamMembers();
  }, []);

  const fetchInvites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invites/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvites(response.data);
    } catch (error) {
      toast.error('Failed to fetch invites');
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/team-members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(response.data);
    } catch (error) {
      toast.error('Failed to fetch team members');
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/active/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch active users');
    }
  };

  const fetchArchivedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/archived/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArchivedUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch archived users');
    }
  };

  const fetchAvailableManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The endpoint returns { managers: [...] }, extract the array
      setAvailableManagers(response.data.managers || []);
    } catch (error) {
      toast.error('Failed to fetch managers');
      console.error('Manager fetch error:', error);
    }
  };



  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      toast.error('Please fill all required fields');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/auth/create-user`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`User ${newUser.name} created successfully!`);
      setNewUser({ name: '', email: '', password: '', role: '', manager_id: '' });
      fetchTeamMembers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleCreateInvite = async () => {
    if (!newInvite.name || !newInvite.email || !newInvite.role) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/invites`, newInvite, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Invite created! Code: ${response.data.invite_code}`);
      setNewInvite({ name: '', email: '', role: '' });
      fetchInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invite');
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/invites/${inviteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Invite deleted');
      fetchInvites();
    } catch (error) {
      toast.error('Failed to delete invite');
    }

  };

  const handleReassignUser = async (userId, role, managerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/users/${userId}/reassign`, 
        { role, manager_id: managerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User reassigned successfully');
      fetchActiveUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reassign user');
    }
  };

  const handleArchiveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to archive this user? They will no longer be able to log in, but their data will be preserved.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API}/users/${userId}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.subordinates_count > 0) {
        toast.warning(response.data.warning);
      } else {
        toast.success('User archived successfully');
      }
      
      fetchActiveUsers();
      fetchArchivedUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to archive user');
    }
  };

  const handleUnarchiveUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/users/${userId}/unarchive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User unarchived successfully');
      fetchActiveUsers();
      fetchArchivedUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unarchive user');
    }
  };

  // Team View Settings Functions
  const fetchTeamViewUsers = async () => {
    setTeamViewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/team/team-view-order`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamViewUsers(response.data.users || []);
    } catch (error) {
      toast.error('Failed to fetch Team View settings');
    } finally {
      setTeamViewLoading(false);
    }
  };

  const handleToggleHideFromTeamView = async (userId, currentValue) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/users/${userId}/team-view-settings`, 
        { hide_from_team_view: !currentValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`User ${!currentValue ? 'hidden from' : 'shown in'} Team View`);
      fetchTeamViewUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update visibility');
    }
  };

  const handleMoveUser = async (userId, direction) => {
    const currentIndex = teamViewUsers.findIndex(u => u.id === userId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= teamViewUsers.length) return;
    
    // Swap order values
    const newUsers = [...teamViewUsers];
    const temp = newUsers[currentIndex];
    newUsers[currentIndex] = newUsers[newIndex];
    newUsers[newIndex] = temp;
    
    // Update order numbers
    const updates = newUsers.map((u, idx) => ({
      user_id: u.id,
      team_view_order: idx
    }));
    
    setSavingTeamView(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/team/team-view-order/batch`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamViewUsers(newUsers.map((u, idx) => ({ ...u, team_view_order: idx })));
      toast.success('Display order updated');
    } catch (error) {
      toast.error('Failed to update order');
      fetchTeamViewUsers(); // Revert on error
    } finally {
      setSavingTeamView(false);
    }
  };

  const handleSelectMember = async (memberId) => {
    setEditMember(memberId);
    await fetchMemberActivity(memberId, selectedDate);
  };

  const fetchMemberActivity = async (memberId, date) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/${memberId}/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activity = response.data.find(a => a.date === date);
      if (activity) {
        setEditActivity({
          contacts: activity.contacts,
          appointments: activity.appointments,
          presentations: activity.presentations,
          referrals: activity.referrals,
          testimonials: activity.testimonials,
          apps: activity.apps || 0,
          sales: activity.sales,
          new_face_sold: activity.new_face_sold,
          bankers_premium: activity.bankers_premium || 0,
          premium: activity.premium
        });
      } else {
        setEditActivity({
          contacts: 0,
          appointments: 0,
          presentations: 0,
          referrals: 0,
          testimonials: 0,
          apps: 0,
          sales: 0,
          new_face_sold: 0,
          bankers_premium: 0,
          premium: 0
        });
      }
    } catch (error) {
      toast.error('Failed to fetch member activities');
    }
  };

  const handleSaveTeamActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Clean and parse all values before sending
      const cleanedActivity = {
        contacts: parseFloat(editActivity.contacts) || 0,
        appointments: parseFloat(editActivity.appointments) || 0,
        presentations: parseFloat(editActivity.presentations) || 0,
        referrals: parseInt(editActivity.referrals) || 0,
        testimonials: parseInt(editActivity.testimonials) || 0,
        apps: parseInt(editActivity.apps) || 0,
        sales: parseInt(editActivity.sales) || 0,
        new_face_sold: parseFloat(editActivity.new_face_sold) || 0,
        bankers_premium: parseFloat(editActivity.bankers_premium) || 0,
        premium: parseFloat(editActivity.premium) || 0
      };
      
      await axios.put(`${API}/users/${editMember}/activities/${selectedDate}`, {
        date: selectedDate,
        ...cleanedActivity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Team member activity updated!');
      // Refresh the activity data to show the updated values
      await fetchMemberActivity(editMember, selectedDate);
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update activity';
      toast.error(errorMessage);
    }
  };

  const getRoleOptions = () => {
    // State Manager can create any role below them
    const roleHierarchy = {
      state_manager: ['regional_manager', 'district_manager', 'agent'],
      regional_manager: ['district_manager', 'agent'],
      district_manager: ['agent'],
      agent: []
    };
    return roleHierarchy[user.role] || [];
  };

  return (
    <Card className="shadow-lg bg-white" data-testid="team-management-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl" data-testid="team-management-title">Team Management</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs defaultValue="invite" className="space-y-6">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex min-w-full md:w-full bg-gray-100 p-1 gap-1">
              <TabsTrigger value="create" data-testid="create-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">Create User</TabsTrigger>
              <TabsTrigger value="invite" data-testid="invite-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">Invites</TabsTrigger>
              <TabsTrigger value="edit" data-testid="edit-data-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">Edit Data</TabsTrigger>
              {/* All Users and Reorganize tabs - restricted to same team hierarchy */}
              {['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
                <>
                  <TabsTrigger value="all-users" data-testid="all-users-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">My Team</TabsTrigger>
                  <TabsTrigger value="reorganize" data-testid="reorganize-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">Reorganize</TabsTrigger>
                  <TabsTrigger value="team-view" data-testid="team-view-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">Team View</TabsTrigger>
                  <TabsTrigger value="archive" data-testid="archive-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">Archive</TabsTrigger>
                </>
              )}
              <TabsTrigger value="password" data-testid="password-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">🔐 Password</TabsTrigger>
              {['super_admin', 'state_manager'].includes(user.role) && (
                <TabsTrigger value="admin" data-testid="admin-tab" className="py-2 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0">⚙️ Admin</TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="create" className="space-y-6" data-testid="create-content">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <UserPlus size={20} />
                Create New User Directly
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Create a new team member and set their password. They can login immediately.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <Input
                    type="text"
                    placeholder="Set initial password (min 6 characters)"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">User can change this later</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full p-3 border rounded-md mt-1 bg-white text-base appearance-none"
                    style={{ fontSize: '16px' }}
                    required
                  >
                    <option value="">Select Role</option>
                    {getRoleOptions().map(role => (
                      <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Manager (Optional)</Label>
                  <select
                    value={newUser.manager_id}
                    onChange={(e) => setNewUser({...newUser, manager_id: e.target.value})}
                    className="w-full p-3 border rounded-md mt-1 bg-white text-base appearance-none"
                    style={{ fontSize: '16px' }}
                    onClick={() => availableManagers.length === 0 && fetchAvailableManagers()}
                  >
                    <option value="">No Manager (Top Level)</option>
                    {availableManagers.map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} ({manager.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button 
                onClick={handleCreateUser}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <UserPlus size={16} className="mr-2" />
                Create User
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-6" data-testid="invite-content">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <UserPlus size={20} />
                Create New Invite
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invite-name" className="text-sm font-medium">Name</Label>
                  <Input
                    id="invite-name"
                    data-testid="invite-name-input"
                    placeholder="Full Name"
                    value={newInvite.name}
                    onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="invite-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="invite-email"
                    data-testid="invite-email-input"
                    type="email"
                    placeholder="email@example.com"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="invite-role" className="text-sm font-medium">Role</Label>
                  <select
                    id="invite-role"
                    data-testid="invite-role-select"
                    className="w-full p-2 border rounded-md mt-1"
                    value={newInvite.role}
                    onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                  >
                    <option value="">Select Role</option>
                    {getRoleOptions().map(role => (
                      <option key={role} value={role}>
                        {role.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleCreateInvite} data-testid="create-invite-btn" className="w-full py-5 text-base">
                  <Mail size={18} className="mr-2" />
                  Create Invite
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Pending Invites</h3>
              <div className="space-y-3">
                {invites.filter(inv => inv.status === 'pending').map(invite => (
                  <div key={invite.id} className="p-4 bg-gradient-to-br from-white to-gray-50 border rounded-lg flex justify-between items-center shadow-sm" data-testid={`invite-${invite.id}`}>
                    <div>
                      <div className="font-semibold text-base" data-testid={`invite-name-${invite.id}`}>{invite.name}</div>
                      <div className="text-sm text-gray-600 mt-0.5" data-testid={`invite-email-${invite.id}`}>{invite.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Code: <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded" data-testid={`invite-code-${invite.id}`}>{invite.invite_code}</span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteInvite(invite.id)}
                      data-testid={`delete-invite-${invite.id}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {invites.filter(inv => inv.status === 'pending').length === 0 && (
                  <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg" data-testid="no-pending-invites">No pending invites</div>
                )}</div>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-5" data-testid="edit-data-content">
            <div>
              <Label htmlFor="team-member" className="text-sm font-medium">Select Team Member</Label>
              <select
                id="team-member"
                data-testid="team-member-select"
                className="w-full p-3 border rounded-md mt-2"
                value={editMember || ''}
                onChange={(e) => handleSelectMember(e.target.value)}
              >
                <option value="">Select a team member</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.role.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {editMember && (
              <>
                <div>
                  <Label htmlFor="edit-date" className="text-sm font-medium">Select Date</Label>
                  <Input
                    id="edit-date"
                    data-testid="edit-date-input"
                    type="date"
                    value={selectedDate}
                    max={getLocalDate()}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      fetchMemberActivity(editMember, e.target.value);
                    }}
                    className="mt-2"
                  />
                </div>

                {editActivity && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 space-y-4">
                    <h3 className="font-semibold text-lg">Edit Activity Data</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.keys(editActivity).map(key => (
                        <div key={key}>
                          <Label htmlFor={`edit-${key}`} className="text-xs font-medium">{key.replace('_', ' ').toUpperCase()}</Label>
                          <Input
                            id={`edit-${key}`}
                            data-testid={`team-edit-${key}-input`}
                            type="number"
                            min="0"
                            step={
                              key === 'premium' ? '0.01' : 
                              (key === 'presentations' || key === 'contacts' || key === 'appointments' || key === 'new_face_sold') ? '0.5' : 
                              '1'
                            }
                            value={editActivity[key] === 0 ? '' : editActivity[key]}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setEditActivity({ ...editActivity, [key]: 0 });
                              } else {
                                const parsed = parseFloat(value);
                                setEditActivity({ ...editActivity, [key]: isNaN(parsed) ? 0 : parsed });
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value === '' || isNaN(parseFloat(value))) {
                                setEditActivity({ ...editActivity, [key]: 0 });
                              }
                            }}
                            placeholder="0"
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleSaveTeamActivity} data-testid="save-team-activity-btn" className="w-full py-5 text-base">
                      <Save size={18} className="mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>


          {/* All Users Tab - Now restricted to managers showing only their downline */}
          {['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
          <TabsContent value="all-users" className="space-y-6" data-testid="all-users-content">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg mb-4">My Team Users</h3>
              <p className="text-sm text-gray-600 mb-4">
                View users in your team hierarchy with their usernames and roles.
              </p>
              <Button onClick={fetchActiveUsers} className="mb-4">
                Load My Team
              </Button>
            </div>

            {activeUsers.length > 0 && (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {activeUsers.map((member, index) => (
                    <div key={member.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{member.name}</div>
                          <div className="text-sm text-blue-600">{member.email}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          member.role === 'state_manager' ? 'bg-purple-100 text-purple-800' :
                          member.role === 'regional_manager' ? 'bg-blue-100 text-blue-800' :
                          member.role === 'district_manager' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <span>Reports to:</span>
                        <span className="font-medium text-gray-700">{member.manager_name || 'None (Top Level)'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-left font-semibold">#</th>
                        <th className="border p-3 text-left font-semibold">Name</th>
                        <th className="border p-3 text-left font-semibold">Username/Email</th>
                        <th className="border p-3 text-left font-semibold">Role</th>
                        <th className="border p-3 text-left font-semibold">Manager</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.map((member, index) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="border p-3">{index + 1}</td>
                          <td className="border p-3 font-medium">{member.name}</td>
                          <td className="border p-3 text-blue-600">{member.email}</td>
                          <td className="border p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              member.role === 'state_manager' ? 'bg-purple-100 text-purple-800' :
                              member.role === 'regional_manager' ? 'bg-blue-100 text-blue-800' :
                              member.role === 'district_manager' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="border p-3 text-gray-600">{member.manager_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  Total: {activeUsers.length} users in your hierarchy
                </div>
              </>
            )}
          </TabsContent>
          )}

          {/* Reorganize Tab - Available to managers, but scoped to their team */}
          {['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
          <TabsContent value="reorganize" className="space-y-6" data-testid="reorganize-content">
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-lg mb-4">Reorganize Team</h3>
              <p className="text-sm text-gray-600 mb-4">
                Change team members' roles or reassign them to different managers within your hierarchy. All historical data will be preserved.
              </p>
              <Button onClick={() => { fetchActiveUsers(); fetchAvailableManagers(); }} className="mb-4">
                Load My Team
              </Button>
            </div>

            <div className="space-y-4">
              {activeUsers.map(member => (
                <ReorganizeUserCard 
                  key={member.id}
                  member={member}
                  availableManagers={availableManagers.filter(m => m.id !== member.id)}
                  onReassign={handleReassignUser}
                />
              ))}
            </div>
          </TabsContent>
          )}

          {/* Team View Settings Tab - Visibility and Ordering Controls */}
          {['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
          <TabsContent value="team-view" className="space-y-6" data-testid="team-view-content">
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users size={20} />
                Team View Display Settings
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Control how users appear in the Team View hierarchy. These settings affect <strong>display only</strong>.
              </p>
              <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
                <li><strong>Hide from Team View:</strong> User won't appear in the hierarchy, but their data still rolls up to totals, reports, and leaderboards.</li>
                <li><strong>Display Order:</strong> Reorder users within the Team View using the arrows.</li>
              </ul>
              <Button onClick={fetchTeamViewUsers} disabled={teamViewLoading}>
                {teamViewLoading ? 'Loading...' : 'Load Team Settings'}
              </Button>
            </div>

            {teamViewUsers.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-base">Team Members ({teamViewUsers.length})</h4>
                  <div className="text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><EyeOff size={12} /> = Hidden from Team View</span>
                  </div>
                </div>
                
                {teamViewUsers.map((member, index) => (
                  <div 
                    key={member.id} 
                    className={`p-4 border rounded-lg flex justify-between items-center transition-colors ${
                      member.hide_from_team_view 
                        ? 'bg-gray-100 border-gray-300 opacity-75' 
                        : 'bg-white border-gray-200'
                    }`}
                    data-testid={`team-view-user-${member.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Order controls */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveUser(member.id, 'up')}
                          disabled={index === 0 || savingTeamView}
                          className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title="Move up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveUser(member.id, 'down')}
                          disabled={index === teamViewUsers.length - 1 || savingTeamView}
                          className={`p-1 rounded hover:bg-gray-200 ${index === teamViewUsers.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title="Move down"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                      
                      {/* User info */}
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {member.name}
                          {member.hide_from_team_view && (
                            <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded">Hidden</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.role?.replace('_', ' ').toUpperCase()}
                          <span className="mx-2">•</span>
                          <span className="text-gray-400">Order: {member.team_view_order}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Visibility toggle */}
                    <Button
                      variant={member.hide_from_team_view ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleHideFromTeamView(member.id, member.hide_from_team_view)}
                      className="flex items-center gap-2"
                      data-testid={`toggle-visibility-${member.id}`}
                    >
                      {member.hide_from_team_view ? (
                        <>
                          <Eye size={16} />
                          Show
                        </>
                      ) : (
                        <>
                          <EyeOff size={16} />
                          Hide
                        </>
                      )}
                    </Button>
                  </div>
                ))}
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Hidden users' production data still rolls up to their manager's totals, team totals, leaderboards, and all reports. Only the visual display in Team View is affected.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          )}

          {/* Archive Tab - Available to managers, scoped to their team */}
          {['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
          <TabsContent value="archive" className="space-y-6" data-testid="archive-content">
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-lg mb-4">Archive Users</h3>
              <p className="text-sm text-gray-600 mb-4">
                Archive users who have left the organization. Their data will be preserved and still count in reports, but they won't be able to log in or appear in the active team hierarchy.
              </p>
              <div className="flex gap-4">
                <Button onClick={fetchActiveUsers}>Load My Team</Button>
                <Button onClick={fetchArchivedUsers} variant="outline">View Archived Users</Button>
              </div>
            </div>

            {activeUsers.length > 0 && (
              <div>
                <h4 className="font-semibold text-base mb-3">Active Users</h4>
                <div className="space-y-3">
                  {activeUsers.map(member => (
                    <div key={member.id} className="p-4 bg-white border rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                        <div className="text-xs text-gray-500">{member.role.replace('_', ' ').toUpperCase()}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleArchiveUser(member.id)}
                      >
                        Archive
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {archivedUsers.length > 0 && (
              <div>
                <h4 className="font-semibold text-base mb-3">Archived Users</h4>
                <div className="space-y-3">
                  {archivedUsers.map(member => (
                    <div key={member.id} className="p-4 bg-gray-100 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold">{member.name}</div>
                          <div className="text-sm text-gray-600">{member.email}</div>
                          <div className="text-xs text-gray-500">{member.role.replace('_', ' ').toUpperCase()}</div>
                          {member.archived_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Archived: {new Date(member.archived_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchiveUser(member.id)}
                        >
                          Unarchive
                        </Button>
                      </div>
                      {member.total_stats && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="text-xs text-gray-600 mb-2">Total Historical Performance:</div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            <div>
                              <span className="text-gray-600">Presentations:</span>
                              <span className="ml-1 font-semibold">{member.total_stats.presentations}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Appointments:</span>
                              <span className="ml-1 font-semibold">{member.total_stats.appointments}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Sales:</span>
                              <span className="ml-1 font-semibold">{member.total_stats.sales}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Premium:</span>
                              <span className="ml-1 font-semibold">${member.total_stats.premium.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          )}

          {/* Password Change Tab - Available to all users */}
          <TabsContent value="password" className="space-y-6" data-testid="password-content">
            <ChangePasswordSection user={user} />
          </TabsContent>

          {/* Admin Tab - State Manager and Super Admin */}
          {['super_admin', 'state_manager'].includes(user.role) && (
          <TabsContent value="admin" className="space-y-6" data-testid="admin-content">
            <AdminSection user={user} />
          </TabsContent>
          )}

        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;