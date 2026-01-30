import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Award, Calendar, DollarSign, User, Users, Search, 
  CheckCircle, ArrowUpRight, Plus, Edit2, Trash2, X,
  Trophy, Target, UserPlus
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NPATracker = ({ user }) => {
  const [npaData, setNpaData] = useState({ active: [], achieved: [], goal: 1000 });
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'achieved'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    start_date: new Date().toISOString().split('T')[0],
    upline_dm: '',
    upline_rm: '',
    total_premium: 0,
    notes: '',
    user_id: ''
  });

  useEffect(() => {
    fetchNPAData();
    fetchTeamMembers();
  }, []);

  const fetchNPAData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/npa-tracker`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNpaData(response.data);
    } catch (error) {
      toast.error('Failed to fetch NPA data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/team/all-members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to agents, DMs, and RMs - anyone who could be tracked for NPA
      setTeamMembers(response.data.filter(m => 
        ['agent', 'district_manager', 'regional_manager'].includes(m.role)
      ));
    } catch (error) {
      console.error('Failed to fetch team members');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_premium' ? parseFloat(value) || 0 : value
    }));
  };

  const handleMemberSelect = (memberId) => {
    setSelectedMemberId(memberId);
    if (memberId) {
      const member = teamMembers.find(m => m.id === memberId);
      if (member) {
        // Find member's manager for upline info
        const manager = teamMembers.find(m => m.id === member.manager_id);
        setFormData(prev => ({
          ...prev,
          name: member.name || '',
          email: member.email || '',
          phone: member.phone || '',
          user_id: member.id,
          upline_dm: manager?.role === 'district_manager' ? manager.name : '',
          upline_rm: manager?.role === 'regional_manager' ? manager.name : ''
        }));
      }
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      start_date: new Date().toISOString().split('T')[0],
      upline_dm: '',
      upline_rm: '',
      total_premium: 0,
      notes: '',
      user_id: ''
    });
    setSelectedMemberId('');
  };

  const handleAddAgent = async () => {
    if (!formData.name) {
      toast.error('Please select a team member or enter agent name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/npa-tracker`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Added ${formData.name} to NPA tracking!`);
      setShowAddModal(false);
      resetForm();
      fetchNPAData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add agent');
    }
  };

  const handleEditClick = (agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name || '',
      phone: agent.phone || '',
      email: agent.email || '',
      start_date: agent.start_date || '',
      upline_dm: agent.upline_dm || '',
      upline_rm: agent.upline_rm || '',
      total_premium: agent.total_premium || 0,
      notes: agent.notes || '',
      user_id: agent.user_id || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateAgent = async () => {
    if (!formData.name) {
      toast.error('Please enter agent name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/npa-tracker/${editingAgent.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Agent updated successfully!');
      setShowEditModal(false);
      setEditingAgent(null);
      resetForm();
      fetchNPAData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update agent');
    }
  };

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`Remove ${agentName} from NPA tracking?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/npa-tracker/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Agent removed from tracking');
      fetchNPAData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove agent');
    }
  };

  // Get available members (not already being tracked)
  const allTracked = [...(npaData.active || []), ...(npaData.achieved || [])];
  const availableMembers = teamMembers.filter(
    m => !allTracked.some(a => a.user_id === m.id || a.name === m.name)
  );

  // Filter agents based on search
  const filterAgents = (agents) => {
    if (!searchTerm) return agents;
    const term = searchTerm.toLowerCase();
    return agents.filter(agent => 
      agent.name?.toLowerCase().includes(term) ||
      agent.upline_dm?.toLowerCase().includes(term) ||
      agent.upline_rm?.toLowerCase().includes(term) ||
      agent.phone?.includes(term)
    );
  };

  const activeAgents = filterAgents(npaData.active || []);
  const achievedAgents = filterAgents(npaData.achieved || []);
  const goal = npaData.goal || 1000;

  // Stats
  const totalActive = (npaData.active || []).length;
  const totalAchieved = (npaData.achieved || []).length;
  const totalPremium = [...(npaData.active || []), ...(npaData.achieved || [])].reduce((sum, a) => sum + (a.total_premium || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Add/Edit Modal Component
  const AgentModal = ({ isEdit, onClose, onSubmit }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {isEdit ? 'Edit NPA Agent' : 'Add Agent to NPA Tracking'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Info Banner */}
          {!isEdit && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-200">
              <p className="font-medium">ℹ️ Select a team member from the system</p>
              <p className="mt-1">Only users in the system can be tracked. Premium is calculated automatically from their logged activities.</p>
            </div>
          )}

          {/* Team Member Selection - Only for Add modal */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Team Member *</label>
              <select
                value={selectedMemberId}
                onChange={(e) => handleMemberSelect(e.target.value)}
                className="w-full border rounded-lg p-3"
              >
                <option value="">-- Select a team member --</option>
                {availableMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role?.replace('_', ' ')})
                  </option>
                ))}
              </select>
              {availableMembers.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  All team members are already being tracked or have exceeded NPA goal automatically.
                </p>
              )}
            </div>
          )}

          {/* Show selected member info */}
          {!isEdit && selectedMemberId && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="font-medium text-green-800">{formData.name}</p>
              <p className="text-sm text-green-600">{formData.email}</p>
            </div>
          )}

          {/* Edit Mode - Show Agent Name */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium mb-1">Agent Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Full name"
                disabled
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="555-123-4567"
                disabled={!isEdit && selectedMemberId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="agent@email.com"
                disabled={!isEdit && selectedMemberId}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <Input
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Upline DM</label>
              <Input
                name="upline_dm"
                value={formData.upline_dm}
                onChange={handleInputChange}
                placeholder="District Manager name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Upline RM</label>
              <Input
                name="upline_rm"
                value={formData.upline_rm}
                onChange={handleInputChange}
                placeholder="Regional Manager name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Total Premium ($)
              <span className="text-gray-500 font-normal ml-2">
                Goal: ${goal.toLocaleString()}
              </span>
            </label>
            {isEdit ? (
              <Input
                name="total_premium"
                type="number"
                min="0"
                step="0.01"
                value={formData.total_premium}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            ) : (
              <div className="p-3 bg-gray-100 rounded-lg text-gray-600">
                <p className="text-sm">Premium is automatically calculated from logged activities.</p>
                {selectedMemberId && (
                  <p className="text-lg font-semibold text-gray-800 mt-1">
                    Current: ${formData.total_premium?.toLocaleString() || 0}
                  </p>
                )}
              </div>
            )}
            {formData.total_premium >= goal && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle size={14} /> Agent has achieved NPA status!
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full border rounded-lg p-3 min-h-[80px]"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
            <p className="font-medium mb-1">NPA Status:</p>
            <p>Agent becomes NPA (New Producing Agent) after reaching ${goal.toLocaleString()} in total premium.</p>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex gap-3 justify-end sticky bottom-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={!isEdit && !selectedMemberId}
          >
            {isEdit ? 'Update Agent' : 'Add to Tracking'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="text-amber-600" size={20} />
            NPA Tracker - First Production
          </h3>
          <p className="text-sm text-gray-500">
            Track agents toward ${goal.toLocaleString()} premium to become NPA
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{totalActive + totalAchieved}</div>
            <div className="text-sm opacity-90">Total Agents</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{totalActive}</div>
            <div className="text-sm opacity-90">Working Toward NPA</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{totalAchieved}</div>
            <div className="text-sm opacity-90 flex items-center gap-1">
              <Trophy size={14} /> Achieved NPA
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              ${(totalPremium / 1000).toFixed(1)}K
            </div>
            <div className="text-sm opacity-90">Total Premium</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, or upline..."
            className="pl-10"
          />
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'active' 
                ? 'bg-white shadow text-amber-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Target size={16} />
              In Progress ({(npaData.active || []).length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('achieved')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'achieved' 
                ? 'bg-white shadow text-green-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Trophy size={16} />
              Achieved NPA ({(npaData.achieved || []).length})
            </span>
          </button>
        </div>
      </div>

      {/* Active Agents Tab */}
      {activeTab === 'active' && (
        <>
          {activeAgents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No agents in progress</p>
                <p className="text-sm mt-2">Click "Add Agent" to start tracking someone</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Agent</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Progress</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Premium</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Start Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Upline DM</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Upline RM</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAgents.map((agent, idx) => (
                        <tr key={agent.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{agent.name}</div>
                            <div className="text-xs text-gray-500">{agent.phone || agent.email || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-32">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{agent.progress_percent}%</span>
                                <span className="text-gray-500">${goal}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${Math.min(agent.progress_percent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">${agent.total_premium?.toLocaleString() || 0}</span>
                            <div className="text-xs text-gray-500">
                              ${(goal - agent.total_premium).toLocaleString()} to go
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {agent.start_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar size={14} className="text-gray-400" />
                                {agent.start_date}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {agent.upline_dm ? (
                              <div className="flex items-center gap-1 text-sm">
                                <User size={14} className="text-blue-500" />
                                {agent.upline_dm}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {agent.upline_rm ? (
                              <div className="flex items-center gap-1 text-sm">
                                <ArrowUpRight size={14} className="text-purple-500" />
                                {agent.upline_rm}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditClick(agent)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              {['super_admin', 'state_manager', 'regional_manager'].includes(user.role) && (
                                <button
                                  onClick={() => handleDeleteAgent(agent.id, agent.name)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Achieved NPA Tab */}
      {activeTab === 'achieved' && (
        <>
          {achievedAgents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                <p>No agents have achieved NPA yet</p>
                <p className="text-sm mt-2">Agents who reach ${goal.toLocaleString()} premium will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Agent</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Total Premium</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Achievement Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Upline DM</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Upline RM</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {achievedAgents.map((agent, idx) => (
                        <tr key={agent.id} className={idx % 2 === 0 ? 'bg-green-50' : 'bg-white'}>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-green-600">
                              <Trophy size={18} className="text-amber-500" />
                              <span className="font-medium">NPA</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{agent.name}</div>
                            <div className="text-xs text-gray-500">{agent.phone || agent.email || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-green-600">${agent.total_premium?.toLocaleString() || 0}</span>
                            <div className="text-xs text-gray-500">
                              +${((agent.total_premium || 0) - goal).toLocaleString()} over goal
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {agent.achievement_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <CheckCircle size={14} className="text-green-500" />
                                {agent.achievement_date}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {agent.upline_dm ? (
                              <div className="flex items-center gap-1 text-sm">
                                <User size={14} className="text-blue-500" />
                                {agent.upline_dm}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {agent.upline_rm ? (
                              <div className="flex items-center gap-1 text-sm">
                                <ArrowUpRight size={14} className="text-purple-500" />
                                {agent.upline_rm}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditClick(agent)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              {['super_admin', 'state_manager', 'regional_manager'].includes(user.role) && (
                                <button
                                  onClick={() => handleDeleteAgent(agent.id, agent.name)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AgentModal 
          isEdit={false} 
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }} 
          onSubmit={handleAddAgent} 
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <AgentModal 
          isEdit={true} 
          onClose={() => {
            setShowEditModal(false);
            setEditingAgent(null);
            resetForm();
          }} 
          onSubmit={handleUpdateAgent} 
        />
      )}
    </div>
  );
};

export default NPATracker;
