import React, { useState, useEffect } from 'react';
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
import FactFinder from './FactFinder';
import AdminPanel from './AdminPanel';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

const Dashboard = ({ user, setUser, branding: initialBranding, features: initialFeatures }) => {
  const [activeTab, setActiveTab] = useState('activity');
  const { branding, features, updateBranding, getDisplayName, getTagline, logoUrl, hasFeature } = useBranding();

  // Apply branding and features on mount
  useEffect(() => {
    if (initialBranding?.branding || initialFeatures) {
      updateBranding(
        initialBranding?.branding || null, 
        initialBranding?.team_name || null,
        initialFeatures || null
      );
    }
  }, [initialBranding, initialFeatures]);

  // Determine which tab to show based on features
  const getValidTab = (requestedTab) => {
    const tabFeatureMap = {
      'activity': 'activity',
      'stats': 'stats',
      'team': 'team_view',
      'suitability': 'suitability',
      'pma-bonuses': 'pma_bonuses',
      'docusphere': 'docusphere',
      'leaderboard': 'leaderboard',
      'analytics': 'analytics',
      'reports': 'reports',
      'manage': 'team_mgmt',
      'recruiting': 'recruiting',
      'admin': null // admin is always available for super_admin
    };
    
    const requestedFeature = tabFeatureMap[requestedTab];
    if (requestedFeature === null || hasFeature(requestedFeature)) {
      return requestedTab;
    }
    
    // Find first enabled tab
    for (const [tab, feature] of Object.entries(tabFeatureMap)) {
      if (feature === null || hasFeature(feature)) {
        return tab;
      }
    }
    return 'activity';
  };

  const handleTabChange = (newTab) => {
    const validTab = getValidTab(newTab);
    setActiveTab(validTab);
  };

  // Update document title with branding
  useEffect(() => {
    document.title = getDisplayName();
  }, [branding, getDisplayName]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 max-w-7xl">
        {/* Header with branding */}
        <div 
          className="rounded-xl shadow-xl p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row justify-between md:items-center gap-3"
          style={{ 
            background: `linear-gradient(to right, ${branding?.primary_color || '#1e293b'}, ${branding?.accent_color || '#334155'})`
          }}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Team Logo or Default */}
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Team Logo" 
                className="h-12 md:h-14 w-auto object-contain flex-shrink-0 rounded-lg bg-white p-1"
              />
            ) : (
              <div 
                className="h-12 md:h-14 w-12 md:w-14 flex-shrink-0 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm"
              >
                <span className="text-lg md:text-xl font-bold text-white">
                  {(getDisplayName() || 'PMA').substring(0, 3).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-white truncate" data-testid="dashboard-title">
                {getDisplayName()}
              </h1>
              {getTagline() && (
                <p className="text-xs text-white/70 truncate">{getTagline()}</p>
              )}
              <p className="text-xs md:text-sm text-amber-300 mt-1 truncate" data-testid="user-info">
                {user.name} • {user.role.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2 w-full md:w-auto justify-center border-white/30 text-white hover:bg-white/20"
            size="sm"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex w-full gap-1 md:gap-2 bg-white rounded-xl shadow-md border border-slate-200 p-1.5 md:p-2 h-auto min-w-max md:min-w-0 flex-wrap" data-testid="dashboard-tabs">
              {hasFeature('activity') && (
                <TabsTrigger 
                  value="activity" 
                  data-testid="activity-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'activity' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  Daily Activity
                </TabsTrigger>
              )}
              {hasFeature('stats') && (
                <TabsTrigger 
                  value="stats" 
                  data-testid="stats-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'stats' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  My Stats
                </TabsTrigger>
              )}
              {hasFeature('team_view') && (
                <TabsTrigger 
                  value="team" 
                  data-testid="team-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'team' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  Team View
                </TabsTrigger>
              )}
              {hasFeature('suitability') && (
                <TabsTrigger 
                  value="suitability" 
                  data-testid="suitability-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'suitability' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  📋 Suitability
                </TabsTrigger>
              )}
              {hasFeature('pma_bonuses') && (
                <TabsTrigger 
                  value="pma-bonuses" 
                  data-testid="pma-bonuses-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'pma-bonuses' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  📄 PMA Bonuses
                </TabsTrigger>
              )}
              {hasFeature('docusphere') && (
                <TabsTrigger 
                  value="docusphere" 
                  data-testid="docusphere-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'docusphere' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  📁 DocuSphere
                </TabsTrigger>
              )}
              {hasFeature('leaderboard') && (
                <TabsTrigger 
                  value="leaderboard" 
                  data-testid="leaderboard-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'leaderboard' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  Leaderboard
                </TabsTrigger>
              )}
              {hasFeature('analytics') && (
                <TabsTrigger 
                  value="analytics" 
                  data-testid="analytics-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'analytics' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  📊 Analytics
                </TabsTrigger>
              )}
              {hasFeature('reports') && ['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
                <TabsTrigger 
                  value="reports" 
                  data-testid="reports-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'reports' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  📊 Reports
                </TabsTrigger>
              )}
              {hasFeature('team_mgmt') && ['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
                <TabsTrigger 
                  value="manage" 
                  data-testid="manage-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'manage' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  Team Mgmt
                </TabsTrigger>
              )}
              {/* Recruiting visible based on feature flag AND role */}
              {hasFeature('recruiting') && (user.role === 'super_admin' || user.role === 'state_manager') && (
                <TabsTrigger 
                  value="recruiting" 
                  data-testid="recruiting-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'recruiting' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  👥 Recruiting
                </TabsTrigger>
              )}
              {hasFeature('recruiting') && (user.role === 'regional_manager' || user.role === 'district_manager') && (
                <TabsTrigger 
                  value="recruiting" 
                  data-testid="recruiting-tab" 
                  className="py-2.5 px-3 text-xs md:text-sm whitespace-nowrap flex-shrink-0 rounded-lg text-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  style={activeTab === 'recruiting' ? { backgroundColor: branding?.primary_color || '#1e40af' } : {}}
                >
                  👥 My Recruiting
                </TabsTrigger>
              )}
              {/* Admin Panel - super_admin ONLY */}
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

          {/* Reports - visible to all managers including super_admin */}
          {['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
            <TabsContent value="reports" data-testid="reports-content" className="mt-4 md:mt-6">
              <Reports user={user} />
            </TabsContent>
          )}

          {/* Recruiting - visible to all managers including super_admin */}
          {['super_admin', 'state_manager', 'regional_manager', 'district_manager'].includes(user.role) && (
            <TabsContent value="recruiting" data-testid="recruiting-content" className="mt-4 md:mt-6">
              <Recruiting user={user} />
            </TabsContent>
          )}

          {/* Admin Panel - super_admin ONLY for cross-team management */}
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