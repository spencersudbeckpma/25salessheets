import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import DailyReport from './DailyReport';
import NewFaceTracking from './NewFaceTracking';
import { FileText, Users } from 'lucide-react';

const Reports = ({ user }) => {
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
          <TabsList className="inline-flex bg-gray-100 p-1 gap-1">
            <TabsTrigger value="reports" className="py-2 px-4 text-sm whitespace-nowrap flex items-center gap-2">
              <FileText size={16} />
              Reports
            </TabsTrigger>
            <TabsTrigger value="new-faces" className="py-2 px-4 text-sm whitespace-nowrap flex items-center gap-2">
              <Users size={16} />
              New Faces
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-4">
            <DailyReport user={user} embedded={true} />
          </TabsContent>

          <TabsContent value="new-faces" className="mt-4">
            <NewFaceTracking user={user} embedded={true} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Reports;
