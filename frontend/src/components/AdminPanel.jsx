import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Users, Building2, UserPlus, RefreshCw, Search, Shield, UserCog, ChevronRight, Wrench, AlertTriangle, CheckCircle2, ArrowRight, Trash2, Pencil } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  
  // Modal states
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState('');
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = useState('');
  
  // New user form
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    team_id: '',
    manager_id: ''
  });
  
  // Edit user modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
    team_id: '',
    manager_id: ''
  });
  
  // Hierarchy repair states
  const [hierarchyData, setHierarchyData] = useState({});
  const [repairLoading, setRepairLoading] = useState({});
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedTeamForRepair, setSelectedTeamForRepair] = useState(null);
  const [managerAssignments, setManagerAssignments] = useState({});
  
  // Diagnostics states
  const [diagnosticsData, setDiagnosticsData] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  
  // Unassigned users states
  const [unassignedData, setUnassignedData] = useState(null);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [selectedUnassignedUsers, setSelectedUnassignedUsers] = useState([]);
  const [assignToTeamId, setAssignToTeamId] = useState('');
  const [assignManagerId, setAssignManagerId] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, usersRes] = await Promise.all([
        axios.get(`${API}/api/admin/teams`, { headers }),
        axios.get(`${API}/api/admin/users`, { headers })
      ]);
      setTeams(teamsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch broken hierarchy for a team
  const fetchBrokenHierarchy = async (teamId) => {
    try {
      setRepairLoading(prev => ({ ...prev, [teamId]: true }));
      const res = await axios.get(`${API}/api/admin/teams/${teamId}/broken-hierarchy`, { headers });
      setHierarchyData(prev => ({ ...prev, [teamId]: res.data }));
      return res.data;
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      toast.error('Failed to fetch hierarchy data');
      return null;
    } finally {
      setRepairLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Fetch broken hierarchies for all teams
  const fetchAllBrokenHierarchies = async () => {
    setRepairLoading(prev => ({ ...prev, all: true }));
    // Include ALL teams - no exclusions
    for (const team of teams) {
      await fetchBrokenHierarchy(team.id);
    }
    setRepairLoading(prev => ({ ...prev, all: false }));
    toast.success('Hierarchy check complete for all teams');
  };

  // Open repair modal for a team
  const openRepairModal = async (team) => {
    setSelectedTeamForRepair(team);
    const data = await fetchBrokenHierarchy(team.id);
    if (data && data.broken_users) {
      // Pre-populate manager assignments with first available state_manager
      const stateManager = data.potential_managers?.find(m => m.role === 'state_manager');
      const initialAssignments = {};
      data.broken_users.forEach(user => {
        if (stateManager) {
          initialAssignments[user.id] = stateManager.id;
        }
      });
      setManagerAssignments(initialAssignments);
    }
    setShowRepairModal(true);
  };

  // Repair hierarchy for a single team
  const repairTeamHierarchy = async (teamId) => {
    const data = hierarchyData[teamId];
    if (!data || data.broken_count === 0) {
      toast.success('No repairs needed for this team');
      return;
    }

    const repairs = data.broken_users.map(user => ({
      user_id: user.id,
      manager_id: managerAssignments[user.id] || null
    })).filter(r => r.manager_id); // Only include users with assigned managers

    if (repairs.length === 0) {
      toast.error('Please select a manager for each user');
      return;
    }

    try {
      setRepairLoading(prev => ({ ...prev, [teamId]: true }));
      const res = await axios.post(`${API}/api/admin/repair-manager-ids`, repairs, { headers });
      toast.success(`Repaired ${res.data.results.length} users`);
      // Refresh data
      await fetchBrokenHierarchy(teamId);
      setShowRepairModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to repair hierarchy');
    } finally {
      setRepairLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Force rebuild hierarchy for a single team
  const forceRebuildTeamHierarchy = async (teamId, teamName) => {
    if (!window.confirm(`This will FORCE REBUILD the entire hierarchy for ${teamName}.\n\nAll Regional Managers will report to the State Manager.\nAll District Managers will report to a Regional Manager.\nAll Agents will report to a District Manager.\n\nContinue?`)) {
      return;
    }
    
    setRepairLoading(prev => ({ ...prev, [teamId]: true }));
    
    try {
      const res = await axios.post(`${API}/api/admin/teams/${teamId}/force-rebuild-hierarchy`, {}, { headers });
      toast.success(`${res.data.message} - ${res.data.repairs_made} repairs made`);
      console.log('Force rebuild details:', res.data.details);
      
      // Refresh hierarchy data
      await fetchBrokenHierarchy(teamId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to rebuild hierarchy');
    } finally {
      setRepairLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Repair ALL teams at once (auto-assign to state_manager)
  const repairAllTeams = async () => {
    if (!window.confirm('This will automatically repair manager_id relationships for all teams (except Team Sudbeck). Continue?')) {
      return;
    }
    
    setRepairLoading(prev => ({ ...prev, all: true }));

    try {
      const res = await axios.post(`${API}/api/admin/auto-repair-all-teams`, {}, { headers });
      const data = res.data;
      
      toast.success(`${data.message}`);
      
      // Log details
      console.log('Repair results:', data.details);
      
      // Refresh all hierarchy data
      await fetchAllBrokenHierarchies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to repair teams');
    } finally {
      setRepairLoading(prev => ({ ...prev, all: false }));
    }
  };

  // Diagnostics functions
  const runDiagnoseInterviews = async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsData(null);
    setFixResult(null);
    
    try {
      const res = await axios.get(`${API}/api/admin/diagnose-interviews`, { headers });
      setDiagnosticsData(res.data);
      toast.success('Diagnosis complete');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run diagnostics');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const runFixOrphanedInterviews = async () => {
    if (!window.confirm(
      'This will fix orphaned interviews by reassigning them to each team\'s State Manager.\n\n' +
      '✅ Team Sudbeck will NOT be affected\n' +
      '✅ Original interviewer_id will be preserved for audit\n' +
      '✅ Only interviews with deleted interviewers will be fixed\n\n' +
      'Continue?'
    )) {
      return;
    }
    
    setDiagnosticsLoading(true);
    setFixResult(null);
    
    try {
      const res = await axios.post(`${API}/api/admin/fix-orphaned-interviews`, {}, { headers });
      setFixResult(res.data);
      toast.success(`Fixed ${res.data.fixed_total} orphaned interviews`);
      
      // Re-run diagnostics to show updated state
      await runDiagnoseInterviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix interviews');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  // Unassigned users functions
  const runDiagnoseUnassignedUsers = async () => {
    setUnassignedLoading(true);
    setUnassignedData(null);
    setSelectedUnassignedUsers([]);
    setAssignToTeamId('');
    setAssignManagerId('');
    
    try {
      const res = await axios.get(`${API}/api/admin/diagnose-unassigned-users`, { headers });
      setUnassignedData(res.data);
      
      if (res.data.unassigned_count > 0) {
        toast.warning(`Found ${res.data.unassigned_count} users without team assignment`);
      } else {
        toast.success('All users have team assignments');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to diagnose unassigned users');
    } finally {
      setUnassignedLoading(false);
    }
  };

  const toggleSelectUnassignedUser = (userId) => {
    setSelectedUnassignedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const selectAllUnassignedUsers = () => {
    if (!unassignedData) return;
    setSelectedUnassignedUsers(unassignedData.unassigned_users.map(u => u.id));
  };

  const deselectAllUnassignedUsers = () => {
    setSelectedUnassignedUsers([]);
  };

  const runFixUnassignedUsers = async () => {
    if (selectedUnassignedUsers.length === 0) {
      toast.error('Please select at least one user to fix');
      return;
    }
    if (!assignToTeamId) {
      toast.error('Please select a team to assign users to');
      return;
    }
    
    const teamName = unassignedData?.available_teams?.find(t => t.id === assignToTeamId)?.name || 'selected team';
    
    if (!window.confirm(
      `This will assign ${selectedUnassignedUsers.length} user(s) to "${teamName}".\n\n` +
      'These users will then be able to access the application.\n\n' +
      'Continue?'
    )) {
      return;
    }
    
    setUnassignedLoading(true);
    
    try {
      const payload = {
        user_ids: selectedUnassignedUsers,
        team_id: assignToTeamId,
        set_manager_id: assignManagerId && assignManagerId !== 'none' ? assignManagerId : null
      };
      const res = await axios.post(`${API}/api/admin/fix-unassigned-users`, payload, { headers });
      toast.success(res.data.message);
      
      // Re-run diagnostics to show updated state
      await runDiagnoseUnassignedUsers();
      fetchData(); // Refresh users list
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix unassigned users');
    } finally {
      setUnassignedLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    
    try {
      await axios.post(`${API}/api/admin/teams`, { name: newTeamName.trim() }, { headers });
      toast.success(`Team "${newTeamName}" created successfully`);
      setNewTeamName('');
      setShowNewTeamModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.role || !newUserForm.team_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const payload = {
        name: newUserForm.name,
        email: newUserForm.email,
        password: newUserForm.password,
        role: newUserForm.role,
        team_id: newUserForm.team_id,
        manager_id: newUserForm.manager_id && newUserForm.manager_id !== 'none' ? newUserForm.manager_id : null
      };
      
      await axios.post(`${API}/api/admin/users`, payload, { headers });
      toast.success(`User "${newUserForm.name}" created successfully`);
      setNewUserForm({ name: '', email: '', password: '', role: '', team_id: '', manager_id: '' });
      setShowCreateUserModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUser || !selectedTeamForAssignment) {
      toast.error('Please select a user and team');
      return;
    }
    
    try {
      const payload = {
        user_id: selectedUser.id,
        team_id: selectedTeamForAssignment
      };
      if (selectedRoleForAssignment && selectedRoleForAssignment !== 'keep_current') {
        payload.role = selectedRoleForAssignment;
      }
      
      await axios.post(`${API}/api/admin/users/assign-team`, payload, { headers });
      toast.success(`User assigned to team successfully`);
      setShowAssignUserModal(false);
      setSelectedUser(null);
      setSelectedTeamForAssignment('');
      setSelectedRoleForAssignment('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign user');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to DELETE "${userName}"? This will also delete all their activity data. This action cannot be undone.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/api/admin/users/${userId}`, { headers });
      toast.success(`User "${userName}" deleted successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const openEditUserModal = (user) => {
    setEditUserForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      team_id: user.team_id || '',
      manager_id: user.manager_id || ''
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      const payload = {};
      if (editUserForm.name) payload.name = editUserForm.name;
      if (editUserForm.email) payload.email = editUserForm.email;
      if (editUserForm.role) payload.role = editUserForm.role;
      if (editUserForm.team_id) payload.team_id = editUserForm.team_id;
      if (editUserForm.manager_id !== undefined) payload.manager_id = editUserForm.manager_id || null;

      await axios.put(`${API}/api/admin/users/${editUserForm.id}`, payload, { headers });
      toast.success('User updated successfully');
      setShowEditUserModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  // Get potential managers for selected team and role
  const getPotentialManagers = () => {
    if (!newUserForm.team_id || !newUserForm.role) return [];
    
    const teamUsers = users.filter(u => u.team_id === newUserForm.team_id);
    
    // Based on role, find valid managers
    const managerRoles = {
      'regional_manager': ['state_manager'],
      'district_manager': ['regional_manager'],
      'agent': ['district_manager']
    };
    
    const validManagerRoles = managerRoles[newUserForm.role] || [];
    return teamUsers.filter(u => validManagerRoles.includes(u.role));
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.team_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = selectedTeamFilter === 'all' || u.team_id === selectedTeamFilter;
    
    return matchesSearch && matchesTeam;
  });

  const roleColors = {
    'super_admin': 'bg-purple-100 text-purple-800',
    'state_manager': 'bg-blue-100 text-blue-800',
    'regional_manager': 'bg-green-100 text-green-800',
    'district_manager': 'bg-amber-100 text-amber-800',
    'agent': 'bg-slate-100 text-slate-800'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-panel">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Admin Panel
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage teams and users</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => setShowNewTeamModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-team-btn"
          >
            <Building2 className="w-4 h-4 mr-2" />
            New Team
          </Button>
          <Button 
            onClick={() => setShowCreateUserModal(true)}
            className="bg-green-600 hover:bg-green-700"
            data-testid="create-user-btn"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <Button
          variant={activeTab === 'teams' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('teams')}
          className={activeTab === 'teams' ? 'bg-slate-800 text-white' : ''}
          data-testid="teams-tab"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Teams ({teams.length})
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'bg-slate-800 text-white' : ''}
          data-testid="users-tab"
        >
          <Users className="w-4 h-4 mr-2" />
          Users ({users.length})
        </Button>
        <Button
          variant={activeTab === 'repair' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('repair')}
          className={activeTab === 'repair' ? 'bg-orange-600 text-white' : 'text-orange-600 border-orange-200'}
          data-testid="repair-tab"
        >
          <Wrench className="w-4 h-4 mr-2" />
          Repair Hierarchy
        </Button>
        <Button
          variant={activeTab === 'diagnostics' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('diagnostics')}
          className={activeTab === 'diagnostics' ? 'bg-purple-600 text-white' : 'text-purple-600 border-purple-200'}
          data-testid="diagnostics-tab"
        >
          <Search className="w-4 h-4 mr-2" />
          Diagnostics
        </Button>
      </div>

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="teams-grid">
          {teams.map(team => (
            <Card key={team.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`team-card-${team.id}`}
              onClick={() => {
                setSelectedTeamFilter(team.id);
                setActiveTab('users');
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    {team.name}
                  </CardTitle>
                  {team.settings?.is_default && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <CardDescription>
                  {team.user_count} members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Created: {new Date(team.created_at).toLocaleDateString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Mobile-friendly Create User Button */}
          <Button 
            onClick={() => setShowCreateUserModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 py-6 text-base"
            data-testid="create-user-btn-mobile"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            + Create New User
          </Button>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search users by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="user-search-input"
              />
            </div>
            <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="team-filter">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="users-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Team</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Reports To</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Subs</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 ${u.subordinate_count === 0 && u.role === 'state_manager' ? 'bg-yellow-50' : ''}`} data-testid={`user-row-${u.id}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${roleColors[u.role] || 'bg-slate-100'}`}>
                          {u.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.team_name === 'Unassigned' ? (
                          <span className="text-red-500 text-xs font-medium">Unassigned</span>
                        ) : (
                          <span className="text-slate-600 text-xs">{u.team_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.manager_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {u.subordinate_count > 0 ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            {u.subordinate_count}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditUserModal(u)}
                            data-testid={`edit-user-btn-${u.id}`}
                            title="Edit user details"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedTeamForAssignment(u.team_id || '');
                              setSelectedRoleForAssignment(u.role || '');
                              setShowAssignUserModal(true);
                            }}
                            data-testid={`assign-user-btn-${u.id}`}
                            title="Reassign team/role"
                          >
                            <UserCog className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            data-testid={`delete-user-btn-${u.id}`}
                            title="Delete user"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Repair Hierarchy Tab */}
      {activeTab === 'repair' && (
        <div className="space-y-6" data-testid="repair-hierarchy-tab">
          {/* Header */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Wrench className="w-5 h-5" />
                Repair Team Hierarchies
              </CardTitle>
              <CardDescription className="text-orange-700">
                This tool fixes broken manager_id relationships. It will NOT modify team_id, reset users, 
                or touch Team Sudbeck. Use this to repair hierarchies for newly created teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={fetchAllBrokenHierarchies}
                  disabled={repairLoading.all}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  data-testid="check-all-teams-btn"
                >
                  {repairLoading.all ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Check All Teams
                </Button>
                <Button
                  onClick={repairAllTeams}
                  disabled={repairLoading.all}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  data-testid="repair-all-teams-btn"
                >
                  {repairLoading.all ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                  Repair All Teams (Auto)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Teams Grid */}
          <div className="grid gap-4 md:grid-cols-2" data-testid="repair-teams-grid">
            {teams.map(team => {
                const data = hierarchyData[team.id];
                const isLoading = repairLoading[team.id];
                const hasBroken = data && data.broken_count > 0;
                const isHealthy = data && data.broken_count === 0;

                return (
                  <Card 
                    key={team.id} 
                    className={`transition-all ${hasBroken ? 'border-red-300 bg-red-50' : isHealthy ? 'border-green-300 bg-green-50' : ''}`}
                    data-testid={`repair-team-card-${team.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-slate-600" />
                          {team.name}
                        </CardTitle>
                        {hasBroken && (
                          <span className="flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {data.broken_count} broken
                          </span>
                        )}
                        {isHealthy && (
                          <span className="flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Healthy
                          </span>
                        )}
                      </div>
                      <CardDescription>
                        {team.user_count} members
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Status info */}
                      {data && (
                        <div className="text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Total Users:</span>
                            <span className="font-medium">{data.total_users}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Broken Relationships:</span>
                            <span className={`font-medium ${hasBroken ? 'text-red-600' : 'text-green-600'}`}>
                              {data.broken_count}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Broken users list */}
                      {hasBroken && data.broken_users && (
                        <div className="bg-white rounded border border-red-200 p-2 text-xs">
                          <div className="font-medium text-red-800 mb-1">Users needing repair:</div>
                          {data.broken_users.map(user => (
                            <div key={user.id} className="flex items-center gap-1 text-slate-600 py-0.5">
                              <ArrowRight className="w-3 h-3 text-red-400" />
                              {user.name} ({user.role?.replace('_', ' ')})
                              <span className="text-red-500">- {user.issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchBrokenHierarchy(team.id)}
                          disabled={isLoading}
                          data-testid={`check-team-btn-${team.id}`}
                        >
                          {isLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
                          Check
                        </Button>
                        {hasBroken && (
                          <Button
                            size="sm"
                            onClick={() => openRepairModal(team)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            data-testid={`repair-team-btn-${team.id}`}
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            Repair ({data.broken_count})
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceRebuildTeamHierarchy(team.id, team.name)}
                          disabled={isLoading}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          data-testid={`force-rebuild-btn-${team.id}`}
                          title="Force rebuild entire hierarchy from scratch"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Force Rebuild
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Diagnostics Tab */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6" data-testid="diagnostics-tab-content">
          {/* Header */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Search className="w-5 h-5" />
                Data Diagnostics
              </CardTitle>
              <CardDescription className="text-purple-700">
                Diagnose and fix data integrity issues. These tools help recover orphaned records 
                when users are deleted but their data remains.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                <h4 className="font-medium text-slate-800 mb-2">Safety Guarantees:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>✅ Original data is preserved for audit trail</li>
                  <li>✅ Only orphaned records (with deleted owners) are modified</li>
                  <li>✅ team_id is never changed</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={runDiagnoseInterviews}
                  disabled={diagnosticsLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="diagnose-interviews-btn"
                >
                  {diagnosticsLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Diagnose Interviews
                </Button>
                <Button
                  onClick={runFixOrphanedInterviews}
                  disabled={diagnosticsLoading || !diagnosticsData || diagnosticsData.orphaned_total === 0}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  data-testid="fix-interviews-btn"
                >
                  {diagnosticsLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                  Fix Orphaned Interviews
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostics Results */}
          {diagnosticsData && (
            <Card data-testid="diagnostics-results">
              <CardHeader>
                <CardTitle className="text-lg">Interview Diagnostics Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-800">{diagnosticsData.total_interviews}</div>
                    <div className="text-sm text-blue-600">Total Interviews</div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${diagnosticsData.orphaned_total > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold ${diagnosticsData.orphaned_total > 0 ? 'text-red-800' : 'text-green-800'}`}>
                      {diagnosticsData.orphaned_total}
                    </div>
                    <div className={`text-sm ${diagnosticsData.orphaned_total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Orphaned Interviews
                    </div>
                  </div>
                </div>

                {/* Interviews by Team */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Interviews by Team:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(diagnosticsData.interviews_by_team || {}).map(([team, count]) => (
                      <div key={team} className="bg-slate-50 px-3 py-2 rounded flex justify-between">
                        <span className="text-slate-700">{team}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orphaned by Team */}
                {diagnosticsData.orphaned_total > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Orphaned by Team:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(diagnosticsData.orphaned_by_team || {}).map(([team, count]) => (
                        <div key={team} className="bg-red-50 px-3 py-2 rounded flex justify-between">
                          <span className="text-red-700">{team}</span>
                          <span className="font-medium text-red-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orphaned Interview Details */}
                {diagnosticsData.orphaned_interviews && diagnosticsData.orphaned_interviews.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Orphaned Interview Details (first 50):</h4>
                    <div className="max-h-60 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Candidate</th>
                            <th className="px-3 py-2 text-left">Team</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Issue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {diagnosticsData.orphaned_interviews.map((interview, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2">{interview.candidate_name}</td>
                              <td className="px-3 py-2">{interview.team_name}</td>
                              <td className="px-3 py-2">{interview.interview_date?.split('T')[0]}</td>
                              <td className="px-3 py-2 text-red-600 text-xs">{interview.issue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {diagnosticsData.orphaned_total === 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-green-800 font-medium">All interviews are healthy!</div>
                    <div className="text-green-600 text-sm">No orphaned interviews found.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fix Results */}
          {fixResult && (
            <Card className="border-green-200 bg-green-50" data-testid="fix-results">
              <CardHeader>
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Fix Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center border border-green-200">
                    <div className="text-2xl font-bold text-green-800">{fixResult.fixed_total}</div>
                    <div className="text-sm text-green-600">Fixed</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center border border-slate-200">
                    <div className="text-2xl font-bold text-slate-800">{fixResult.skipped_team_sudbeck}</div>
                    <div className="text-sm text-slate-600">Skipped (Sudbeck)</div>
                  </div>
                </div>

                {/* Fixed by Team */}
                {Object.keys(fixResult.fixed_by_team || {}).length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-800 mb-2">Fixed by Team:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(fixResult.fixed_by_team).map(([team, count]) => (
                        <div key={team} className="bg-white px-3 py-2 rounded border border-green-200 flex justify-between">
                          <span className="text-green-700">{team}</span>
                          <span className="font-medium text-green-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-green-700 bg-white p-3 rounded border border-green-200">
                  <strong>Audit Trail:</strong> {fixResult.audit_trail}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unassigned Users Section */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Unassigned Users Diagnostic
              </CardTitle>
              <CardDescription className="text-orange-700">
                Find and fix users who cannot access the app because they do not have a team assigned.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={runDiagnoseUnassignedUsers}
                  disabled={unassignedLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="diagnose-unassigned-btn"
                >
                  {unassignedLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Find Unassigned Users
                </Button>
                
                {/* Fix missing Team Sudbeck record */}
                <Button
                  onClick={async () => {
                    try {
                      const res = await axios.post(`${API}/api/admin/create-missing-team-record`, {}, { headers });
                      if (res.data.created?.length > 0) {
                        toast.success(`Created team record: ${res.data.created.map(t => t.name).join(', ')}`);
                        await fetchData(); // Refresh teams list
                      } else {
                        toast.info(res.data.message);
                      }
                    } catch (error) {
                      toast.error(error.response?.data?.detail || 'Failed to create team record');
                    }
                  }}
                  variant="outline"
                  className="border-blue-400 text-blue-700 hover:bg-blue-50"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Recover Team Sudbeck Record
                </Button>
                
                {/* Debug button */}
                <Button
                  onClick={async () => {
                    try {
                      const res = await axios.get(`${API}/api/admin/debug-teams`, { headers });
                      console.log('DEBUG TEAMS:', res.data);
                      const teamList = res.data.teams.map(t => `${t.name} (${t.user_count} users)`).join('\n');
                      alert(`TEAMS IN DATABASE (${res.data.total_teams_in_db}):\n\n${teamList}\n\nCheck browser console for full details.`);
                    } catch (error) {
                      toast.error('Failed to fetch debug info');
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Debug Teams
                </Button>
              </div>
              
              <p className="text-xs text-orange-700">
                If Team Sudbeck is missing from dropdowns, click the Recover button first.
              </p>
            </CardContent>
          </Card>

          {/* Unassigned Users Results */}
          {unassignedData && (
            <Card data-testid="unassigned-results">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {unassignedData.unassigned_count > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  Unassigned Users Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-lg text-center ${unassignedData.unassigned_count > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                  <div className={`text-3xl font-bold ${unassignedData.unassigned_count > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                    {unassignedData.unassigned_count}
                  </div>
                  <div className={`text-sm ${unassignedData.unassigned_count > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    Users Without Team Assignment
                  </div>
                </div>

                {unassignedData.unassigned_count > 0 && (
                  <>
                    {/* Selection controls */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={selectAllUnassignedUsers}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllUnassignedUsers}>
                        Deselect All
                      </Button>
                      <span className="text-sm text-slate-600">
                        {selectedUnassignedUsers.length} of {unassignedData.unassigned_count} selected
                      </span>
                    </div>

                    {/* User list with checkboxes */}
                    <div className="max-h-60 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left w-8">
                              <input 
                                type="checkbox" 
                                checked={selectedUnassignedUsers.length === unassignedData.unassigned_count}
                                onChange={(e) => e.target.checked ? selectAllUnassignedUsers() : deselectAllUnassignedUsers()}
                              />
                            </th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Role</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {unassignedData.unassigned_users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <input 
                                  type="checkbox" 
                                  checked={selectedUnassignedUsers.includes(u.id)}
                                  onChange={() => toggleSelectUnassignedUser(u.id)}
                                />
                              </td>
                              <td className="px-3 py-2 font-medium">{u.name || '-'}</td>
                              <td className="px-3 py-2">{u.email}</td>
                              <td className="px-3 py-2">{u.role || '-'}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-1 rounded ${u.status === 'active' || !u.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {u.status || 'active'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Assignment controls - Simple and direct */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-slate-800">Assign Selected Users To:</h4>
                      
                      {/* Selected team indicator */}
                      {assignToTeamId && (
                        <div className="bg-blue-100 p-2 rounded text-blue-800 text-sm">
                          <strong>Selected Team:</strong> {teams.find(t => t.id === assignToTeamId)?.name || assignToTeamId}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="assign-team" className="text-sm text-slate-600 mb-1 block">Team (required)</Label>
                          <Select value={assignToTeamId} onValueChange={setAssignToTeamId}>
                            <SelectTrigger id="assign-team">
                              <SelectValue placeholder="Select team..." />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Show ALL teams - no filtering */}
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="assign-manager" className="text-sm text-slate-600 mb-1 block">Manager (optional)</Label>
                          <Select value={assignManagerId} onValueChange={setAssignManagerId}>
                            <SelectTrigger id="assign-manager">
                              <SelectValue placeholder="No manager..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {assignToTeamId && users
                                .filter(u => u.team_id === assignToTeamId && ['state_manager', 'regional_manager', 'district_manager'].includes(u.role))
                                .map((manager) => (
                                  <SelectItem key={manager.id} value={manager.id}>
                                    {manager.name} ({manager.role})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        onClick={runFixUnassignedUsers}
                        disabled={unassignedLoading || selectedUnassignedUsers.length === 0 || !assignToTeamId}
                        className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto"
                        data-testid="fix-unassigned-btn"
                      >
                        {unassignedLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                        Assign {selectedUnassignedUsers.length} User(s) to Team
                      </Button>
                    </div>
                  </>
                )}

                {unassignedData.unassigned_count === 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-green-800 font-medium">All users are assigned to teams!</div>
                    <div className="text-green-600 text-sm">No users are blocked from accessing the app.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      <Dialog open={showNewTeamModal} onOpenChange={setShowNewTeamModal}>
        <DialogContent data-testid="create-team-modal">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team for organizing users and data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="Enter team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                data-testid="team-name-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTeamModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} data-testid="confirm-create-team">
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent className="max-w-md" data-testid="create-user-modal">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user directly into a team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select 
                value={newUserForm.team_id} 
                onValueChange={(val) => setNewUserForm({...newUserForm, team_id: val, manager_id: ''})}
              >
                <SelectTrigger data-testid="new-user-team">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                placeholder="John Smith"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                data-testid="new-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                data-testid="new-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                data-testid="new-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select 
                value={newUserForm.role} 
                onValueChange={(val) => setNewUserForm({...newUserForm, role: val, manager_id: ''})}
              >
                <SelectTrigger data-testid="new-user-role">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state_manager">State Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="district_manager">District Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUserForm.role && newUserForm.role !== 'state_manager' && (
              <div className="space-y-2">
                <Label>Reports To</Label>
                <Select 
                  value={newUserForm.manager_id} 
                  onValueChange={(val) => setNewUserForm({...newUserForm, manager_id: val})}
                >
                  <SelectTrigger data-testid="new-user-manager">
                    <SelectValue placeholder="Select manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (set later in Team Mgmt)</SelectItem>
                    {getPotentialManagers().map(manager => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} ({manager.role?.replace('_', ' ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {getPotentialManagers().length === 0 && newUserForm.team_id && 
                    "No managers found. Create the manager first, or set this later in Team Mgmt."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700" data-testid="confirm-create-user">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User Modal */}
      <Dialog open={showAssignUserModal} onOpenChange={setShowAssignUserModal}>
        <DialogContent data-testid="assign-user-modal">
          <DialogHeader>
            <DialogTitle>Edit User Assignment</DialogTitle>
            <DialogDescription>
              {selectedUser && `Update team or role for ${selectedUser.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={selectedTeamForAssignment} onValueChange={setSelectedTeamForAssignment}>
                <SelectTrigger data-testid="team-select">
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.user_count} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRoleForAssignment} onValueChange={setSelectedRoleForAssignment}>
                <SelectTrigger data-testid="role-select">
                  <SelectValue placeholder="Keep current role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep_current">Keep current role</SelectItem>
                  <SelectItem value="state_manager">State Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="district_manager">District Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignUser} data-testid="confirm-assign-user">
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair Hierarchy Modal */}
      <Dialog open={showRepairModal} onOpenChange={setShowRepairModal}>
        <DialogContent className="max-w-lg" data-testid="repair-hierarchy-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              Repair Hierarchy - {selectedTeamForRepair?.name}
            </DialogTitle>
            <DialogDescription>
              Assign managers to users with broken relationships. This will ONLY update manager_id.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeamForRepair && hierarchyData[selectedTeamForRepair.id] && (
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {hierarchyData[selectedTeamForRepair.id].broken_users?.map(user => (
                <div key={user.id} className="p-3 bg-slate-50 rounded-lg border">
                  <div className="font-medium text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-500 mb-2">
                    {user.role?.replace('_', ' ').toUpperCase()} • {user.issue}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Assign to Manager:</Label>
                    <Select
                      value={managerAssignments[user.id] || ''}
                      onValueChange={(val) => setManagerAssignments(prev => ({ ...prev, [user.id]: val }))}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid={`assign-manager-${user.id}`}>
                        <SelectValue placeholder="Select manager..." />
                      </SelectTrigger>
                      <SelectContent>
                        {hierarchyData[selectedTeamForRepair.id].potential_managers
                          ?.filter(m => {
                            // Filter based on role hierarchy
                            const validManagers = {
                              'regional_manager': ['state_manager'],
                              'district_manager': ['state_manager', 'regional_manager'],
                              'agent': ['district_manager', 'regional_manager']
                            };
                            return validManagers[user.role]?.includes(m.role) || m.role === 'state_manager';
                          })
                          .map(manager => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name} ({manager.role?.replace('_', ' ')})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepairModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => repairTeamHierarchy(selectedTeamForRepair?.id)}
              disabled={repairLoading[selectedTeamForRepair?.id]}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="confirm-repair-btn"
            >
              {repairLoading[selectedTeamForRepair?.id] ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="w-4 h-4 mr-2" />
              )}
              Apply Repairs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="max-w-md" data-testid="edit-user-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Edit User Details
            </DialogTitle>
            <DialogDescription>
              Update user name, email, or other details. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editUserForm.name}
                onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                placeholder="Full Name"
                data-testid="edit-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email / Username</Label>
              <Input
                value={editUserForm.email}
                onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                placeholder="email@example.com"
                data-testid="edit-user-email"
              />
              <p className="text-xs text-slate-500">
                Format: First.Last@pmagent.net (capitalized)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={editUserForm.role} 
                onValueChange={(val) => setEditUserForm({...editUserForm, role: val})}
              >
                <SelectTrigger data-testid="edit-user-role">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state_manager">State Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="district_manager">District Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select 
                value={editUserForm.team_id} 
                onValueChange={(val) => setEditUserForm({...editUserForm, team_id: val})}
              >
                <SelectTrigger data-testid="edit-user-team">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-edit-user">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
