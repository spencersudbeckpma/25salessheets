import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import ActivityInput from './ActivityInput';
import StatsView from './StatsView';
import TeamView from './TeamView';
import TeamManagement from './TeamManagement';
import Leaderboard from './Leaderboard';
import AdminCleanup from './AdminCleanup';
import Reports from './Reports';
import NewFaceTracking from './NewFaceTracking';
import DailyReport from './DailyReport';
import ChangePassword from './ChangePassword';
import PasswordManagement from './PasswordManagement';
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
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 truncate" data-testid="dashboard-title">
              CRM Sales Tracker
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1 truncate" data-testid="user-info">
              {user.name} | {user.role.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2 w-full md:w-auto justify-center"
            size="sm"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className={`inline-flex w-full md:grid md:w-full ${user.role === 'state_manager' ? 'md:grid-cols-11' : ['regional_manager', 'district_manager'].includes(user.role) ? 'md:grid-cols-8' : 'md:grid-cols-7'} gap-1 md:gap-2 bg-white rounded-lg shadow-md p-1.5 md:p-2 h-auto min-w-max md:min-w-0`} data-testid="dashboard-tabs">
              <TabsTrigger 
                value="activity" 
                data-testid="activity-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                Daily Activity
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                data-testid="stats-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
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
                value="manage" 
                data-testid="manage-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                Team Mgmt
              </TabsTrigger>
              <TabsTrigger 
                value="change-password" 
                data-testid="change-password-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                🔐 Password
              </TabsTrigger>
              <TabsTrigger 
                value="leaderboard" 
                data-testid="leaderboard-tab" 
                className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                Leaderboard
              </TabsTrigger>
              {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
                <>
                  <TabsTrigger 
                    value="newface" 
                    data-testid="newface-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                  >
                    🎯 New Faces
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reports" 
                    data-testid="reports-tab" 
                    className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                  >
                    📊 Reports
                  </TabsTrigger>
                </>
              )}
              {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
                <TabsTrigger 
                  value="daily-report" 
                  data-testid="daily-report-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  📊 Manager Reports
                </TabsTrigger>
              )}
              {user.role === 'state_manager' && (
                <TabsTrigger 
                  value="admin" 
                  data-testid="admin-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 bg-red-50"
                >
                  🛠️ Admin
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

          <TabsContent value="team" data-testid="team-content" className="mt-4 md:mt-6">
            <TeamView user={user} />
          </TabsContent>

          <TabsContent value="manage" data-testid="manage-content" className="mt-4 md:mt-6">
            <TeamManagement user={user} />
          </TabsContent>

          <TabsContent value="change-password" data-testid="change-password-content" className="mt-4 md:mt-6">
            <ChangePassword user={user} />
          </TabsContent>

          <TabsContent value="leaderboard" data-testid="leaderboard-content" className="mt-4 md:mt-6">
            <Leaderboard user={user} />
          </TabsContent>

          {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
            <TabsContent value="newface" data-testid="newface-content" className="mt-4 md:mt-6">
              <NewFaceTracking user={user} />
            </TabsContent>
          )}

          {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
            <TabsContent value="reports" data-testid="reports-content" className="mt-4 md:mt-6">
              <Reports user={user} />
            </TabsContent>
          )}

          {user.role === 'state_manager' && (
            <TabsContent value="admin" data-testid="admin-content" className="mt-4 md:mt-6">
              <AdminCleanup user={user} />
            </TabsContent>
          )}

          {['state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
            <TabsContent value="daily-report" data-testid="daily-report-content" className="mt-4 md:mt-6">
              <DailyReport user={user} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;