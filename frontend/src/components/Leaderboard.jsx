import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trophy, Users, UserCheck } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Static mapping of metric IDs to display properties
const METRIC_DISPLAY = {
  premium: { icon: '💵', color: 'border-green-500', format: 'currency' },
  bankers_premium: { icon: '🏦', color: 'border-amber-500', format: 'currency' },
  presentations: { icon: '📊', color: 'border-purple-500', format: 'number' },
  fact_finders: { icon: '📋', color: 'border-orange-500', format: 'number' },
  sales: { icon: '💰', color: 'border-emerald-500', format: 'number' },
  apps: { icon: '📝', color: 'border-teal-500', format: 'number' },
  contacts: { icon: '📞', color: 'border-cyan-500', format: 'number' },
  appointments: { icon: '📅', color: 'border-indigo-500', format: 'number' },
  referrals: { icon: '🤝', color: 'border-blue-500', format: 'number' },
  testimonials: { icon: '⭐', color: 'border-yellow-500', format: 'number' },
  new_face_sold: { icon: '🎯', color: 'border-red-500', format: 'number' },
};

const Leaderboard = ({ user }) => {
  const [activeView, setActiveView] = useState('individual');
  const [period, setPeriod] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState(null);
  const [teamLeaderboard, setTeamLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardViews, setLeaderboardViews] = useState({
    individual: true,
    rm_teams: true,
    dm_teams: true
  });

  // Fetch leaderboard view settings
  useEffect(() => {
    const fetchViewSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/team/view-settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const views = response.data.leaderboard_views || {};
        setLeaderboardViews({
          individual: views.individual !== false,
          rm_teams: views.rm_teams !== false,
          dm_teams: views.dm_teams !== false
        });
        
        // If current view is disabled, switch to first enabled view
        if (!views[activeView]) {
          if (views.individual !== false) setActiveView('individual');
          else if (views.rm_teams !== false) setActiveView('rm_teams');
          else if (views.dm_teams !== false) setActiveView('dm_teams');
        }
      } catch (error) {
        console.error('Failed to fetch view settings:', error);
      }
    };
    fetchViewSettings();
  }, []);

  // Fetch individual leaderboard
  const fetchIndividualLeaderboard = async (selectedPeriod) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/leaderboard/${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaderboard(response.data);
      setTeamLeaderboard(null);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Individual leaderboard is disabled for your team');
      } else {
        toast.error('Failed to fetch leaderboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch team leaderboard (RM or DM)
  const fetchTeamLeaderboard = async (viewType, selectedPeriod) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = viewType === 'rm_teams' ? 'rm-teams' : 'dm-teams';
      const response = await axios.get(`${API}/leaderboard/${endpoint}/${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamLeaderboard(response.data);
      setLeaderboard(null);
    } catch (error) {
      if (error.response?.status === 403) {
        const type = viewType === 'rm_teams' ? 'RM Team' : 'DM Team';
        toast.error(`${type} leaderboard is disabled for your team`);
      } else {
        toast.error('Failed to fetch team leaderboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when view or period changes
  useEffect(() => {
    if (activeView === 'individual') {
      fetchIndividualLeaderboard(period);
    } else {
      fetchTeamLeaderboard(activeView, period);
    }
  }, [activeView, period]);

  const getRankBadge = (rank) => {
    if (rank === 0) return <span className="text-2xl">🥇</span>;
    if (rank === 1) return <span className="text-2xl">🥈</span>;
    if (rank === 2) return <span className="text-2xl">🥉</span>;
    return <span className="text-gray-600 font-bold text-lg">#{rank + 1}</span>;
  };

  const getEnabledMetrics = () => {
    const config = leaderboard?.config || teamLeaderboard?.config;
    if (!config) {
      return [
        { id: 'presentations', label: 'Presentations' },
        { id: 'referrals', label: 'Referrals' },
        { id: 'testimonials', label: 'Testimonials' },
        { id: 'new_face_sold', label: 'New Face Sold' },
        { id: 'premium', label: 'Total Premium' }
      ];
    }
    
    return config
      .filter(m => m.enabled)
      .map(m => ({
        id: m.id,
        label: m.label,
        ...METRIC_DISPLAY[m.id]
      }));
  };

  const formatValue = (value, metricId) => {
    const display = METRIC_DISPLAY[metricId];
    if (display?.format === 'currency') {
      return `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value || 0;
  };

  const enabledMetrics = getEnabledMetrics();

  // Get available tabs based on admin settings
  const availableTabs = [
    { id: 'individual', label: 'Individual', icon: Trophy, enabled: leaderboardViews.individual },
    { id: 'rm_teams', label: 'RM Teams', icon: Users, enabled: leaderboardViews.rm_teams },
    { id: 'dm_teams', label: 'DM Teams', icon: UserCheck, enabled: leaderboardViews.dm_teams }
  ].filter(tab => tab.enabled);

  // Render Individual Leaderboard
  const renderIndividualLeaderboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {enabledMetrics.map(metric => (
        <div key={metric.id} className={`bg-gradient-to-br from-white to-gray-50 rounded-lg border-l-4 ${metric.color || 'border-slate-500'} p-5 shadow-sm`}>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" data-testid={`category-${metric.id}-title`}>
            <span className="text-2xl">{metric.icon || '📈'}</span>
            {metric.label}
          </h3>
          <div className="space-y-3">
            {leaderboard[metric.id] && leaderboard[metric.id].slice(0, 5).map((entry, index) => (
              <div
                key={entry.user_id}
                data-testid={`leaderboard-${metric.id}-rank-${index + 1}`}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${ 
                  entry.user_id === user.id ? 'bg-blue-100 border-2 border-blue-400 shadow-md' : 'bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 flex justify-center shrink-0">
                    {getRankBadge(index)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {entry.name}
                      {entry.user_id === user.id && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                          (You)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg shrink-0 ml-2">
                  {formatValue(entry[metric.id], metric.id)}
                </div>
              </div>
            ))}
            {(!leaderboard[metric.id] || leaderboard[metric.id].length === 0) && (
              <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                No data yet
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Render Team Leaderboard (RM or DM) - Total Premium + Presentations
  const renderTeamLeaderboard = () => {
    const managers = teamLeaderboard?.managers || [];
    const viewType = teamLeaderboard?.view_type;
    const title = viewType === 'rm_teams' ? 'Regional Manager' : 'District Manager';

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          {title} teams ranked by <strong>Total Premium</strong>. Each row shows the manager and their entire downline's combined metrics.
        </p>
        
        {managers.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
            No {title.toLowerCase()}s found in your team
          </div>
        ) : (
          <div className="space-y-3">
            {managers.map((manager, index) => (
              <div
                key={manager.manager_id}
                className={`flex items-center justify-between p-4 rounded-lg border-l-4 border-green-500 ${
                  manager.manager_id === user.id 
                    ? 'bg-blue-50 border-2 border-blue-400 shadow-md' 
                    : 'bg-gradient-to-r from-white to-gray-50 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 flex justify-center">
                    {getRankBadge(index)}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {manager.manager_name}
                      {manager.manager_id === user.id && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Team Size: {manager.team_size} members
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <div className="text-xl font-bold text-purple-600">
                      {(manager.total_presentations || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Presentations</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      ${(manager.total_premium || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">Total Premium</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-lg bg-white" data-testid="leaderboard-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="leaderboard-title">
          <Trophy className="text-yellow-500" size={24} />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {/* View Tabs */}
        {availableTabs.length > 1 && (
          <div className="flex gap-2 border-b pb-4">
            {availableTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeView === tab.id ? 'default' : 'outline'}
                  onClick={() => setActiveView(tab.id)}
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid={`view-${tab.id}-btn`}
                >
                  <Icon size={16} />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Period Selection and Info */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <p className="text-sm text-gray-600" data-testid="leaderboard-subtitle">
            {activeView === 'individual' 
              ? `Top 5 performers for ${period} period`
              : `${activeView === 'rm_teams' ? 'RM' : 'DM'} team rankings for ${period} period`
            }
          </p>
          <div className="flex flex-wrap gap-2">
            {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
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

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading leaderboard...</div>
        ) : activeView === 'individual' && leaderboard ? (
          renderIndividualLeaderboard()
        ) : teamLeaderboard ? (
          renderTeamLeaderboard()
        ) : (
          <div className="text-center py-12 text-gray-500">No data available</div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
