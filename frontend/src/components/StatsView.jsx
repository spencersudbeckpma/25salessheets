import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Edit2, Save, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatsView = ({ user }) => {
  const [period, setPeriod] = useState('weekly');
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [editingActivity, setEditingActivity] = useState(null);
  const [quickAverages, setQuickAverages] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchQuickAverages();
  }, [period]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/stats/my/${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch stats');
    }
  };

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/activities/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(response.data);
    } catch (error) {
      toast.error('Failed to fetch activities');
    }
  };

  const fetchQuickAverages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/personal-averages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuickAverages(response.data);
    } catch (error) {
      // Silent fail - this is just a nice-to-have
    }
  };

  const handleEdit = (activity) => {
    setEditingActivity({ ...activity });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/activities/${editingActivity.date}`, editingActivity, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Activity updated!');
      setEditingActivity(null);
      fetchActivities();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update activity');
    }
  };

  const statCards = [
    { key: 'contacts', label: 'Contacts', color: 'bg-blue-500', icon: '📞' },
    { key: 'appointments', label: 'Appointments', color: 'bg-green-500', icon: '📅' },
    { key: 'presentations', label: 'Presentations', color: 'bg-purple-500', icon: '📊' },
    { key: 'referrals', label: 'Referrals', color: 'bg-yellow-500', icon: '🤝' },
    { key: 'testimonials', label: 'Testimonials', color: 'bg-pink-500', icon: '⭐' },
    { key: 'sales', label: 'Sales', color: 'bg-indigo-500', icon: '💰' },
    { key: 'new_face_sold', label: 'New Face Sold', color: 'bg-red-500', icon: '🎯' },
    { key: 'premium', label: 'Total Premium', color: 'bg-emerald-500', icon: '💵' }
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg bg-white" data-testid="stats-view-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-xl" data-testid="stats-title">
              <TrendingUp className="text-blue-600" size={24} />
              My Statistics
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
                <Button
                  key={p}
                  data-testid={`period-${p}-btn`}
                  variant={period === p ? 'default' : 'outline'}
                  onClick={() => setPeriod(p)}
                  size="sm"
                  className="text-xs"
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map(card => (
                <div key={card.key} className="p-4 rounded-lg bg-gradient-to-br from-white to-gray-50 shadow border-l-4 border-blue-500">
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <div className="text-2xl font-bold text-gray-800" data-testid={`stat-${card.key}-value`}>
                    {card.key === 'premium' ? `$${stats[card.key].toFixed(2)}` : stats[card.key]}
                  </div>
                  <div className="text-sm text-gray-600 mt-1" data-testid={`stat-${card.key}-label`}>{card.label}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg bg-white" data-testid="activity-history-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl" data-testid="activity-history-title">Activity History</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">No activities yet</div>
            )}
            {activities.map(activity => (
              <div key={activity.id} className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border">
                {editingActivity && editingActivity.id === activity.id ? (
                  <div className="space-y-4">
                    <div className="font-semibold text-lg mb-3">Edit Activity - {activity.date}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.keys(activity).filter(k => !['id', 'user_id', 'date', 'created_at', 'edited_by', 'edited_at'].includes(k)).map(key => (
                        <div key={key}>
                          <label className="text-xs text-gray-600 font-medium block mb-1">
                            {key.replace('_', ' ').toUpperCase()}
                          </label>
                          <Input
                            type="number"
                            data-testid={`edit-${key}-input`}
                            min="0"
                            step={key === 'premium' ? '0.01' : key === 'presentations' ? '0.5' : '1'}
                            value={editingActivity[key] === 0 ? '' : editingActivity[key]}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setEditingActivity({ ...editingActivity, [key]: 0 });
                              } else {
                                const parsed = parseFloat(value);
                                setEditingActivity({ ...editingActivity, [key]: isNaN(parsed) ? 0 : parsed });
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value === '' || isNaN(parseFloat(value))) {
                                setEditingActivity({ ...editingActivity, [key]: 0 });
                              }
                            }}
                            placeholder="0"
                            className="mt-1"
                          />
                        </div>
                      ))}</div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSaveEdit} data-testid="save-edit-btn" size="sm">
                        <Save size={14} className="mr-1" /> Save
                      </Button>
                      <Button onClick={() => setEditingActivity(null)} data-testid="cancel-edit-btn" variant="outline" size="sm">
                        <X size={14} className="mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-lg mb-3" data-testid={`activity-date-${activity.date}`}>{activity.date}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                        <div data-testid={`activity-contacts-${activity.date}`} className="truncate">📞 Contacts: {activity.contacts}</div>
                        <div data-testid={`activity-appointments-${activity.date}`} className="truncate">📅 Appointments: {activity.appointments}</div>
                        <div data-testid={`activity-presentations-${activity.date}`} className="truncate">📊 Presentations: {activity.presentations}</div>
                        <div data-testid={`activity-referrals-${activity.date}`} className="truncate">🤝 Referrals: {activity.referrals}</div>
                        <div data-testid={`activity-testimonials-${activity.date}`} className="truncate">⭐ Testimonials: {activity.testimonials}</div>
                        <div data-testid={`activity-sales-${activity.date}`} className="truncate">💰 Sales: {activity.sales}</div>
                        <div data-testid={`activity-new-face-${activity.date}`} className="truncate">🎯 New Face: {activity.new_face_sold}</div>
                        <div data-testid={`activity-premium-${activity.date}`} className="truncate">💵 Premium: ${activity.premium}</div>
                      </div>
                    </div>
                    <Button onClick={() => handleEdit(activity)} data-testid={`edit-activity-btn-${activity.date}`} variant="outline" size="sm" className="shrink-0">
                      <Edit2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsView;