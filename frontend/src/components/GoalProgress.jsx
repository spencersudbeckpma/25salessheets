import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Target, TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GoalProgress = ({ user }) => {
  const [individualProgress, setIndividualProgress] = useState(null);
  const [teamProgress, setTeamProgress] = useState(null);
  const [teamMembers, setTeamMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Goal setting forms
  const [individualGoals, setIndividualGoals] = useState({ goal_premium: '', stretch_goal_premium: '' });
  const [teamGoals, setTeamGoals] = useState({ goal_premium: '', stretch_goal_premium: '' });
  const [showIndividualForm, setShowIndividualForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);

  const isManager = ['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role);

  useEffect(() => {
    fetchIndividualProgress();
    if (isManager) {
      fetchTeamProgress();
      fetchTeamMembers();
    }
  }, []);

  const fetchIndividualProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/goals/individual/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIndividualProgress(response.data);
      if (response.data.has_goals) {
        setIndividualGoals({
          goal_premium: response.data.goal.goal,
          stretch_goal_premium: response.data.stretch_goal.goal
        });
      }
    } catch (error) {
      toast.error('Failed to fetch individual goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/goals/team/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamProgress(response.data);
      if (response.data.has_goals) {
        setTeamGoals({
          goal_premium: response.data.goal.goal,
          stretch_goal_premium: response.data.stretch_goal.goal
        });
      }
    } catch (error) {
      // Silent fail - just means no team goals set yet
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/goals/team/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(response.data);
    } catch (error) {
      toast.error('Failed to fetch team member goals');
    }
  };

  const handleSaveIndividualGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Handle empty values
      const goalInput = individualGoals.goal_premium;
      const stretchInput = individualGoals.stretch_goal_premium;
      
      if (goalInput === '' || goalInput === null || goalInput === undefined ||
          stretchInput === '' || stretchInput === null || stretchInput === undefined) {
        toast.error('Please enter both goal amounts');
        return;
      }
      
      // Remove commas from input before parsing (in case of formatted numbers)
      const goalValue = parseFloat(String(goalInput).replace(/,/g, ''));
      const stretchValue = parseFloat(String(stretchInput).replace(/,/g, ''));
      
      if (isNaN(goalValue) || isNaN(stretchValue) || goalValue <= 0 || stretchValue <= 0) {
        toast.error('Please enter valid positive goal amounts');
        return;
      }
      
      await axios.post(`${API}/goals/individual`, 
        {
          goal_premium: goalValue,
          stretch_goal_premium: stretchValue
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Individual goals saved!');
      setShowIndividualForm(false);
      fetchIndividualProgress();
    } catch (error) {
      toast.error('Failed to save goals');
    }
  };

  const handleSaveTeamGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Handle empty values
      const goalInput = teamGoals.goal_premium;
      const stretchInput = teamGoals.stretch_goal_premium;
      
      if (goalInput === '' || goalInput === null || goalInput === undefined ||
          stretchInput === '' || stretchInput === null || stretchInput === undefined) {
        toast.error('Please enter both goal amounts');
        return;
      }
      
      // Remove commas from input before parsing
      const goalValue = parseFloat(String(goalInput).replace(/,/g, ''));
      const stretchValue = parseFloat(String(stretchInput).replace(/,/g, ''));
      
      if (isNaN(goalValue) || isNaN(stretchValue) || goalValue <= 0 || stretchValue <= 0) {
        toast.error('Please enter valid positive goal amounts');
        return;
      }
      
      await axios.post(`${API}/goals/team`,
        {
          goal_premium: goalValue,
          stretch_goal_premium: stretchValue
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Team goals saved!');
      setShowTeamForm(false);
      fetchTeamProgress();
    } catch (error) {
      toast.error('Failed to save team goals');
    }
  };

  const ProgressBar = ({ percentage, onPace }) => (
    <div className="w-full bg-gray-200 rounded-full h-4">
      <div
        className={`h-4 rounded-full transition-all ${
          onPace ? 'bg-green-500' : 'bg-red-500'
        }`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );

  const GoalCard = ({ title, data, color = "blue" }) => (
    <div className={`p-5 bg-white rounded-lg border-2 border-${color}-200`}>
      <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Target size={20} className={`text-${color}-600`} />
        {title}
      </h4>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Current Progress</span>
            <span className="font-bold text-xl">${data.current.toLocaleString()}</span>
          </div>
          <ProgressBar percentage={data.percentage} onPace={data.on_pace} />
          <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
            <span>Goal: ${data.goal.toLocaleString()}</span>
            <span>{data.percentage}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Expected</div>
            <div className="font-semibold">${data.expected.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
          </div>
          <div className={`text-center p-2 rounded ${data.on_pace ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-xs text-gray-600">{data.ahead_behind >= 0 ? 'Ahead' : 'Behind'}</div>
            <div className={`font-semibold ${data.on_pace ? 'text-green-700' : 'text-red-700'}`}>
              ${Math.abs(data.ahead_behind).toLocaleString('en-US', {maximumFractionDigits: 0})}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Weekly Pace Needed:</span>
            <span className="font-bold text-lg text-blue-600">${data.weekly_needed.toLocaleString()}/wk</span>
          </div>
          {data.on_pace ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
              <CheckCircle size={16} />
              On pace to hit goal!
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
              <AlertCircle size={16} />
              Need to increase pace
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="shadow-lg bg-white">
        <CardContent className="p-12 text-center text-gray-500">Loading goals...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="text-green-600" size={24} />
          Goal Progress & Pace Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList className={`grid w-full ${isManager ? 'grid-cols-3' : 'grid-cols-1'} bg-gray-100 p-1`}>
            <TabsTrigger value="individual" className="py-2 text-sm">
              My Goals
            </TabsTrigger>
            {isManager && (
              <>
                <TabsTrigger value="team" className="py-2 text-sm">
                  Team Goals
                </TabsTrigger>
                <TabsTrigger value="members" className="py-2 text-sm">
                  Team Members
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Individual Goals Tab */}
          <TabsContent value="individual" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Your Premium Goals for {individualProgress?.year || new Date().getFullYear()}</h3>
                {individualProgress?.has_goals && (
                  <p className="text-sm text-gray-600">
                    {individualProgress.weeks_elapsed} weeks elapsed • {individualProgress.weeks_remaining} weeks remaining
                  </p>
                )}
              </div>
              <Button
                onClick={() => setShowIndividualForm(!showIndividualForm)}
                variant={individualProgress?.has_goals ? 'outline' : 'default'}
              >
                {individualProgress?.has_goals ? 'Edit Goals' : 'Set Goals'}
              </Button>
            </div>

            {showIndividualForm && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-3">Set Your Annual Premium Goals</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Goal Premium ($)</Label>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={individualGoals.goal_premium}
                      onChange={(e) => setIndividualGoals({...individualGoals, goal_premium: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Stretch Goal Premium ($)</Label>
                    <Input
                      type="number"
                      placeholder="150000"
                      value={individualGoals.stretch_goal_premium}
                      onChange={(e) => setIndividualGoals({...individualGoals, stretch_goal_premium: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveIndividualGoals}>Save Goals</Button>
                  <Button variant="outline" onClick={() => setShowIndividualForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {individualProgress?.has_goals ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GoalCard title="Goal" data={individualProgress.goal} color="blue" />
                <GoalCard title="Stretch Goal" data={individualProgress.stretch_goal} color="purple" />
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                <Target size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">You haven't set your goals yet</p>
                <Button onClick={() => setShowIndividualForm(true)}>Set Goals Now</Button>
              </div>
            )}
          </TabsContent>

          {/* Team Goals Tab */}
          {isManager && (
            <TabsContent value="team" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Team Premium Goals for {teamProgress?.year || new Date().getFullYear()}</h3>
                  {teamProgress?.has_goals && (
                    <p className="text-sm text-gray-600">
                      Team Size: {teamProgress.team_size} • {teamProgress.weeks_elapsed} weeks elapsed
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => setShowTeamForm(!showTeamForm)}
                  variant={teamProgress?.has_goals ? 'outline' : 'default'}
                >
                  {teamProgress?.has_goals ? 'Edit Team Goals' : 'Set Team Goals'}
                </Button>
              </div>

              {showTeamForm && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold mb-3">Set Team Annual Premium Goals</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Team Goal Premium ($)</Label>
                      <Input
                        type="number"
                        placeholder="500000"
                        value={teamGoals.goal_premium}
                        onChange={(e) => setTeamGoals({...teamGoals, goal_premium: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Team Stretch Goal Premium ($)</Label>
                      <Input
                        type="number"
                        placeholder="750000"
                        value={teamGoals.stretch_goal_premium}
                        onChange={(e) => setTeamGoals({...teamGoals, stretch_goal_premium: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTeamGoals}>Save Team Goals</Button>
                    <Button variant="outline" onClick={() => setShowTeamForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {teamProgress?.has_goals ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GoalCard title="Team Goal" data={teamProgress.goal} color="green" />
                  <GoalCard title="Team Stretch Goal" data={teamProgress.stretch_goal} color="emerald" />
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                  <Users size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No team goals set yet</p>
                  <Button onClick={() => setShowTeamForm(true)}>Set Team Goals</Button>
                </div>
              )}
            </TabsContent>
          )}

          {/* Team Members Tab */}
          {isManager && teamMembers && (
            <TabsContent value="members" className="space-y-4">
              <h3 className="font-semibold">Team Members' Goal Progress</h3>
              
              <div className="space-y-3">
                {teamMembers.members.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No team members found</div>
                ) : (
                  teamMembers.members
                    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                    .map((member) => (
                      <div key={member.id} className="p-4 bg-white border-2 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.role.replace('_', ' ').toUpperCase()}</div>
                          </div>
                          {member.has_goals && (
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              member.on_pace ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {member.on_pace ? '✓ On Pace' : '⚠ Behind'}
                            </div>
                          )}
                        </div>

                        {member.has_goals ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">YTD Premium:</span>
                              <span className="font-semibold">${member.ytd_premium.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Goal:</span>
                              <span className="font-semibold">${member.goal_premium.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Stretch Goal:</span>
                              <span className="font-semibold">${member.stretch_goal_premium.toLocaleString()}</span>
                            </div>
                            <div className="mt-2">
                              <ProgressBar percentage={member.percentage} onPace={member.on_pace} />
                              <div className="flex justify-between mt-1 text-xs">
                                <span className={member.ahead_behind >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {member.ahead_behind >= 0 ? 'Ahead' : 'Behind'} by ${Math.abs(member.ahead_behind).toLocaleString('en-US', {maximumFractionDigits: 0})}
                                </span>
                                <span className="text-gray-600">{member.percentage}%</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            YTD Premium: ${member.ytd_premium.toLocaleString()} • No goals set
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GoalProgress;
