import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { TrendingUp, Users, BarChart3, User, ChevronRight, ChevronDown, Target, Activity, Calendar } from 'lucide-react';
import GoalProgress from './GoalProgress';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Hierarchical Manager Card Component
const ManagerHierarchyCard = ({ manager, index, level, expanded, subordinates, onToggle }) => {
  const hasSubordinates = manager.has_subordinate_managers;
  
  return (
    <div style={{ marginLeft: level > 0 ? `${level * 2}rem` : '0' }}>
      <div 
        className={`p-4 rounded-lg border-2 ${
          level === 0 && index < 3 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300' 
            : level > 0 && index < 3
            ? 'bg-gradient-to-r from-green-50 to-teal-50 border-green-300'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Expand/Collapse Button */}
            {hasSubordinates && (
              <button
                onClick={() => onToggle(manager.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
              >
                {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
            )}
            {!hasSubordinates && <div className="w-7"></div>}
            
            {/* Rank Badge */}
            <div className="flex-shrink-0 w-8 text-center">
              {level === 0 && index < 3 ? (
                <span className="text-xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </span>
              ) : (
                <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
              )}
            </div>
            
            {/* Manager Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{manager.name}</div>
              <div className="text-xs text-gray-500">
                {manager.role.replace('_', ' ').toUpperCase()} • Team Size: {manager.team_size}
              </div>
            </div>
          </div>
          
          {/* Metrics */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-gray-600">Presentations:</span>
              <span className="ml-1 font-semibold">{manager.averages.presentations}/wk</span>
            </div>
            <div>
              <span className="text-gray-600">Appointments:</span>
              <span className="ml-1 font-semibold">{manager.averages.appointments}/wk</span>
            </div>
            <div>
              <span className="text-gray-600">Sales:</span>
              <span className="ml-1 font-semibold">{manager.averages.sales}/wk</span>
            </div>
            <div>
              <span className="text-gray-600">Premium:</span>
              <span className="ml-1 font-semibold text-green-600">${manager.averages.premium}/wk</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subordinate Managers (Expanded) */}
      {expanded && subordinates && subordinates.length > 0 && (
        <div className="mt-2 space-y-2">
          {subordinates
            .sort((a, b) => b.averages.premium - a.averages.premium)
            .map((sub, subIndex) => (
              <ManagerHierarchyCard
                key={sub.id}
                manager={sub}
                index={subIndex}
                level={level + 1}
                expanded={false}
                subordinates={null}
                onToggle={onToggle}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const Analytics = ({ user }) => {
  const [personalAverages, setPersonalAverages] = useState(null);
  const [teamAverages, setTeamAverages] = useState(null);
  const [individualMemberAverages, setIndividualMemberAverages] = useState(null);
  const [managerTeamAverages, setManagerTeamAverages] = useState(null);
  const [trueFieldAverages, setTrueFieldAverages] = useState(null);
  const [fieldPeriod, setFieldPeriod] = useState('last_4_weeks');
  const [selectedPeriod, setSelectedPeriod] = useState('last_4_weeks');
  const [managerPeriod, setManagerPeriod] = useState('last_4_weeks');
  const [loading, setLoading] = useState(true);
  const [expandedManagers, setExpandedManagers] = useState(new Set());
  const [subordinateData, setSubordinateData] = useState({});

  const isManager = ['state_manager', 'regional_manager', 'district_manager'].includes(user.role);
  const isStateManager = user.role === 'state_manager';

  useEffect(() => {
    fetchPersonalAverages();
    if (isManager) {
      fetchTeamAverages();
      fetchIndividualMemberAverages();
      fetchManagerTeamAverages();
    }
    if (isStateManager) {
      fetchTrueFieldAverages();
    }
  }, []);

  useEffect(() => {
    if (isManager) {
      fetchIndividualMemberAverages();
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (isManager) {
      fetchManagerTeamAverages();
    }
  }, [managerPeriod]);

  useEffect(() => {
    if (isStateManager) {
      fetchTrueFieldAverages();
    }
  }, [fieldPeriod]);

  const fetchTrueFieldAverages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/true-field-averages?period=${fieldPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrueFieldAverages(response.data);
    } catch (error) {
      console.error('Failed to fetch true field averages');
    }
  };

  const fetchPersonalAverages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/personal-averages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPersonalAverages(response.data);
    } catch (error) {
      toast.error('Failed to fetch personal averages');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAverages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/team-averages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamAverages(response.data);
    } catch (error) {
      toast.error('Failed to fetch team averages');
    }
  };

  const fetchIndividualMemberAverages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/individual-member-averages?period=${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIndividualMemberAverages(response.data);
    } catch (error) {
      toast.error('Failed to fetch individual member averages');
    }
  };

  const fetchManagerTeamAverages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/manager-team-averages?period=${managerPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManagerTeamAverages(response.data);
    } catch (error) {
      toast.error('Failed to fetch manager team averages');
    }
  };

  const fetchSubordinateManagers = async (managerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/manager-subordinates?manager_id=${managerId}&period=${managerPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubordinateData(prev => ({
        ...prev,
        [managerId]: response.data.managers
      }));
    } catch (error) {
      toast.error('Failed to fetch subordinate managers');
    }
  };

  const toggleManagerExpansion = async (managerId) => {
    const newExpanded = new Set(expandedManagers);
    if (newExpanded.has(managerId)) {
      newExpanded.delete(managerId);
    } else {
      newExpanded.add(managerId);
      // Fetch subordinates if not already loaded
      if (!subordinateData[managerId]) {
        await fetchSubordinateManagers(managerId);
      }
    }
    setExpandedManagers(newExpanded);
  };

  const periodLabels = {
    last_4_weeks: '4 Weeks',
    last_8_weeks: '8 Weeks',
    last_12_weeks: '12 Weeks',
    ytd: 'YTD'
  };

  if (loading) {
    return (
      <Card className="shadow-lg bg-white">
        <CardContent className="p-12 text-center text-gray-500">Loading analytics...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="text-purple-600" size={24} />
          Performance Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className={`grid w-full ${isStateManager ? 'grid-cols-6' : isManager ? 'grid-cols-5' : 'grid-cols-2'} bg-gray-100 p-1`}>
            <TabsTrigger value="personal" className="py-2 text-xs md:text-sm">
              <User size={16} className="mr-1 md:mr-2" />
              <span className="hidden md:inline">My Averages</span>
              <span className="md:hidden">Me</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="py-2 text-xs md:text-sm">
              <Target size={16} className="mr-1 md:mr-2" />
              <span className="hidden md:inline">Goal Progress</span>
              <span className="md:hidden">Goals</span>
            </TabsTrigger>
            {isManager && (
              <>
                <TabsTrigger value="team" className="py-2 text-xs md:text-sm">
                  <Users size={16} className="mr-1 md:mr-2" />
                  <span className="hidden md:inline">Team Overview</span>
                  <span className="md:hidden">Team</span>
                </TabsTrigger>
                <TabsTrigger value="managers" className="py-2 text-xs md:text-sm">
                  <TrendingUp size={16} className="mr-1 md:mr-2" />
                  <span className="hidden md:inline">Manager Averages</span>
                  <span className="md:hidden">Managers</span>
                </TabsTrigger>
                <TabsTrigger value="individual" className="py-2 text-xs md:text-sm">
                  <BarChart3 size={16} className="mr-1 md:mr-2" />
                  <span className="hidden md:inline">Team Members</span>
                  <span className="md:hidden">Members</span>
                </TabsTrigger>
              </>
            )}
            {isStateManager && (
              <TabsTrigger value="field" className="py-2 text-xs md:text-sm">
                <Activity size={16} className="mr-1 md:mr-2" />
                <span className="hidden md:inline">True Field Avgs</span>
                <span className="md:hidden">Field</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Personal Averages Tab */}
          <TabsContent value="personal" className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Your Weekly Averages</h3>
              <p className="text-xs text-gray-600">Average performance per week across different time periods</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {personalAverages && Object.entries(personalAverages).map(([period, data]) => (
                <div key={period} className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-3">{periodLabels[period]}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Presentations</span>
                      <span className="font-bold text-lg">{data.averages.presentations}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Appointments</span>
                      <span className="font-bold text-lg">{data.averages.appointments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sales</span>
                      <span className="font-bold text-lg">{data.averages.sales}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                      <span className="text-sm text-gray-600">Premium</span>
                      <span className="font-bold text-lg text-green-600">${data.averages.premium}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Goal Progress Tab */}
          <TabsContent value="goals">
            <GoalProgress user={user} />
          </TabsContent>

          {/* Team Averages Tab (Managers Only) */}
          {isManager && (
            <TabsContent value="team" className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Team Performance Overview</h3>
                <p className="text-xs text-gray-600">Average performance per team member per week</p>
              </div>

              {teamAverages && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(teamAverages).map(([period, data]) => (
                    <div key={period} className="p-4 bg-white rounded-lg border-2 border-green-200">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase">{periodLabels[period]}</div>
                        <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {data.team_size} members
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Presentations</span>
                          <span className="font-bold text-lg">{data.team_averages_per_member.presentations}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Appointments</span>
                          <span className="font-bold text-lg">{data.team_averages_per_member.appointments}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Sales</span>
                          <span className="font-bold text-lg">{data.team_averages_per_member.sales}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                          <span className="text-sm text-gray-600">Premium</span>
                          <span className="font-bold text-lg text-green-600">${data.team_averages_per_member.premium}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Manager Averages Tab (Managers Only) */}
          {isManager && (
            <TabsContent value="managers" className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-1">Manager Team Performance</h3>
                  <p className="text-xs text-gray-600">Compare how each manager's team is performing (average per member per week)</p>
                </div>
                <div className="flex gap-2">
                  {Object.keys(periodLabels).map(period => (
                    <Button
                      key={period}
                      size="sm"
                      variant={managerPeriod === period ? 'default' : 'outline'}
                      onClick={() => setManagerPeriod(period)}
                      className="text-xs"
                    >
                      {periodLabels[period]}
                    </Button>
                  ))}
                </div>
              </div>

              {managerTeamAverages && (
                <div className="space-y-3">
                  {managerTeamAverages.managers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No direct report managers found. This view shows your Regional Managers, District Managers, etc.
                    </div>
                  ) : (
                    <>
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <div className="text-xs text-gray-500 mb-1">Total Managers</div>
                          <div className="text-2xl font-bold">{managerTeamAverages.managers.length}</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xs text-gray-500 mb-1">Total Team Size</div>
                          <div className="text-2xl font-bold">
                            {managerTeamAverages.managers.reduce((sum, m) => sum + m.team_size, 0)}
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs text-gray-500 mb-1">Avg Sales/Team</div>
                          <div className="text-2xl font-bold">
                            {(managerTeamAverages.managers.reduce((sum, m) => sum + m.averages.sales, 0) / managerTeamAverages.managers.length).toFixed(1)}
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="text-xs text-gray-500 mb-1">Avg Premium/Team</div>
                          <div className="text-2xl font-bold">
                            ${(managerTeamAverages.managers.reduce((sum, m) => sum + m.averages.premium, 0) / managerTeamAverages.managers.length).toFixed(0)}
                          </div>
                        </div>
                      </div>

                      {/* Hierarchical Manager List */}
                      <div className="space-y-2">
                        {managerTeamAverages.managers
                          .sort((a, b) => b.averages.premium - a.averages.premium)
                          .map((manager, index) => (
                            <ManagerHierarchyCard
                              key={manager.id}
                              manager={manager}
                              index={index}
                              level={0}
                              expanded={expandedManagers.has(manager.id)}
                              subordinates={subordinateData[manager.id]}
                              onToggle={toggleManagerExpansion}
                            />
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          )}

          {/* Individual Member Performance Tab (Managers Only) */}
          {isManager && (
            <TabsContent value="individual" className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-1">Individual Team Member Performance</h3>
                  <p className="text-xs text-gray-600">Weekly averages for each team member</p>
                </div>
                <div className="flex gap-2">
                  {Object.keys(periodLabels).map(period => (
                    <Button
                      key={period}
                      size="sm"
                      variant={selectedPeriod === period ? 'default' : 'outline'}
                      onClick={() => setSelectedPeriod(period)}
                      className="text-xs"
                    >
                      {periodLabels[period]}
                    </Button>
                  ))}
                </div>
              </div>

              {individualMemberAverages && (
                <div className="space-y-3">
                  {individualMemberAverages.members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No team members found</div>
                  ) : (
                    <>
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <div className="text-xs text-gray-500 mb-1">Total Members</div>
                          <div className="text-2xl font-bold">{individualMemberAverages.members.length}</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xs text-gray-500 mb-1">Avg Presentations</div>
                          <div className="text-2xl font-bold">
                            {(individualMemberAverages.members.reduce((sum, m) => sum + m.averages.presentations, 0) / individualMemberAverages.members.length).toFixed(1)}
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs text-gray-500 mb-1">Avg Sales</div>
                          <div className="text-2xl font-bold">
                            {(individualMemberAverages.members.reduce((sum, m) => sum + m.averages.sales, 0) / individualMemberAverages.members.length).toFixed(1)}
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="text-xs text-gray-500 mb-1">Avg Premium</div>
                          <div className="text-2xl font-bold">
                            ${(individualMemberAverages.members.reduce((sum, m) => sum + m.averages.premium, 0) / individualMemberAverages.members.length).toFixed(0)}
                          </div>
                        </div>
                      </div>

                      {/* Member List */}
                      <div className="space-y-2">
                        {individualMemberAverages.members
                          .sort((a, b) => b.averages.premium - a.averages.premium)
                          .map((member, index) => (
                            <div 
                              key={member.id} 
                              className={`p-4 rounded-lg border-2 ${
                                index < 3 
                                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' 
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0 w-8 text-center">
                                    {index < 3 ? (
                                      <span className="text-xl">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                      </span>
                                    ) : (
                                      <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{member.name}</div>
                                    <div className="text-xs text-gray-500">{member.role.replace('_', ' ').toUpperCase()}</div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-600">Presentations:</span>
                                    <span className="ml-1 font-semibold">{member.averages.presentations}/wk</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Appointments:</span>
                                    <span className="ml-1 font-semibold">{member.averages.appointments}/wk</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Sales:</span>
                                    <span className="ml-1 font-semibold">{member.averages.sales}/wk</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Premium:</span>
                                    <span className="ml-1 font-semibold text-green-600">${member.averages.premium}/wk</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          )}

          {/* True Field Averages Tab - State Manager Only */}
          {isStateManager && (
            <TabsContent value="field" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">True Field Averages</h3>
                  <p className="text-sm text-gray-500">
                    Only counting people who logged activity ({trueFieldAverages?.active_field_count || 0} active in field)
                  </p>
                </div>
                <select
                  value={fieldPeriod}
                  onChange={(e) => setFieldPeriod(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="last_week">Last Week</option>
                  <option value="last_2_weeks">Last 2 Weeks</option>
                  <option value="last_4_weeks">Last 4 Weeks</option>
                  <option value="last_8_weeks">Last 8 Weeks</option>
                  <option value="last_12_weeks">Last 12 Weeks</option>
                  <option value="ytd">Year to Date</option>
                </select>
              </div>

              {trueFieldAverages ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium">Avg Appointments/wk</div>
                      <div className="text-2xl font-bold text-blue-700">{trueFieldAverages.true_averages.appointments}</div>
                      <div className="text-xs text-blue-500 mt-1">Total: {trueFieldAverages.totals.appointments}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium">Avg Presentations/wk</div>
                      <div className="text-2xl font-bold text-purple-700">{trueFieldAverages.true_averages.presentations}</div>
                      <div className="text-xs text-purple-500 mt-1">Total: {trueFieldAverages.totals.presentations}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                      <div className="text-sm text-amber-600 font-medium">Avg Sales/wk</div>
                      <div className="text-2xl font-bold text-amber-700">{trueFieldAverages.true_averages.sales}</div>
                      <div className="text-xs text-amber-500 mt-1">Total: {trueFieldAverages.totals.sales}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <div className="text-sm text-green-600 font-medium">Avg Premium/wk</div>
                      <div className="text-2xl font-bold text-green-700">${trueFieldAverages.true_averages.premium.toLocaleString()}</div>
                      <div className="text-xs text-green-500 mt-1">Total: ${trueFieldAverages.totals.premium.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Period Info */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Calendar size={16} />
                    <span>{trueFieldAverages.weeks} weeks • {trueFieldAverages.start_date} to {trueFieldAverages.end_date}</span>
                  </div>

                  {/* Active Field Members Breakdown */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
                      <span className="font-medium">Active Field Members ({trueFieldAverages.active_users.length})</span>
                      <span className="text-xs text-slate-300">Sorted by Premium</span>
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                      {trueFieldAverages.active_users.map((member, index) => (
                        <div key={member.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800">{member.name}</div>
                                <div className="text-xs text-gray-500">{member.role.replace('_', ' ').toUpperCase()} • {member.days_active} days active</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">${member.premium.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">total premium</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm bg-gray-50 rounded-lg p-2">
                            <div className="text-center">
                              <div className="font-semibold text-blue-600">{member.avg_appointments_per_week}</div>
                              <div className="text-xs text-gray-500">Appts/wk</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-purple-600">{member.avg_presentations_per_week}</div>
                              <div className="text-xs text-gray-500">Pres/wk</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-amber-600">{member.avg_sales_per_week}</div>
                              <div className="text-xs text-gray-500">Sales/wk</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-green-600">${member.avg_premium_per_week.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">Prem/wk</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {trueFieldAverages.active_users.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                          No activity recorded in this period
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">Loading true field averages...</div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Analytics;
