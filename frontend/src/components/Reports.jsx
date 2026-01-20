import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import DailyReport from './DailyReport';
import NewFaceTracking from './NewFaceTracking';
import SNATracker from './SNATracker';
import NPATracker from './NPATracker';
import { FileText, Users, Target, Award } from 'lucide-react';

const Reports = ({ user }) => {
  const canAccessSNA = ['state_manager', 'regional_manager'].includes(user.role);

  return (
    <Card className="shadow-lg bg-white" data-testid="reports-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="reports-title">
          <FileText className="text-blue-600" size={24} />
          Reports & Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs defaultValue="reports" className="space-y-4">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex bg-gray-100 p-1 rounded-lg min-w-max">
              <TabsTrigger 
                value="reports" 
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md flex items-center gap-1.5 sm:gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-blue-700"
              >
                <FileText size={14} className="sm:w-4 sm:h-4" />
                <span>Reports</span>
              </TabsTrigger>
              <TabsTrigger 
                value="new-faces" 
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md flex items-center gap-1.5 sm:gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-blue-700"
              >
                <Users size={14} className="sm:w-4 sm:h-4" />
                <span>New Faces</span>
              </TabsTrigger>
              {canAccessSNA && (
                <TabsTrigger 
                  value="sna-tracker" 
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md flex items-center gap-1.5 sm:gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-green-700"
                >
                  <Target size={14} className="sm:w-4 sm:h-4" />
                  <span>SNA</span>
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="npa-tracker" 
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md flex items-center gap-1.5 sm:gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-amber-700"
              >
                <Award size={14} className="sm:w-4 sm:h-4" />
                <span>NPA</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="reports" className="mt-4">
            <DailyReport user={user} embedded={true} />
          </TabsContent>

          <TabsContent value="new-faces" className="mt-4">
            <NewFaceTracking user={user} embedded={true} />
          </TabsContent>

          {canAccessSNA && (
            <TabsContent value="sna-tracker" className="mt-4">
              <SNATracker user={user} />
            </TabsContent>
          )}

          <TabsContent value="npa-tracker" className="mt-4">
            <NPATracker user={user} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Reports;
