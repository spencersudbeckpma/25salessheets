import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Users, Building2, UserPlus, RefreshCw, Search, Shield, UserCog, ChevronRight, Wrench, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

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
      <div className="flex gap-2 border-b border-slate-200 pb-2">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
    </div>
  );
};

export default AdminPanel;
