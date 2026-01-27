import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Users, Building2, UserPlus, RefreshCw, Search, Shield, UserCog, ChevronRight, Wrench, AlertTriangle, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';

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
    const excludeTeams = ['Team Sudbeck']; // Don't touch default team
    const teamsToCheck = teams.filter(t => !excludeTeams.includes(t.name));
    
    for (const team of teamsToCheck) {
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
        manager_id: newUserForm.manager_id || null
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
      if (selectedRoleForAssignment) {
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
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50" data-testid={`user-row-${u.id}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${roleColors[u.role] || 'bg-slate-100'}`}>
                          {u.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.team_name === 'Unassigned' ? (
                          <span className="text-red-500 text-xs font-medium">Unassigned</span>
                        ) : (
                          <span className="text-slate-600">{u.team_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
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
                          >
                            <UserCog className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            data-testid={`delete-user-btn-${u.id}`}
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
            {teams
              .filter(team => team.name !== 'Team Sudbeck')
              .map(team => {
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Team Sudbeck (protected) */}
          <Card className="bg-slate-50 border-slate-200 opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-500">
                <Shield className="w-5 h-5" />
                Team Sudbeck (Protected)
              </CardTitle>
              <CardDescription>
                This team is protected and will not be modified by the repair tool.
              </CardDescription>
            </CardHeader>
          </Card>
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
                  {teams.filter(t => !t.settings?.is_default || t.name !== 'Team Sudbeck').map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                  {teams.filter(t => t.settings?.is_default).map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} (Default)
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
                    <SelectItem value="">None (set later in Team Mgmt)</SelectItem>
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
                  <SelectItem value="">Keep current role</SelectItem>
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
    </div>
  );
};

export default AdminPanel;
