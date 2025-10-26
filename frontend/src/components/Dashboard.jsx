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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-8">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800" data-testid="dashboard-title">CRM Sales Tracker</h1>
            <p className="text-sm text-gray-600 mt-1" data-testid="user-info">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-lg shadow-md p-1.5 h-auto" data-testid="dashboard-tabs">
            <TabsTrigger value="activity" data-testid="activity-tab" className="py-2.5">Daily Activity</TabsTrigger>
            <TabsTrigger value="stats" data-testid="stats-tab" className="py-2.5">My Stats</TabsTrigger>
            <TabsTrigger value="team" data-testid="team-tab" className="py-2.5">Team View</TabsTrigger>
            <TabsTrigger value="manage" data-testid="manage-tab" className="py-2.5">Team Management</TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="leaderboard-tab" className="py-2.5">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" data-testid="activity-content" className="mt-6">
            <ActivityInput user={user} />
          </TabsContent>

          <TabsContent value="stats" data-testid="stats-content" className="mt-6">
            <StatsView user={user} />
          </TabsContent>

          <TabsContent value="team" data-testid="team-content" className="mt-6">
            <TeamView user={user} />
          </TabsContent>

          <TabsContent value="manage" data-testid="manage-content" className="mt-6">
            <TeamManagement user={user} />
          </TabsContent>

          <TabsContent value="leaderboard" data-testid="leaderboard-content" className="mt-6">
            <Leaderboard user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;