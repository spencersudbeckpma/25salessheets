import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { FileDown, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = ({ user }) => {
  const [loading, setLoading] = useState(false);

  const downloadReport = async (period) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/excel/${period}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${period.charAt(0).toUpperCase() + period.slice(1)} report downloaded!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadNewFaceReport = async (period) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/excel/newface/${period}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `new_face_report_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`New Face ${period.charAt(0).toUpperCase() + period.slice(1)} report downloaded!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      period: 'weekly',
      title: 'Weekly Report',
      description: 'Current week (Mon-Sun)',
      icon: '📅',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      period: 'monthly',
      title: 'Monthly Report',
      description: 'Current month',
      icon: '📆',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      period: 'quarterly',
      title: 'Quarterly Report',
      description: 'Current quarter (Q1-Q4)',
      icon: '📊',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      period: 'yearly',
      title: 'Yearly Report',
      description: 'Current year',
      icon: '📈',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <FileDown className="text-blue-600" />
          Excel Reports
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Download Excel spreadsheets with team activity data. Each report shows one row per team member with their totals.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report) => (
            <div
              key={report.period}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-3xl mb-2">{report.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-800">{report.title}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Includes:</span>
                  <span>All 8 activity categories</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Format:</span>
                  <span>One row per team member</span>
                </div>
              </div>

              <Button
                onClick={() => downloadReport(report.period)}
                disabled={loading}
                className={`w-full ${report.color} text-white`}
              >
                <FileDown size={18} className="mr-2" />
                Download {report.title}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📋 Report Details</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Reports include your entire team hierarchy</li>
            <li>• Each row shows: Name, Email, Role, and all 8 activity totals</li>
            <li>• Data is calculated based on your Central Time zone</li>
            <li>• Files are formatted and ready to open in Excel, Google Sheets, or Numbers</li>
            <li>• Weekly = Monday through Sunday of current week</li>
            <li>• Monthly = 1st through last day of current month</li>
            <li>• Quarterly = Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)</li>
            <li>• Yearly = January 1st through December 31st of current year</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default Reports;
