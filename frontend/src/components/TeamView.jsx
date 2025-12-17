import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ChevronRight, ChevronDown, Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeamView = ({ user }) => {
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [period, setPeriod] = useState('weekly');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStats, setMemberStats] = useState(null);

  useEffect(() => {
    setSelectedMember(null);
    setMemberStats(null);
    fetchHierarchy();
  }, [period]);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/team/hierarchy/${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHierarchy(response.data);
      setExpandedNodes({ [response.data.id]: true });
    } catch (error) {
      toast.error('Failed to fetch team hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberStats = async (memberId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get correct week dates from server for weekly period
      let weekDates = null;
      if (period === 'weekly') {
        const weekResponse = await axios.get(`${API}/team/week-dates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        weekDates = weekResponse.data.week_dates;
      }
      
      const response = await axios.get(`${API}/users/${memberId}/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Process activities based on period
      const activities = response.data;
      let processedStats = null;
      
      if (period === 'daily') {
        // Show today's activity only - get today from server
        const todayResponse = await axios.get(`${API}/team/week-dates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const today = todayResponse.data.today;
        const todayActivity = activities.find(a => a.date === today);
        processedStats = todayActivity ? [todayActivity] : [];
      } else if (period === 'weekly') {
        // Use server-provided week dates instead of client-side calculation
        const weekActivities = [];
        
        for (const dateInfo of weekDates) {
          const dayActivity = activities.find(a => a.date === dateInfo.date);
          weekActivities.push({
            date: dateInfo.date,
            dayName: dateInfo.day_name,
            contacts: dayActivity?.contacts || 0,
            appointments: dayActivity?.appointments || 0,
            presentations: dayActivity?.presentations || 0,
            referrals: dayActivity?.referrals || 0,
            testimonials: dayActivity?.testimonials || 0,
            sales: dayActivity?.sales || 0,
            new_face_sold: dayActivity?.new_face_sold || 0,
            premium: dayActivity?.premium || 0
          });
        }
        
        // Calculate weekly total
        const weekTotal = {
          date: 'Week Total',
          dayName: 'Total',
          contacts: weekActivities.reduce((sum, a) => sum + a.contacts, 0),
          appointments: weekActivities.reduce((sum, a) => sum + a.appointments, 0),
          presentations: weekActivities.reduce((sum, a) => sum + a.presentations, 0),
          referrals: weekActivities.reduce((sum, a) => sum + a.referrals, 0),
          testimonials: weekActivities.reduce((sum, a) => sum + a.testimonials, 0),
          sales: weekActivities.reduce((sum, a) => sum + a.sales, 0),
          new_face_sold: weekActivities.reduce((sum, a) => sum + a.new_face_sold, 0),
          premium: weekActivities.reduce((sum, a) => sum + a.premium, 0)
        };
        
        processedStats = [...weekActivities, weekTotal];
      } else {
        // For monthly/yearly, show all activities
        processedStats = activities.slice(0, 20);
      }
      
      setMemberStats(processedStats);
    } catch (error) {
      toast.error('Failed to fetch member details');
    }
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const viewMemberDetails = (member) => {
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setMemberStats(null);
    } else {
      setSelectedMember(member);
      fetchMemberStats(member.id);
    }
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];
    const isSelected = selectedMember?.id === node.id;

    return (
      <div key={node.id} className="mb-3">
        <div
          className={`p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all cursor-pointer ${
            isSelected ? 'border-blue-400' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          data-testid={`team-member-${node.id}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {hasChildren && (
                  <button
                    onClick={() => toggleNode(node.id)}
                    data-testid={`toggle-node-${node.id}`}
                    className="text-gray-500 hover:text-gray-700 shrink-0"
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-lg truncate" data-testid={`member-name-${node.id}`}>{node.name}</div>
                  <div className="text-sm text-gray-600" data-testid={`member-role-${node.id}`}>
                    {node.role.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{node.email}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div data-testid={`member-contacts-${node.id}`}>
                  <span className="text-gray-600">Contacts</span>
                  <span className="ml-2 font-semibold text-gray-900">{node.stats.contacts}</span>
                </div>
                <div data-testid={`member-presentations-${node.id}`}>
                  <span className="text-gray-600">Presentations</span>
                  <span className="ml-2 font-semibold text-gray-900">{node.stats.presentations}</span>
                </div>
                <div data-testid={`member-appointments-${node.id}`}>
                  <span className="text-gray-600">Appointments</span>
                  <span className="ml-2 font-semibold text-gray-900">{node.stats.appointments}</span>
                </div>
                <div data-testid={`member-sales-${node.id}`}>
                  <span className="text-gray-600">Sales</span>
                  <span className="ml-2 font-semibold text-gray-900">{node.stats.sales}</span>
                </div>
                <div data-testid={`member-premium-${node.id}`}>
                  <span className="text-gray-600">Premium</span>
                  <span className="ml-2 font-semibold text-gray-900">${node.stats.premium.toFixed(2)}</span>
                </div>
              </div>
              
              {/* View Details Button */}
              <button
                onClick={() => viewMemberDetails(node)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {isSelected 
                  ? '▼ Hide Details' 
                  : period === 'daily' 
                    ? '▶ View Today\'s Activity' 
                    : period === 'weekly'
                      ? '▶ View Week Breakdown'
                      : '▶ View Activity History'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Expanded Details */}
        {isSelected && memberStats && (
          <div className="ml-6 mt-3 p-5 bg-white rounded-lg border border-slate-200 shadow-sm" style={{ marginLeft: `${level * 24 + 24}px` }}>
            <h4 className="font-semibold text-lg mb-4 text-slate-700">
              {period === 'daily' ? 'Daily Activity' : period === 'weekly' ? 'Weekly Breakdown' : 'Activity History'}
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {memberStats.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No activities recorded</div>
              ) : (
                memberStats.map((activity, idx) => (
                  <div 
                    key={`${activity.date}-${idx}`} 
                    className={`p-4 rounded-lg ${
                      activity.dayName === 'Total' 
                        ? 'bg-emerald-50 border-2 border-emerald-400' 
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className={`font-semibold text-sm mb-3 ${activity.dayName === 'Total' ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {activity.dayName ? `${activity.dayName} ${activity.dayName !== 'Total' ? '- ' + activity.date : ''}` : activity.date}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Presentations</span>
                        <span className={`ml-2 font-semibold ${activity.dayName === 'Total' ? 'text-emerald-700' : 'text-gray-900'}`}>{activity.presentations}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Appointments</span>
                        <span className={`ml-2 font-semibold ${activity.dayName === 'Total' ? 'text-emerald-700' : 'text-gray-900'}`}>{activity.appointments}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sales</span>
                        <span className={`ml-2 font-semibold ${activity.dayName === 'Total' ? 'text-emerald-700' : 'text-gray-900'}`}>{activity.sales}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Premium</span>
                        <span className={`ml-2 font-semibold ${activity.dayName === 'Total' ? 'text-emerald-700' : 'text-gray-900'}`}>${typeof activity.premium === 'number' ? activity.premium.toFixed(2) : activity.premium}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {hasChildren && isExpanded && (
          <div className="mt-3">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-lg bg-white" data-testid="team-view-loading">
        <CardContent className="p-12 text-center text-gray-500">Loading team hierarchy...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white" data-testid="team-view-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-xl" data-testid="team-view-title">
            <Users className="text-blue-600" size={24} />
            Team Hierarchy
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
              <Button
                key={p}
                data-testid={`team-period-${p}-btn`}
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
        <p className="text-sm text-gray-600 mt-2" data-testid="team-view-subtitle">
          Showing {period} performance for your team
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="max-h-[600px] overflow-y-auto pr-2">
          {hierarchy ? renderNode(hierarchy) : <div className="text-center py-8 text-gray-500">No team data available</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamView;