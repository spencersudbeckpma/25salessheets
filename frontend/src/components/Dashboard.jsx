import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import ActivityInput from './ActivityInput';
import StatsView from './StatsView';
import TeamView from './TeamView';
import TeamManagement from './TeamManagement';
import Leaderboard from './Leaderboard';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {
  const [activeTab, setActiveTab] = useState('activity');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800" data-testid="dashboard-title">CRM Sales Tracker</h1>
            <p className="text-sm text-gray-600" data-testid="user-info">
              {user.name} | {user.role.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-lg shadow-md p-1" data-testid="dashboard-tabs">
            <TabsTrigger value="activity" data-testid="activity-tab">Daily Activity</TabsTrigger>
            <TabsTrigger value="stats" data-testid="stats-tab">My Stats</TabsTrigger>
            <TabsTrigger value="team" data-testid="team-tab">Team View</TabsTrigger>
            <TabsTrigger value="manage" data-testid="manage-tab">Team Management</TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="leaderboard-tab">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" data-testid="activity-content">
            <ActivityInput user={user} />
          </TabsContent>

          <TabsContent value="stats" data-testid="stats-content">
            <StatsView user={user} />
          </TabsContent>

          <TabsContent value="team" data-testid="team-content">
            <TeamView user={user} />
          </TabsContent>

          <TabsContent value="manage" data-testid="manage-content">
            <TeamManagement user={user} />
          </TabsContent>

          <TabsContent value="leaderboard" data-testid="leaderboard-content">
            <Leaderboard user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;