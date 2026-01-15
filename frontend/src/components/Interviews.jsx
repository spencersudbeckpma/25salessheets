import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Users, Plus, Trash2, Save, X, Search, Calendar, 
  CheckCircle, Circle, ClipboardList, UserPlus, 
  ArrowRight, Eye, Edit, BarChart3, List, Columns, Printer, Share2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Interviews = ({ user }) => {
  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState({
    total: 0, this_week: 0, this_month: 0, this_year: 0,
    moving_forward: 0, not_moving_forward: 0, second_interview_scheduled: 0, completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSecondInterviewModal, setShowSecondInterviewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedShareMembers, setSelectedShareMembers] = useState([]);

  const [formData, setFormData] = useState({
    candidate_name: '',
    candidate_location: '',
    candidate_phone: '',
    interview_date: new Date().toISOString().split('T')[0],
    hobbies_interests: '',
    must_have_commission: false,
    must_have_travel: false,
    must_have_background: false,
    must_have_car: false,
    work_history: '',
    what_would_change: '',
    why_left_recent: '',
    other_interviews: '',
    top_3_looking_for: '',
    why_important: '',
    situation_6_12_months: '',
    family_impact: '',
    competitiveness_scale: 5,
    competitiveness_example: '',
    work_ethic_scale: 5,
    work_ethic_example: '',
    career_packet_sent: false,
    candidate_strength: 3,
    red_flags_notes: '',
    status: 'new'
  });

  useEffect(() => {
    fetchInterviews();
    fetchTeamMembers();
    fetchStats();
  }, []);

  const fetchInterviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/interviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterviews(response.data);
    } catch (error) {
      toast.error('Failed to fetch interviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/team/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to managers only (people who might want to see interviews)
      setTeamMembers(response.data.filter(m => 
        ['state_manager', 'regional_manager', 'district_manager'].includes(m.role)
      ));
    } catch (error) {
      console.error('Failed to fetch team members');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/interviews/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const handleShareInterview = async () => {
    if (selectedShareMembers.length === 0) {
      toast.error('Please select at least one team member to share with');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/interviews/${selectedInterview.id}/share`, {
        shared_with: selectedShareMembers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Interview shared successfully!');
      setShowShareModal(false);
      setSelectedShareMembers([]);
      fetchInterviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to share interview');
    }
  };

  const toggleShareMember = (memberId) => {
    setSelectedShareMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (moveForward = true) => {
    if (!formData.candidate_name.trim()) {
      toast.error('Candidate name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const submitData = {
        ...formData,
        status: moveForward ? 'moving_forward' : 'not_moving_forward'
      };

      await axios.post(`${API}/interviews`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(moveForward ? 'Interview submitted - Moving Forward!' : 'Interview submitted - Not Moving Forward');
      resetForm();
      fetchInterviews();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save interview');
    }
  };

  const updateStatus = async (interview, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/interviews/${interview.id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status updated');
      fetchInterviews();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const scheduleSecondInterview = async () => {
    if (!selectedInterview) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/interviews/${selectedInterview.id}`, {
        status: 'second_interview_scheduled',
        second_interview_date: formData.second_interview_date,
        second_interview_notes: formData.second_interview_notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('2nd Interview Scheduled!');
      setShowSecondInterviewModal(false);
      setSelectedInterview(null);
      fetchInterviews();
      fetchStats();
    } catch (error) {
      toast.error('Failed to schedule interview');
    }
  };

  const completeInterview = async (interview) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/interviews/${interview.id}`, { status: 'completed' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Interview process completed!');
      fetchInterviews();
      fetchStats();
    } catch (error) {
      toast.error('Failed to complete interview');
    }
  };

  const addToRecruiting = async (interview) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/interviews/${interview.id}/add-to-recruiting`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Added to Recruiting Pipeline!');
      fetchInterviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to recruiting');
    }
  };

  const deleteInterview = async (id) => {
    if (!window.confirm('Delete this interview?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/interviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Interview deleted');
      fetchInterviews();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete interview');
    }
  };

  const resetForm = () => {
    setFormData({
      candidate_name: '',
      candidate_location: '',
      candidate_phone: '',
      interview_date: new Date().toISOString().split('T')[0],
      hobbies_interests: '',
      must_have_commission: false,
      must_have_travel: false,
      must_have_background: false,
      must_have_car: false,
      work_history: '',
      what_would_change: '',
      why_left_recent: '',
      other_interviews: '',
      top_3_looking_for: '',
      why_important: '',
      situation_6_12_months: '',
      family_impact: '',
      competitiveness_scale: 5,
      competitiveness_example: '',
      work_ethic_scale: 5,
      work_ethic_example: '',
      career_packet_sent: false,
      candidate_strength: 3,
      red_flags_notes: '',
      status: 'new'
    });
    setShowForm(false);
  };

  const getFilteredInterviews = () => {
    return interviews.filter(i => {
      const matchesSearch = 
        i.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.interviewer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.candidate_location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'moving_forward': return 'bg-green-100 text-green-800 border-green-300';
      case 'not_moving_forward': return 'bg-red-100 text-red-800 border-red-300';
      case 'second_interview_scheduled': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'new': return 'New';
      case 'moving_forward': return 'Moving Forward';
      case 'not_moving_forward': return 'Not Moving Forward';
      case 'second_interview_scheduled': return '2nd Interview Scheduled';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const statuses = ['new', 'moving_forward', 'second_interview_scheduled', 'completed', 'not_moving_forward'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm opacity-90">Total Interviews</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{stats.this_week}</div>
            <div className="text-sm opacity-90">This Week</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{stats.this_month}</div>
            <div className="text-sm opacity-90">This Month</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{stats.this_year}</div>
            <div className="text-sm opacity-90">This Year</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            New Interview
          </Button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded ${viewMode === 'kanban' ? 'bg-white shadow' : ''}`}
            >
              <Columns size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="moving_forward">Moving Forward</option>
            <option value="second_interview_scheduled">2nd Scheduled</option>
            <option value="completed">Completed</option>
            <option value="not_moving_forward">Not Moving Forward</option>
          </select>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Candidate</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Interviewer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Strength</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredInterviews().map((interview, idx) => (
                    <tr key={interview.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(interview.status)}`}>
                          {getStatusLabel(interview.status)}
                        </span>
                        {interview.is_shared && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Shared
                          </span>
                        )}
                        {interview.shared_with && interview.shared_with.length > 0 && !interview.is_shared && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1 inline-flex">
                            <Share2 size={10} />
                            {interview.shared_with.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{interview.candidate_name}</div>
                        <div className="text-sm text-gray-500">{interview.candidate_location}</div>
                        <div className="text-sm text-gray-500">{interview.candidate_phone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{interview.interview_date}</td>
                      <td className="px-4 py-3 text-sm">{interview.interviewer_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(n => (
                            <span 
                              key={n} 
                              className={`w-2 h-2 rounded-full ${n <= interview.candidate_strength ? 'bg-green-500' : 'bg-gray-300'}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setSelectedInterview(interview); setShowViewModal(true); }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {interview.status === 'moving_forward' && user.role === 'state_manager' && (
                            <button
                              onClick={() => { 
                                setSelectedInterview(interview); 
                                setFormData(prev => ({ ...prev, second_interview_date: '', second_interview_notes: '' }));
                                setShowSecondInterviewModal(true); 
                              }}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                              title="Schedule 2nd Interview"
                            >
                              <Calendar size={18} />
                            </button>
                          )}
                          
                          {interview.status === 'second_interview_scheduled' && user.role === 'state_manager' && (
                            <button
                              onClick={() => completeInterview(interview)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Mark Complete"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          
                          {interview.status === 'completed' && !interview.added_to_recruiting && user.role === 'state_manager' && (
                            <button
                              onClick={() => addToRecruiting(interview)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Add to Recruiting"
                            >
                              <UserPlus size={18} />
                            </button>
                          )}
                          
                          {user.role === 'state_manager' && (
                            <button
                              onClick={() => deleteInterview(interview.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {getFilteredInterviews().length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No interviews found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map(status => (
            <div key={status} className="flex-shrink-0 w-72">
              <div className={`p-3 rounded-t-lg font-semibold text-sm ${getStatusColor(status)}`}>
                {getStatusLabel(status)} ({getFilteredInterviews().filter(i => i.status === status).length})
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 min-h-96 space-y-2">
                {getFilteredInterviews()
                  .filter(i => i.status === status)
                  .map(interview => (
                    <Card 
                      key={interview.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setSelectedInterview(interview); setShowViewModal(true); }}
                    >
                      <CardContent className="p-3">
                        <div className="font-medium text-sm">{interview.candidate_name}</div>
                        <div className="text-xs text-gray-500">{interview.candidate_location}</div>
                        <div className="text-xs text-gray-500 mt-1">{interview.interview_date}</div>
                        <div className="text-xs text-gray-600 mt-1">By: {interview.interviewer_name}</div>
                        <div className="flex items-center gap-1 mt-2">
                          {[1,2,3,4,5].map(n => (
                            <span 
                              key={n} 
                              className={`w-2 h-2 rounded-full ${n <= interview.candidate_strength ? 'bg-green-500' : 'bg-gray-300'}`}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Interview Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList size={24} />
                  2026 Interview Guide
                </h2>
                <button onClick={resetForm} className="text-white hover:bg-white/20 p-1 rounded">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Candidate Name, Location and Number *</label>
                  <Input
                    value={formData.candidate_name}
                    onChange={(e) => setFormData({...formData, candidate_name: e.target.value})}
                    placeholder="Full Name"
                    className="mb-2"
                  />
                  <Input
                    value={formData.candidate_location}
                    onChange={(e) => setFormData({...formData, candidate_location: e.target.value})}
                    placeholder="Location"
                    className="mb-2"
                  />
                  <Input
                    value={formData.candidate_phone}
                    onChange={(e) => setFormData({...formData, candidate_phone: e.target.value})}
                    placeholder="Phone Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Interview *</label>
                  <Input
                    type="date"
                    value={formData.interview_date}
                    onChange={(e) => setFormData({...formData, interview_date: e.target.value})}
                  />
                </div>
              </div>

              {/* Hobbies & Interests */}
              <div>
                <label className="block text-sm font-medium mb-1">Hobbies, Interests, Support System at home</label>
                <textarea
                  value={formData.hobbies_interests}
                  onChange={(e) => setFormData({...formData, hobbies_interests: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-20"
                  placeholder="Enter details..."
                />
              </div>

              {/* Must Have Checkboxes */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-bold mb-3 text-amber-900">Must have to Move Forward:</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'must_have_commission', label: 'Commission' },
                    { key: 'must_have_travel', label: 'Instate overnight Travel - 1099' },
                    { key: 'must_have_background', label: 'Background' },
                    { key: 'must_have_car', label: 'Reliable Car' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[item.key]}
                        onChange={(e) => setFormData({...formData, [item.key]: e.target.checked})}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Work History Questions */}
              <div>
                <label className="block text-sm font-medium mb-1">Walk me through your work history and experience</label>
                <textarea
                  value={formData.work_history}
                  onChange={(e) => setFormData({...formData, work_history: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Have you interviewed for other positions recently?</label>
                <textarea
                  value={formData.other_interviews}
                  onChange={(e) => setFormData({...formData, other_interviews: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">What are the top 3 things you&apos;re looking for in your next opportunity?</label>
                <textarea
                  value={formData.top_3_looking_for}
                  onChange={(e) => setFormData({...formData, top_3_looking_for: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-20"
                />
              </div>

              {/* Competitiveness Scale */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium mb-2">On a scale of 1-10, how competitive are you?</label>
                <div className="flex gap-2 mb-3">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData({...formData, competitiveness_scale: n})}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                        formData.competitiveness_scale === n 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white border hover:bg-blue-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <textarea
                  value={formData.competitiveness_example}
                  onChange={(e) => setFormData({...formData, competitiveness_example: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-16"
                  placeholder="Can you give me an example of your competitiveness in action?"
                />
              </div>

              {/* Work Ethic Scale */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="block text-sm font-medium mb-2">On a scale of 1-10, how would you rate your work ethic?</label>
                <div className="flex gap-2 mb-3">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData({...formData, work_ethic_scale: n})}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                        formData.work_ethic_scale === n 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white border hover:bg-green-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <textarea
                  value={formData.work_ethic_example}
                  onChange={(e) => setFormData({...formData, work_ethic_example: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-16"
                  placeholder="Can you give me an example that supports your work ethic rating?"
                />
              </div>

              {/* Career Packet */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.career_packet_sent}
                    onChange={(e) => setFormData({...formData, career_packet_sent: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Did you Send and Run Through Career Opportunity packet?</span>
                </label>
              </div>

              {/* Candidate Strength */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <label className="block text-sm font-medium mb-2">How strong did you feel this candidate is for our role? (1-5)</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData({...formData, candidate_strength: n})}
                      className={`w-12 h-12 rounded-lg text-lg font-bold transition-all ${
                        formData.candidate_strength === n 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-white border hover:bg-purple-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Red Flags */}
              <div>
                <label className="block text-sm font-medium mb-1">Red Flags or Extra Notes</label>
                <textarea
                  value={formData.red_flags_notes}
                  onChange={(e) => setFormData({...formData, red_flags_notes: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-20"
                  placeholder="Any concerns or additional notes..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 border-t bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleSubmit(false)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Not Moving Forward - Submit & Close
              </Button>
              <Button 
                onClick={() => handleSubmit(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Submit Interview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Interview Modal */}
      {showViewModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4" id="interview-print-content">
            <div className="p-6 border-b bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg print:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedInterview.candidate_name}</h2>
                  <p className="text-sm opacity-80">{selectedInterview.candidate_location} • {selectedInterview.candidate_phone}</p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button 
                    onClick={() => {
                      const printContent = document.getElementById('interview-print-content');
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>2026 Interview Guide - ${selectedInterview.candidate_name}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                              .header { background: #374151; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                              .header h1 { margin: 0; font-size: 24px; }
                              .header p { margin: 5px 0 0; opacity: 0.8; }
                              .section { margin-bottom: 15px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
                              .section-title { font-weight: bold; color: #1f2937; margin-bottom: 8px; }
                              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                              .must-have { background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d; }
                              .red-flag { background: #fee2e2; padding: 15px; border-radius: 8px; border: 1px solid #fca5a5; }
                              .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                              .status-completed { background: #d1fae5; color: #065f46; }
                              .status-moving { background: #dcfce7; color: #166534; }
                              .status-scheduled { background: #e9d5ff; color: #6b21a8; }
                              .status-not-moving { background: #fee2e2; color: #991b1b; }
                              .meta { color: #6b7280; font-size: 14px; margin-top: 10px; }
                              @media print { body { padding: 0; } }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>2026 Interview Guide</h1>
                              <p>${selectedInterview.candidate_name} • ${selectedInterview.candidate_location} • ${selectedInterview.candidate_phone}</p>
                            </div>
                            
                            <div class="section">
                              <div class="grid">
                                <div><strong>Status:</strong> <span class="status ${
                                  selectedInterview.status === 'completed' ? 'status-completed' : 
                                  selectedInterview.status === 'moving_forward' ? 'status-moving' :
                                  selectedInterview.status === 'second_interview_scheduled' ? 'status-scheduled' : 'status-not-moving'
                                }">${getStatusLabel(selectedInterview.status)}</span></div>
                                <div><strong>Interview Date:</strong> ${selectedInterview.interview_date}</div>
                                <div><strong>Interviewer:</strong> ${selectedInterview.interviewer_name}</div>
                                ${selectedInterview.second_interview_date ? `<div><strong>2nd Interview:</strong> ${selectedInterview.second_interview_date}</div>` : ''}
                              </div>
                            </div>
                            
                            <div class="section">
                              <div class="grid">
                                <div><strong>Competitiveness:</strong> ${selectedInterview.competitiveness_scale}/10</div>
                                <div><strong>Work Ethic:</strong> ${selectedInterview.work_ethic_scale}/10</div>
                                <div><strong>Candidate Strength:</strong> ${selectedInterview.candidate_strength}/5</div>
                                <div><strong>Career Packet Sent:</strong> ${selectedInterview.career_packet_sent ? 'Yes' : 'No'}</div>
                              </div>
                            </div>
                            
                            <div class="must-have">
                              <div class="section-title">Must Haves to Move Forward:</div>
                              <div class="grid">
                                <div>Commission: ${selectedInterview.must_have_commission ? '✅ Yes' : '❌ No'}</div>
                                <div>Instate Travel - 1099: ${selectedInterview.must_have_travel ? '✅ Yes' : '❌ No'}</div>
                                <div>Background: ${selectedInterview.must_have_background ? '✅ Yes' : '❌ No'}</div>
                                <div>Reliable Car: ${selectedInterview.must_have_car ? '✅ Yes' : '❌ No'}</div>
                              </div>
                            </div>
                            
                            ${selectedInterview.hobbies_interests ? `<div class="section"><div class="section-title">Hobbies, Interests, Support System:</div><p>${selectedInterview.hobbies_interests}</p></div>` : ''}
                            ${selectedInterview.work_history ? `<div class="section"><div class="section-title">Work History & Experience:</div><p>${selectedInterview.work_history}</p></div>` : ''}
                            ${selectedInterview.other_interviews ? `<div class="section"><div class="section-title">Other Recent Interviews:</div><p>${selectedInterview.other_interviews}</p></div>` : ''}
                            ${selectedInterview.top_3_looking_for ? `<div class="section"><div class="section-title">Top 3 Things Looking For:</div><p>${selectedInterview.top_3_looking_for}</p></div>` : ''}
                            ${selectedInterview.competitiveness_example ? `<div class="section"><div class="section-title">Competitiveness Example:</div><p>${selectedInterview.competitiveness_example}</p></div>` : ''}
                            ${selectedInterview.work_ethic_example ? `<div class="section"><div class="section-title">Work Ethic Example:</div><p>${selectedInterview.work_ethic_example}</p></div>` : ''}
                            ${selectedInterview.red_flags_notes ? `<div class="red-flag"><div class="section-title">Red Flags / Notes:</div><p>${selectedInterview.red_flags_notes}</p></div>` : ''}
                            
                            <div class="meta">
                              <p>Created: ${new Date(selectedInterview.created_at).toLocaleString()}</p>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }}
                    className="text-white hover:bg-white/20 p-2 rounded flex items-center gap-1"
                    title="Print Interview"
                  >
                    <Printer size={20} />
                  </button>
                  <button onClick={() => { setShowViewModal(false); setSelectedInterview(null); }} className="text-white hover:bg-white/20 p-1 rounded">
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedInterview.status)}`}>
                  {getStatusLabel(selectedInterview.status)}
                </span>
                <span className="text-sm text-gray-600">Interview Date: {selectedInterview.interview_date}</span>
                <span className="text-sm text-gray-600">By: {selectedInterview.interviewer_name}</span>
              </div>

              {selectedInterview.second_interview_date && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <span className="text-sm font-medium text-purple-900">2nd Interview: {selectedInterview.second_interview_date}</span>
                  {selectedInterview.second_interview_notes && (
                    <p className="text-sm text-purple-700 mt-1">{selectedInterview.second_interview_notes}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Competitiveness:</strong> {selectedInterview.competitiveness_scale}/10</div>
                <div><strong>Work Ethic:</strong> {selectedInterview.work_ethic_scale}/10</div>
                <div><strong>Candidate Strength:</strong> {selectedInterview.candidate_strength}/5</div>
                <div><strong>Career Packet Sent:</strong> {selectedInterview.career_packet_sent ? 'Yes' : 'No'}</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <strong className="text-amber-900">Must Haves:</strong>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span>Commission: {selectedInterview.must_have_commission ? '✅' : '❌'}</span>
                  <span>Travel: {selectedInterview.must_have_travel ? '✅' : '❌'}</span>
                  <span>Background: {selectedInterview.must_have_background ? '✅' : '❌'}</span>
                  <span>Car: {selectedInterview.must_have_car ? '✅' : '❌'}</span>
                </div>
              </div>

              {selectedInterview.hobbies_interests && (
                <div><strong>Hobbies/Interests:</strong><p className="text-gray-700 mt-1">{selectedInterview.hobbies_interests}</p></div>
              )}
              {selectedInterview.work_history && (
                <div><strong>Work History:</strong><p className="text-gray-700 mt-1">{selectedInterview.work_history}</p></div>
              )}
              {selectedInterview.other_interviews && (
                <div><strong>Other Interviews:</strong><p className="text-gray-700 mt-1">{selectedInterview.other_interviews}</p></div>
              )}
              {selectedInterview.top_3_looking_for && (
                <div><strong>Top 3 Looking For:</strong><p className="text-gray-700 mt-1">{selectedInterview.top_3_looking_for}</p></div>
              )}
              {selectedInterview.competitiveness_example && (
                <div><strong>Competitiveness Example:</strong><p className="text-gray-700 mt-1">{selectedInterview.competitiveness_example}</p></div>
              )}
              {selectedInterview.work_ethic_example && (
                <div><strong>Work Ethic Example:</strong><p className="text-gray-700 mt-1">{selectedInterview.work_ethic_example}</p></div>
              )}
              {selectedInterview.red_flags_notes && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <strong className="text-red-900">Red Flags/Notes:</strong>
                  <p className="text-red-700 mt-1">{selectedInterview.red_flags_notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-lg flex gap-3 justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  const printContent = document.getElementById('interview-print-content');
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>2026 Interview Guide - ${selectedInterview.candidate_name}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                          .header { background: #374151; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                          .header h1 { margin: 0; font-size: 24px; }
                          .header p { margin: 5px 0 0; opacity: 0.8; }
                          .section { margin-bottom: 15px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
                          .section-title { font-weight: bold; color: #1f2937; margin-bottom: 8px; }
                          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                          .must-have { background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d; margin-bottom: 15px; }
                          .red-flag { background: #fee2e2; padding: 15px; border-radius: 8px; border: 1px solid #fca5a5; margin-bottom: 15px; }
                          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                          .meta { color: #6b7280; font-size: 14px; margin-top: 10px; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1>2026 Interview Guide</h1>
                          <p>${selectedInterview.candidate_name} • ${selectedInterview.candidate_location} • ${selectedInterview.candidate_phone}</p>
                        </div>
                        <div class="section"><div class="grid">
                          <div><strong>Interview Date:</strong> ${selectedInterview.interview_date}</div>
                          <div><strong>Interviewer:</strong> ${selectedInterview.interviewer_name}</div>
                          <div><strong>Status:</strong> ${getStatusLabel(selectedInterview.status)}</div>
                          ${selectedInterview.second_interview_date ? `<div><strong>2nd Interview:</strong> ${selectedInterview.second_interview_date}</div>` : ''}
                        </div></div>
                        <div class="section"><div class="grid">
                          <div><strong>Competitiveness:</strong> ${selectedInterview.competitiveness_scale}/10</div>
                          <div><strong>Work Ethic:</strong> ${selectedInterview.work_ethic_scale}/10</div>
                          <div><strong>Candidate Strength:</strong> ${selectedInterview.candidate_strength}/5</div>
                          <div><strong>Career Packet Sent:</strong> ${selectedInterview.career_packet_sent ? 'Yes' : 'No'}</div>
                        </div></div>
                        <div class="must-have"><div class="section-title">Must Haves:</div><div class="grid">
                          <div>Commission: ${selectedInterview.must_have_commission ? '✅' : '❌'}</div>
                          <div>Travel: ${selectedInterview.must_have_travel ? '✅' : '❌'}</div>
                          <div>Background: ${selectedInterview.must_have_background ? '✅' : '❌'}</div>
                          <div>Car: ${selectedInterview.must_have_car ? '✅' : '❌'}</div>
                        </div></div>
                        ${selectedInterview.hobbies_interests ? `<div class="section"><div class="section-title">Hobbies/Interests:</div><p>${selectedInterview.hobbies_interests}</p></div>` : ''}
                        ${selectedInterview.work_history ? `<div class="section"><div class="section-title">Work History:</div><p>${selectedInterview.work_history}</p></div>` : ''}
                        ${selectedInterview.top_3_looking_for ? `<div class="section"><div class="section-title">Top 3 Looking For:</div><p>${selectedInterview.top_3_looking_for}</p></div>` : ''}
                        ${selectedInterview.competitiveness_example ? `<div class="section"><div class="section-title">Competitiveness Example:</div><p>${selectedInterview.competitiveness_example}</p></div>` : ''}
                        ${selectedInterview.work_ethic_example ? `<div class="section"><div class="section-title">Work Ethic Example:</div><p>${selectedInterview.work_ethic_example}</p></div>` : ''}
                        ${selectedInterview.red_flags_notes ? `<div class="red-flag"><div class="section-title">Red Flags/Notes:</div><p>${selectedInterview.red_flags_notes}</p></div>` : ''}
                        <div class="meta"><p>Created: ${new Date(selectedInterview.created_at).toLocaleString()}</p></div>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }}
              >
                <Printer size={18} className="mr-2" />
                Print
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedShareMembers(selectedInterview.shared_with || []);
                  setShowShareModal(true);
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Share2 size={18} className="mr-2" />
                Share
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowViewModal(false); setSelectedInterview(null); }}>
                  Close
                </Button>
                {selectedInterview.status === 'moving_forward' && user.role === 'state_manager' && (
                  <Button 
                    onClick={() => { 
                      setShowViewModal(false);
                      setFormData(prev => ({ ...prev, second_interview_date: '', second_interview_notes: '' }));
                      setShowSecondInterviewModal(true); 
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Calendar size={18} className="mr-2" />
                    Schedule 2nd Interview
                  </Button>
                )}
                {selectedInterview.status === 'completed' && !selectedInterview.added_to_recruiting && user.role === 'state_manager' && (
                  <Button 
                    onClick={() => { addToRecruiting(selectedInterview); setShowViewModal(false); }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserPlus size={18} className="mr-2" />
                    Add to Recruiting
                  </Button>
                )}
              </div>
            </div>

            {/* Shared With Info */}
            {selectedInterview.shared_with && selectedInterview.shared_with.length > 0 && (
              <div className="px-6 pb-4 bg-blue-50 text-sm text-blue-700 flex items-center gap-2">
                <Share2 size={14} />
                Shared with {selectedInterview.shared_with_names?.join(', ') || `${selectedInterview.shared_with.length} team member(s)`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Interview Modal */}
      {showShareModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Share2 size={20} />
                  Share Interview
                </h3>
                <button onClick={() => { setShowShareModal(false); setSelectedShareMembers([]); }} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-1">
                Share "{selectedInterview.candidate_name}" with team members
              </p>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                Select team members who should be able to view this interview:
              </p>
              
              {teamMembers.filter(m => m.id !== user.id).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No team members available to share with</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.filter(m => m.id !== user.id).map(member => (
                    <label 
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedShareMembers.includes(member.id) 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedShareMembers.includes(member.id)}
                        onChange={() => toggleShareMember(member.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">
                          {member.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      </div>
                      {selectedShareMembers.includes(member.id) && (
                        <CheckCircle size={18} className="text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowShareModal(false); setSelectedShareMembers([]); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleShareInterview}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={selectedShareMembers.length === 0}
              >
                <Share2 size={18} className="mr-2" />
                Share with {selectedShareMembers.length} member{selectedShareMembers.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule 2nd Interview Modal */}
      {showSecondInterviewModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
              <h2 className="text-xl font-bold">Schedule 2nd Interview</h2>
              <p className="text-sm opacity-80">{selectedInterview.candidate_name}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">2nd Interview Date *</label>
                <Input
                  type="date"
                  value={formData.second_interview_date || ''}
                  onChange={(e) => setFormData({...formData, second_interview_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.second_interview_notes || ''}
                  onChange={(e) => setFormData({...formData, second_interview_notes: e.target.value})}
                  className="w-full border rounded-lg p-3 min-h-20"
                  placeholder="Any notes for the 2nd interview..."
                />
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowSecondInterviewModal(false); setSelectedInterview(null); }}>
                Cancel
              </Button>
              <Button 
                onClick={scheduleSecondInterview}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!formData.second_interview_date}
              >
                Schedule Interview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
