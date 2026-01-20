import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { 
  Target, TrendingUp, TrendingDown, Clock, 
  DollarSign, CheckCircle, AlertCircle, Users, Trophy,
  Calendar
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SNATracker = ({ user }) => {
  const [snaData, setSnaData] = useState({ active: [], graduated: [], goal: 30000, tracking_days: 90 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'graduated'

  useEffect(() => {
    fetchSNAAgents();
  }, []);

  const fetchSNAAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sna-tracker`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnaData(response.data);
    } catch (error) {
      toast.error('Failed to fetch SNA data');
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const activeAgents = snaData.active || [];
  const graduatedAgents = snaData.graduated || [];
  const completedAgents = graduatedAgents.filter(a => a.status === 'completed');
  const expiredAgents = graduatedAgents.filter(a => a.status === 'expired');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="text-green-600" size={20} />
          SNA Tracker - New Agent Progress
        </h3>
        <p className="text-sm text-gray-500">
          Automatically tracks agents from first production • 90-day period • ${snaData.goal?.toLocaleString()} premium goal
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{activeAgents.length}</div>
            <div className="text-sm opacity-90">Active Tracking</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              {activeAgents.filter(a => a.on_pace).length}
            </div>
            <div className="text-sm opacity-90">On Pace</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              {activeAgents.filter(a => !a.on_pace).length}
            </div>
            <div className="text-sm opacity-90">Behind Pace</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{completedAgents.length}</div>
            <div className="text-sm opacity-90 flex items-center gap-1">
              <Trophy size={14} /> Completed Goal
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              ${((activeAgents.reduce((sum, a) => sum + a.total_premium, 0) + 
                  graduatedAgents.reduce((sum, a) => sum + a.total_premium, 0)) / 1000).toFixed(1)}K
            </div>
            <div className="text-sm opacity-90">Total Premium</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'active' 
              ? 'bg-white shadow text-green-700' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Clock size={16} />
            Active ({activeAgents.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('graduated')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'graduated' 
              ? 'bg-white shadow text-amber-700' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Trophy size={16} />
            Graduated/Completed ({graduatedAgents.length})
          </span>
        </button>
      </div>

      {/* Active Agents Tab */}
      {activeTab === 'active' && (
        <>
          {activeAgents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No new agents in their 90-day period</p>
                <p className="text-sm mt-2">Agents will automatically appear here when they enter their first production</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAgents.map(agent => (
                <Card key={agent.id} className={`border-l-4 ${agent.on_pace ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                        <p className="text-sm text-gray-500">{agent.manager_name && `Upline: ${agent.manager_name}`}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        agent.on_pace 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {agent.on_pace ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {agent.on_pace ? 'On Pace' : 'Behind'}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{agent.progress_percent}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            agent.on_pace ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(agent.progress_percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          Day
                        </div>
                        <div className="font-semibold">{agent.days_in} of 90</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-gray-500 flex items-center gap-1">
                          <DollarSign size={12} />
                          Premium
                        </div>
                        <div className="font-semibold">${agent.total_premium.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-gray-500 flex items-center gap-1">
                          <Target size={12} />
                          Goal
                        </div>
                        <div className="font-semibold">${agent.goal.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-gray-500 flex items-center gap-1">
                          <TrendingUp size={12} />
                          Need/Week
                        </div>
                        <div className="font-semibold">${agent.weekly_needed.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Expected vs Actual */}
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected by now:</span>
                        <span className="font-medium">${agent.expected_by_now.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Actual:</span>
                        <span className={`font-medium ${agent.on_pace ? 'text-green-600' : 'text-red-600'}`}>
                          ${agent.total_premium.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-600">First production:</span>
                        <span className="font-medium">{agent.sna_start_date}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Days remaining:</span>
                        <span className="font-medium">{agent.days_remaining}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Graduated/Completed Tab */}
      {activeTab === 'graduated' && (
        <>
          {graduatedAgents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                <p>No graduated agents yet</p>
                <p className="text-sm mt-2">Agents who complete the $30,000 goal or finish 90 days will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Completed Goal Section */}
              {completedAgents.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <Trophy size={18} />
                    Completed Goal (${snaData.goal?.toLocaleString()})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedAgents.map(agent => (
                      <Card key={agent.id} className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                {agent.name}
                                <Trophy size={16} className="text-amber-500" />
                              </h4>
                              <p className="text-sm text-gray-500">{agent.manager_name && `Upline: ${agent.manager_name}`}</p>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <CheckCircle size={14} />
                              Completed
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/70 rounded p-2">
                              <div className="text-gray-500">Final Premium</div>
                              <div className="font-semibold text-green-600">${agent.total_premium.toLocaleString()}</div>
                            </div>
                            <div className="bg-white/70 rounded p-2">
                              <div className="text-gray-500">Days Taken</div>
                              <div className="font-semibold">{agent.days_in} days</div>
                            </div>
                            <div className="bg-white/70 rounded p-2">
                              <div className="text-gray-500">Goal</div>
                              <div className="font-semibold">${agent.goal.toLocaleString()}</div>
                            </div>
                            <div className="bg-white/70 rounded p-2">
                              <div className="text-gray-500">Over Goal</div>
                              <div className="font-semibold text-green-600">
                                +${(agent.total_premium - agent.goal).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Expired (90 days passed) Section */}
              {expiredAgents.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-600 mb-3 flex items-center gap-2">
                    <Clock size={18} />
                    90 Days Completed (Goal Not Reached)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expiredAgents.map(agent => (
                      <Card key={agent.id} className="border-l-4 border-l-gray-400">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                              <p className="text-sm text-gray-500">{agent.manager_name && `Upline: ${agent.manager_name}`}</p>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <AlertCircle size={14} />
                              Expired
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-gray-500">Final Premium</div>
                              <div className="font-semibold">${agent.total_premium.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-gray-500">% of Goal</div>
                              <div className="font-semibold">{agent.progress_percent}%</div>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-gray-500">Goal</div>
                              <div className="font-semibold">${agent.goal.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-gray-500">Short By</div>
                              <div className="font-semibold text-red-600">
                                -${(agent.goal - agent.total_premium).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SNATracker;
