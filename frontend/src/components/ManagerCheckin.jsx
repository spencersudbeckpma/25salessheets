import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  ClipboardCheck, Plus, Edit2, Trash2, Download, Calendar,
  Users, ChevronDown, ChevronRight, Check, Clock, Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ManagerCheckin = ({ user }) => {
  const [activeView, setActiveView] = useState('my'); // 'my' or 'team'
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState(null);
  const [formData, setFormData] = useState({
    week_start_date: getThisMonday(),
    number_in_field: 0,
    household_presentation_target: 0,
    premium_target: 0,
    monday_matters_topic: '',
    status: 'draft'
  });

  // Check if user is a manager
  const isManager = ['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user?.role);
  const canViewTeam = ['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user?.role);

  useEffect(() => {
    fetchCheckins();
    fetchAvailableWeeks();
  }, [activeView, selectedWeek]);

  function getThisMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  function formatWeekDisplay(weekStart) {
    if (!weekStart) return '';
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }

  const fetchCheckins = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (activeView === 'my') {
        params.append('my_only', 'true');
      }
      if (selectedWeek) {
        params.append('week_start', selectedWeek);
      }
      
      const response = await axios.get(`${API}/checkins?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCheckins(response.data);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error('Failed to fetch check-ins');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableWeeks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/checkins/weeks/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableWeeks(response.data.weeks || []);
    } catch (error) {
      console.error('Failed to fetch weeks');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingCheckin) {
        await axios.put(`${API}/checkins/${editingCheckin.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Check-in updated successfully');
      } else {
        await axios.post(`${API}/checkins`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Check-in created successfully');
      }
      
      setShowForm(false);
      setEditingCheckin(null);
      resetForm();
      fetchCheckins();
      fetchAvailableWeeks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save check-in');
    }
  };

  const handleEdit = (checkin) => {
    setEditingCheckin(checkin);
    setFormData({
      week_start_date: checkin.week_start_date,
      number_in_field: checkin.number_in_field || 0,
      household_presentation_target: checkin.household_presentation_target || 0,
      premium_target: checkin.premium_target || 0,
      monday_matters_topic: checkin.monday_matters_topic || '',
      status: checkin.status || 'draft'
    });
    setShowForm(true);
  };

  const handleDelete = async (checkinId) => {
    if (!window.confirm('Are you sure you want to delete this check-in?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/checkins/${checkinId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Check-in deleted');
      fetchCheckins();
      fetchAvailableWeeks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete check-in');
    }
  };

  const handleExportCSV = async () => {
    if (!selectedWeek) {
      toast.error('Please select a week to export');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/checkins/export/csv?week_start=${selectedWeek}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `manager_checkins_${selectedWeek}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to export CSV');
    }
  };

  const resetForm = () => {
    setFormData({
      week_start_date: getThisMonday(),
      number_in_field: 0,
      household_presentation_target: 0,
      premium_target: 0,
      monday_matters_topic: '',
      status: 'draft'
    });
  };

  // Group checkins by month
  const groupedByMonth = checkins.reduce((acc, checkin) => {
    const month = checkin.week_start_date?.substring(0, 7) || 'Unknown';
    if (!acc[month]) acc[month] = [];
    acc[month].push(checkin);
    return acc;
  }, {});

  if (!isManager) {
    return (
      <Card className="shadow-lg bg-white">
        <CardContent className="p-8 text-center text-gray-500">
          <ClipboardCheck size={48} className="mx-auto mb-4 opacity-50" />
          <p>Manager Check-In is only available for managers.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white" data-testid="manager-checkin-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl" data-testid="manager-checkin-title">
            <ClipboardCheck className="text-indigo-600" size={24} />
            Manager Check-In
          </CardTitle>
          <Button
            onClick={() => { setShowForm(true); setEditingCheckin(null); resetForm(); }}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="new-checkin-btn"
          >
            <Plus size={18} className="mr-2" />
            New Check-In
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Weekly accountability check-ins for your team
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* View Toggle & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={activeView === 'my' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('my')}
              data-testid="my-checkins-btn"
            >
              My Check-Ins
            </Button>
            {canViewTeam && (
              <Button
                variant={activeView === 'team' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('team')}
                data-testid="team-checkins-btn"
              >
                <Users size={16} className="mr-1" />
                Team Check-Ins
              </Button>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
              data-testid="week-filter"
            >
              <option value="">All Weeks</option>
              {availableWeeks.map(week => (
                <option key={week} value={week}>
                  {formatWeekDisplay(week)}
                </option>
              ))}
            </select>
            
            {canViewTeam && selectedWeek && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                data-testid="export-csv-btn"
              >
                <Download size={16} className="mr-1" />
                CSV
              </Button>
            )}
          </div>
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ClipboardCheck size={20} />
                  {editingCheckin ? 'Edit Check-In' : 'New Weekly Check-In'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Week Starting (Monday)</label>
                    <Input
                      type="date"
                      value={formData.week_start_date}
                      onChange={(e) => setFormData({ ...formData, week_start_date: e.target.value })}
                      disabled={!!editingCheckin}
                      required
                      data-testid="week-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Days in Field</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.number_in_field}
                      onChange={(e) => setFormData({ ...formData, number_in_field: parseInt(e.target.value) || 0 })}
                      placeholder="Number of days in field this week"
                      data-testid="days-field-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Household Presentation Target</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.household_presentation_target}
                      onChange={(e) => setFormData({ ...formData, household_presentation_target: parseInt(e.target.value) || 0 })}
                      placeholder="Weekly presentation target"
                      data-testid="presentation-target-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Premium Target ($)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premium_target}
                      onChange={(e) => setFormData({ ...formData, premium_target: parseFloat(e.target.value) || 0 })}
                      placeholder="Weekly premium target"
                      data-testid="premium-target-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Monday Matters Topic</label>
                    <textarea
                      value={formData.monday_matters_topic}
                      onChange={(e) => setFormData({ ...formData, monday_matters_topic: e.target.value })}
                      placeholder="Topic or theme for the week..."
                      className="w-full border rounded-md px-3 py-2 min-h-[80px]"
                      data-testid="monday-matters-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                      data-testid="status-select"
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1" data-testid="save-checkin-btn">
                      {editingCheckin ? 'Update Check-In' : 'Create Check-In'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => { setShowForm(false); setEditingCheckin(null); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Check-ins List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading check-ins...</div>
        ) : checkins.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ClipboardCheck size={48} className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No check-ins found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first weekly check-in above</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, monthCheckins]) => (
              <div key={month}>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar size={16} />
                  {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                
                <div className="space-y-3">
                  {monthCheckins.map(checkin => (
                    <div
                      key={checkin.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        checkin.status === 'submitted' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200'
                      }`}
                      data-testid={`checkin-item-${checkin.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold">
                              {formatWeekDisplay(checkin.week_start_date)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              checkin.status === 'submitted' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {checkin.status === 'submitted' ? (
                                <span className="flex items-center gap-1"><Check size={12} /> Submitted</span>
                              ) : (
                                <span className="flex items-center gap-1"><Clock size={12} /> Draft</span>
                              )}
                            </span>
                          </div>
                          
                          {activeView === 'team' && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">{checkin.created_by_name}</span>
                              <span className="mx-2">•</span>
                              <span className="text-gray-500">{checkin.role?.replace('_', ' ').toUpperCase()}</span>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Days in Field:</span>
                              <span className="ml-1 font-medium">{checkin.number_in_field || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Pres. Target:</span>
                              <span className="ml-1 font-medium">{checkin.household_presentation_target || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Premium Target:</span>
                              <span className="ml-1 font-medium">${(checkin.premium_target || 0).toLocaleString()}</span>
                            </div>
                            {checkin.monday_matters_topic && (
                              <div className="col-span-2 sm:col-span-4">
                                <span className="text-gray-500">Monday Matters:</span>
                                <span className="ml-1">{checkin.monday_matters_topic}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions - only show for own check-ins or if state_manager */}
                        {(checkin.created_by === user.id || ['super_admin', 'state_manager'].includes(user.role)) && (
                          <div className="flex gap-2">
                            {checkin.created_by === user.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(checkin)}
                                data-testid={`edit-checkin-${checkin.id}`}
                              >
                                <Edit2 size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(checkin.id)}
                              className="text-red-600 hover:bg-red-50"
                              data-testid={`delete-checkin-${checkin.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagerCheckin;
