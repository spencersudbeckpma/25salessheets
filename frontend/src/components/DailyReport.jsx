import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { FileDown, Calendar, Users, Building, TrendingUp, Clock, BarChart3, LineChart } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailyReport = ({ user }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [activeTab, setActiveTab] = useState('individual');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDailyReport = async (reportType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/daily/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: selectedDate }
      });
      setReportData(response.data);
      toast.success('Daily report loaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load daily report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodReport = async (reportType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/period/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: selectedPeriod }
      });
      setReportData(response.data);
      toast.success(`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} report loaded successfully!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to load ${selectedPeriod} report`);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadDailyExcel = async (reportType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/daily/excel/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: selectedDate },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_${reportType}_report_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Daily ${reportType} report downloaded!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to download daily report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPeriodExcel = async (reportType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/period/excel/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: selectedPeriod },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedPeriod}_${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} ${reportType} report downloaded!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to download ${selectedPeriod} report`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setReportData(null);
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setReportData(null);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setReportData(null);
  };

  const viewReport = () => {
    if (selectedPeriod === 'daily') {
      fetchDailyReport(activeTab);
    } else {
      fetchPeriodReport(activeTab);
    }
  };

  const downloadExcel = () => {
    if (selectedPeriod === 'daily') {
      downloadDailyExcel(activeTab);
    } else {
      downloadPeriodExcel(activeTab);
    }
  };

  const renderIndividualReport = () => {
    if (!reportData || reportData.report_type !== 'individual') return null;

    return (
      <div className="mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Contacts</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Appointments</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Presentations</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Referrals</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Testimonials</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Sales</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">New Face</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody>
              {reportData.data.map((person, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{person.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.role}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.contacts}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.appointments}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.presentations}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.referrals}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.testimonials}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.sales}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.new_face_sold}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                    ${typeof person.premium === 'number' ? person.premium.toFixed(2) : person.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reportData.data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No activity recorded for this period
          </div>
        )}
      </div>
    );
  };

  const renderTeamReport = () => {
    if (!reportData || reportData.report_type !== 'team') return null;

    return (
      <div className="mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Team Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Manager</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Contacts</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Appointments</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Presentations</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Referrals</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Testimonials</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Sales</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">New Face</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody>
              {reportData.data.map((team, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.team_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{team.manager}</td>
                  <td className="px-4 py-3 text-sm text-center">{team.contacts}</td>
                  <td className="px-4 py-3 text-sm text-center">{team.appointments}</td>
                  <td className="px-4 py-3 text-sm text-center">{team.presentations}</td>
                  <td className="px-4 py-3 text-sm text-center">{team.referrals}</td>
                  <td className="px-4 py-3 text-sm text-center">{team.testimonials}</td>
                  <td className="px-4 py-3 text-sm text-center">{team.sales}</td>
                  <td className="px-4 py-3 text-sm text-center">{team.new_face_sold}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                    ${typeof team.premium === 'number' ? team.premium.toFixed(2) : team.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reportData.data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No teams found or no activity for this date
          </div>
        )}
      </div>
    );
  };

  const renderOrganizationReport = () => {
    if (!reportData || reportData.report_type !== 'organization') return null;

    const data = reportData.data;

    return (
      <div className="mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Total Members</div>
            <div className="text-2xl font-bold text-blue-700">{reportData.total_members}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Contacts</div>
            <div className="text-2xl font-bold text-green-700">{data.contacts}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Appointments</div>
            <div className="text-2xl font-bold text-purple-700">{data.appointments}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
            <div className="text-sm text-gray-600">Presentations</div>
            <div className="text-2xl font-bold text-orange-700">{data.presentations}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-pink-50 p-4 rounded-lg border-l-4 border-pink-500">
            <div className="text-sm text-gray-600">Referrals</div>
            <div className="text-2xl font-bold text-pink-700">{data.referrals}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
            <div className="text-sm text-gray-600">Testimonials</div>
            <div className="text-2xl font-bold text-indigo-700">{data.testimonials}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
            <div className="text-sm text-gray-600">Sales</div>
            <div className="text-2xl font-bold text-red-700">{data.sales}</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg border-l-4 border-teal-500">
            <div className="text-sm text-gray-600">New Face Sold</div>
            <div className="text-2xl font-bold text-teal-700">{data.new_face_sold}</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg border-l-4 border-emerald-500">
            <div className="text-sm text-gray-600">Total Premium</div>
            <div className="text-2xl font-bold text-emerald-700">
              ${typeof data.premium === 'number' ? data.premium.toFixed(2) : data.premium}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'individual', label: 'Individual', icon: Users, color: 'blue' },
    { id: 'team', label: 'Team', icon: Building, color: 'green' },
    { id: 'organization', label: 'Organization', icon: TrendingUp, color: 'purple' }
  ];

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Calendar className="text-blue-600" />
          Daily Reports
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          View and download daily activity reports for your team hierarchy (individuals, teams, organization)
        </p>
      </CardHeader>
      <CardContent>
        {/* Date Picker */}
        <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-100 rounded-lg border border-slate-300">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            max={new Date().toISOString().split('T')[0]}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-500 text-white shadow-md`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={() => fetchReport(activeTab)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Calendar size={18} className="mr-2" />
            View Report
          </Button>
          <Button
            onClick={() => downloadExcel(activeTab)}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileDown size={18} className="mr-2" />
            Download Excel
          </Button>
        </div>

        {/* Report Display */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading report...</p>
          </div>
        )}

        {!loading && reportData && (
          <div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900">
                📊 {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report for{' '}
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
            </div>
            
            {activeTab === 'individual' && renderIndividualReport()}
            {activeTab === 'team' && renderTeamReport()}
            {activeTab === 'organization' && renderOrganizationReport()}
          </div>
        )}

        {!loading && !reportData && (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Select a date and click "View Report" to see daily activity data</p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📋 Report Types</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Individual:</strong> Shows each team member's daily activity</li>
            <li>• <strong>Team:</strong> Shows aggregated totals for each direct report's team</li>
            <li>• <strong>Organization:</strong> Shows organization-wide totals for the selected date</li>
            <li>• All reports include 8 activity categories plus total premium</li>
            <li>• Excel downloads are formatted and ready to use</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyReport;
