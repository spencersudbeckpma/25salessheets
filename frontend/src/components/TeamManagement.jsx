import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserPlus, Mail, Trash2, Edit2, Save, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [editMember, setEditMember] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());

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
          sales: activity.sales,
          new_face_sold: activity.new_face_sold,
          premium: activity.premium
        });
      } else {
        setEditActivity({
          contacts: 0,
          appointments: 0,
          presentations: 0,
          referrals: 0,
          testimonials: 0,
          sales: 0,
          new_face_sold: 0,
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
      await axios.put(`${API}/users/${editMember}/activities/${selectedDate}`, {
        date: selectedDate,
        ...editActivity
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
    const roleHierarchy = {
      state_manager: ['regional_manager'],
      regional_manager: ['district_manager'],
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
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
            <TabsTrigger value="invite" data-testid="invite-tab" className="py-2">Create Invites</TabsTrigger>
            <TabsTrigger value="edit" data-testid="edit-data-tab" className="py-2">Edit Team Data</TabsTrigger>
          </TabsList>

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
                            step={key === 'premium' ? '0.01' : key === 'presentations' ? '0.5' : '1'}
                            value={editActivity[key]}
                            onChange={(e) => setEditActivity({ ...editActivity, [key]: parseFloat(e.target.value) || 0 })}
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
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;