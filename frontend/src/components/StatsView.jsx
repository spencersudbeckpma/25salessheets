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

  useEffect(() => {
    fetchStats();
    fetchActivities();
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
      <Card className="shadow-lg" data-testid="stats-view-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2" data-testid="stats-title">
              <TrendingUp className="text-blue-600" />
              My Statistics
            </CardTitle>
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
                <Button
                  key={p}
                  data-testid={`period-${p}-btn`}
                  variant={period === p ? 'default' : 'outline'}
                  onClick={() => setPeriod(p)}
                  size="sm"
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map(card => (
                <div key={card.key} className="p-4 rounded-lg bg-white shadow-md border-l-4 border-blue-500">
                  <div className="text-2xl mb-1">{card.icon}</div>
                  <div className="text-2xl font-bold" data-testid={`stat-${card.key}-value`}>
                    {card.key === 'premium' ? `$${stats[card.key].toFixed(2)}` : stats[card.key]}
                  </div>
                  <div className="text-sm text-gray-600" data-testid={`stat-${card.key}-label`}>{card.label}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg" data-testid="activity-history-card">
        <CardHeader>
          <CardTitle data-testid="activity-history-title">Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activities.map(activity => (
              <div key={activity.id} className="p-4 bg-white rounded-lg shadow-sm border">
                {editingActivity && editingActivity.id === activity.id ? (
                  <div className="space-y-3">
                    <div className="font-semibold text-lg mb-2">Edit Activity - {activity.date}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.keys(activity).filter(k => !['id', 'user_id', 'date', 'created_at', 'edited_by', 'edited_at'].includes(k)).map(key => (
                        <div key={key}>
                          <label className="text-sm text-gray-600">{key.replace('_', ' ').toUpperCase()}</label>
                          <Input
                            type="number"
                            data-testid={`edit-${key}-input`}
                            value={editingActivity[key]}
                            onChange={(e) => setEditingActivity({ ...editingActivity, [key]: parseFloat(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} data-testid="save-edit-btn" size="sm">
                        <Save size={14} className="mr-1" /> Save
                      </Button>
                      <Button onClick={() => setEditingActivity(null)} data-testid="cancel-edit-btn" variant="outline" size="sm">
                        <X size={14} className="mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg mb-2" data-testid={`activity-date-${activity.date}`}>{activity.date}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                        <div data-testid={`activity-contacts-${activity.date}`}>📞 Contacts: {activity.contacts}</div>
                        <div data-testid={`activity-appointments-${activity.date}`}>📅 Appointments: {activity.appointments}</div>
                        <div data-testid={`activity-presentations-${activity.date}`}>📊 Presentations: {activity.presentations}</div>
                        <div data-testid={`activity-referrals-${activity.date}`}>🤝 Referrals: {activity.referrals}</div>
                        <div data-testid={`activity-testimonials-${activity.date}`}>⭐ Testimonials: {activity.testimonials}</div>
                        <div data-testid={`activity-sales-${activity.date}`}>💰 Sales: {activity.sales}</div>
                        <div data-testid={`activity-new-face-${activity.date}`}>🎯 New Face: {activity.new_face_sold}</div>
                        <div data-testid={`activity-premium-${activity.date}`}>💵 Premium: ${activity.premium}</div>
                      </div>
                    </div>
                    <Button onClick={() => handleEdit(activity)} data-testid={`edit-activity-btn-${activity.date}`} variant="outline" size="sm">
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