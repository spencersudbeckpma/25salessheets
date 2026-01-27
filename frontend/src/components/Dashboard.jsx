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
import PMADocuSphere from './PMADocuSphere';
import Recruiting from './Recruiting';
import SuitabilityForm from './SuitabilityForm';
import AdminPanel from './AdminPanel';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {
  const [activeTab, setActiveTab] = useState('activity');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl shadow-xl p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <img 
              src="/team-sudbeck-logo.jpg" 
              alt="Team Sudbeck Logo" 
              className="h-12 md:h-14 w-auto object-contain flex-shrink-0 rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-white truncate" data-testid="dashboard-title">
                Team Sudbeck Sales Tracker
              </h1>
              <p className="text-xs md:text-sm text-amber-400 mt-1 truncate" data-testid="user-info">
                {user.name} • {user.role.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2 w-full md:w-auto justify-center border-amber-500 text-amber-400 hover:bg-amber-500/20"
            size="sm"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className={`inline-flex w-full md:grid md:w-full ${['state_manager', 'regional_manager', 'district_manager'].includes(user.role) ? 'md:grid-cols-10' : 'md:grid-cols-8'} gap-1 md:gap-2 bg-white rounded-xl shadow-md border border-slate-200 p-1.5 md:p-2 h-auto min-w-max md:min-w-0`} data-testid="dashboard-tabs">
              <TabsTrigger 
                value="activity" 
                data-testid="activity-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                Daily Activity
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                data-testid="stats-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                My Stats
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                data-testid="team-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                Team View
              </TabsTrigger>
              <TabsTrigger 
                value="suitability" 
                data-testid="suitability-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                📋 Suitability
              </TabsTrigger>
              <TabsTrigger 
                value="pma-bonuses" 
                data-testid="pma-bonuses-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                📄 PMA Bonuses
              </TabsTrigger>
              <TabsTrigger 
                value="docusphere" 
                data-testid="docusphere-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                📁 DocuSphere
              </TabsTrigger>
              <TabsTrigger 
                value="leaderboard" 
                data-testid="leaderboard-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                Leaderboard
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                data-testid="analytics-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
              >
                📊 Analytics
              </TabsTrigger>
              {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
                <>
                  <TabsTrigger 
                    value="reports" 
                    data-testid="reports-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
                  >
                    📊 Reports
                  </TabsTrigger>
                  <TabsTrigger 
                    value="manage" 
                    data-testid="manage-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
                  >
                    Team Mgmt
                  </TabsTrigger>
                </>
              )}
              {/* super_admin also gets Reports and Team Mgmt */}
              {user.role === 'super_admin' && (
                <>
                  <TabsTrigger 
                    value="reports" 
                    data-testid="reports-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
                  >
                    📊 Reports
                  </TabsTrigger>
                  <TabsTrigger 
                    value="manage" 
                    data-testid="manage-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
                  >
                    Team Mgmt
                  </TabsTrigger>
                </>
              )}
              {/* Recruiting visible to super_admin and state_manager */}
              {(user.role === 'super_admin' || user.role === 'state_manager') && (
                <TabsTrigger 
                  value="recruiting" 
                  data-testid="recruiting-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
                >
                  👥 Recruiting
                </TabsTrigger>
              )}
              {(user.role === 'regional_manager' || user.role === 'district_manager') && (
                <TabsTrigger 
                  value="recruiting" 
                  data-testid="recruiting-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 data-[state=active]:shadow-md"
                >
                  👥 My Recruiting
                </TabsTrigger>
              )}
              {/* Admin Panel - super_admin ONLY for team creation/assignment */}
              {user.role === 'super_admin' && (
                <TabsTrigger 
                  value="admin" 
                  data-testid="admin-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:bg-purple-700 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  🛡️ Admin
                </TabsTrigger>
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

          <TabsContent value="docusphere" data-testid="docusphere-content" className="mt-4 md:mt-6">
            <PMADocuSphere user={user} />
          </TabsContent>

          <TabsContent value="team" data-testid="team-content" className="mt-4 md:mt-6">
            <TeamView user={user} />
          </TabsContent>

          <TabsContent value="suitability" data-testid="suitability-content" className="mt-4 md:mt-6">
            <SuitabilityForm user={user} />
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

          {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
            <TabsContent value="recruiting" data-testid="recruiting-content" className="mt-4 md:mt-6">
              <Recruiting user={user} />
            </TabsContent>
          )}

          {user.role === 'super_admin' && (
            <TabsContent value="admin" data-testid="admin-content" className="mt-4 md:mt-6">
              <AdminPanel user={user} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;