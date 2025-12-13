import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, Users, BarChart3 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Analytics = ({ user }) => {
  const [personalAverages, setPersonalAverages] = useState(null);
  const [teamAverages, setTeamAverages] = useState(null);
  const [individualMemberAverages, setIndividualMemberAverages] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last_4_weeks');
  const [loading, setLoading] = useState(true);

  const isManager = ['state_manager', 'regional_manager', 'district_manager'].includes(user.role);

  useEffect(() => {
    fetchPersonalAverages();
    if (isManager) {
      fetchTeamAverages();
    }
  }, []);

  useEffect(() => {
    if (isManager) {
      fetchIndividualMemberAverages();
    }
  }, [selectedPeriod]);

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

  const periodLabels = {
    last_4_weeks: 'Last 4 Weeks',
    last_8_weeks: 'Last 8 Weeks',
    last_12_weeks: 'Last 12 Weeks',
    ytd: 'Year to Date'
  };

  if (loading) {
    return (
      <Card className="shadow-lg bg-white">
        <CardContent className="p-12 text-center text-gray-500">Loading analytics...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Averages */}
      <Card className="shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={24} />
            Your Weekly Averages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {personalAverages && Object.entries(personalAverages).map(([period, data]) => (
              <div key={period} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="text-sm font-semibold text-gray-700 mb-3">{periodLabels[period]}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Presentations:</span>
                    <span className="font-bold">{data.averages.presentations}/wk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Appointments:</span>
                    <span className="font-bold">{data.averages.appointments}/wk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sales:</span>
                    <span className="font-bold">{data.averages.sales}/wk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Premium:</span>
                    <span className="font-bold">${data.averages.premium}/wk</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Averages (Managers Only) */}
      {isManager && teamAverages && (
        <Card className="shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="text-green-600" size={24} />
              Team Averages (Per Member, Per Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(teamAverages).map(([period, data]) => (
                <div key={period} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">{periodLabels[period]}</div>
                  <div className="text-xs text-gray-500 mb-3">Team Size: {data.team_size}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Presentations:</span>
                      <span className="font-bold">{data.team_averages_per_member.presentations}/wk</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Appointments:</span>
                      <span className="font-bold">{data.team_averages_per_member.appointments}/wk</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sales:</span>
                      <span className="font-bold">{data.team_averages_per_member.sales}/wk</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Premium:</span>
                      <span className="font-bold">${data.team_averages_per_member.premium}/wk</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Member Performance (Managers Only) */}
      {isManager && individualMemberAverages && (
        <Card className="shadow-lg bg-white">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="text-purple-600" size={24} />
                Individual Team Member Averages
              </CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {individualMemberAverages.members.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No team members found</div>
              ) : (
                individualMemberAverages.members
                  .sort((a, b) => b.averages.premium - a.averages.premium)
                  .map((member, index) => (
                    <div key={member.id} className={`p-4 rounded-lg border ${index < 3 ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {index < 3 && <span className="text-lg">🏆</span>}
                            <div>
                              <div className="font-semibold">{member.name}</div>
                              <div className="text-xs text-gray-600">{member.role.replace('_', ' ').toUpperCase()}</div>
                            </div>
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
                            <span className="ml-1 font-semibold">${member.averages.premium}/wk</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
