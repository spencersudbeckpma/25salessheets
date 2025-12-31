import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import ActivityInput from './ActivityInput';
import StatsView from './StatsView';
import TeamView from './TeamView';
import TeamManagement from './TeamManagement';
import Leaderboard from './Leaderboard';
import Reports from './Reports';
import Analytics from './Analytics';
import PMABonuses from './PMABonuses';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {
  const [activeTab, setActiveTab] = useState('activity');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pb-8">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-emerald-100 p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-2xl shadow-lg">
              <img 
                src="/team-sudbeck-logo.jpg" 
                alt="Team Sudbeck Logo" 
                className="h-10 md:h-12 w-auto object-contain flex-shrink-0 rounded-xl"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-emerald-900 truncate" data-testid="dashboard-title">
                Team Sudbeck Sales Tracker
              </h1>
              <p className="text-xs md:text-sm text-emerald-600 mt-1 truncate" data-testid="user-info">
                {user.name} • {user.role.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2 w-full md:w-auto justify-center border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            size="sm"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className={`inline-flex w-full md:grid md:w-full ${['state_manager', 'regional_manager', 'district_manager'].includes(user.role) ? 'md:grid-cols-8' : 'md:grid-cols-6'} gap-1 md:gap-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 md:p-2 h-auto min-w-max md:min-w-0`} data-testid="dashboard-tabs">
              <TabsTrigger 
                value="activity" 
                data-testid="activity-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Daily Activity
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                data-testid="stats-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                My Stats
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                data-testid="team-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                Team View
              </TabsTrigger>
              <TabsTrigger 
                value="pma-bonuses" 
                data-testid="pma-bonuses-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                📄 PMA Bonuses
              </TabsTrigger>
              <TabsTrigger 
                value="leaderboard" 
                data-testid="leaderboard-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                Leaderboard
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                data-testid="analytics-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                📊 Analytics
              </TabsTrigger>
              {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
                <>
                  <TabsTrigger 
                    value="reports" 
                    data-testid="reports-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                  >
                    📊 Reports
                  </TabsTrigger>
                  <TabsTrigger 
                    value="manage" 
                    data-testid="manage-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                  >
                    Team Mgmt
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="activity" data-testid="activity-content" className="mt-4 md:mt-6">
            <ActivityInput user={user} />
          </TabsContent>

          <TabsContent value="stats" data-testid="stats-content" className="mt-4 md:mt-6">
            <StatsView user={user} />
          </TabsContent>

          <TabsContent value="analytics" data-testid="analytics-content" className="mt-4 md:mt-6">
            <Analytics user={user} />
          </TabsContent>

          <TabsContent value="pma-bonuses" data-testid="pma-bonuses-content" className="mt-4 md:mt-6">
            <PMABonuses user={user} />
          </TabsContent>

          <TabsContent value="team" data-testid="team-content" className="mt-4 md:mt-6">
            <TeamView user={user} />
          </TabsContent>

          <TabsContent value="manage" data-testid="manage-content" className="mt-4 md:mt-6">
            <TeamManagement user={user} />
          </TabsContent>

          <TabsContent value="leaderboard" data-testid="leaderboard-content" className="mt-4 md:mt-6">
            <Leaderboard user={user} />
          </TabsContent>

          {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
            <TabsContent value="reports" data-testid="reports-content" className="mt-4 md:mt-6">
              <Reports user={user} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;