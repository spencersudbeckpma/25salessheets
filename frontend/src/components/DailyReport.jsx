import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { FileDown, Calendar, Users, Building, TrendingUp, Clock, BarChart3, LineChart } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailyReport = ({ user, embedded = false }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date();
    const quarter = Math.floor((now.getMonth() / 3)) + 1;
    return `${now.getFullYear()}-Q${quarter}`;
  }); // YYYY-Q1 format
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Date range for weekly reports
  const getDefaultWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };
  const getDefaultWeekEnd = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? 0 : 7); // Sunday
    const sunday = new Date(now.setDate(diff));
    return sunday.toISOString().split('T')[0];
  };
  const [weekStartDate, setWeekStartDate] = useState(getDefaultWeekStart());
  const [weekEndDate, setWeekEndDate] = useState(getDefaultWeekEnd());
  
  const [activeTab, setActiveTab] = useState('individual');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [availableManagers, setAvailableManagers] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch available managers when component loads
  useEffect(() => {
    fetchAvailableManagers();
  }, []);

  const fetchAvailableManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableManagers(response.data.managers);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const fetchManagerHierarchy = async (managerId, managerName) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = { period: selectedPeriod };
      
      // Add period-specific parameters
      if (selectedPeriod === 'monthly') {
        params.month = selectedMonth;
      } else if (selectedPeriod === 'quarterly') {
        params.quarter = selectedQuarter;
      } else if (selectedPeriod === 'yearly') {
        params.year = selectedYear;
      } else if (selectedPeriod === 'weekly') {
        params.week_start = weekStartDate;
        params.week_end = weekEndDate;
      } else if (selectedPeriod === 'daily') {
        params.date = selectedDate;
      }
      
      const response = await axios.get(`${API}/reports/manager-hierarchy/${managerId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params
      });
      setHierarchyData(response.data);
      setReportData(null); // Clear regular report when showing hierarchy
      toast.success(`${managerName}'s team hierarchy loaded!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load team hierarchy');
      setHierarchyData(null);
    } finally {
      setLoading(false);
    }
  };

  const clearHierarchyView = () => {
    setHierarchyData(null);
  };

  const fetchDailyReport = async (reportType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = { date: selectedDate };
      if ((reportType === 'individual' || reportType === 'team') && selectedManagerId) {
        params.user_id = selectedManagerId;
      }
      
      const response = await axios.get(`${API}/reports/daily/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params
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
      const params = { period: selectedPeriod };
      
      if ((reportType === 'individual' || reportType === 'team') && selectedManagerId) {
        params.user_id = selectedManagerId;
      }
      
      if (selectedPeriod === 'monthly') {
        params.month = selectedMonth;
      } else if (selectedPeriod === 'quarterly') {
        params.quarter = selectedQuarter;
      } else if (selectedPeriod === 'yearly') {
        params.year = selectedYear;
      } else if (selectedPeriod === 'weekly') {
        params.week_start = weekStartDate;
        params.week_end = weekEndDate;
      }
      
      const response = await axios.get(`${API}/reports/period/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params
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
      const params = { date: selectedDate };
      if ((reportType === 'individual' || reportType === 'team') && selectedManagerId) {
        params.user_id = selectedManagerId;
      }
      
      const response = await axios.get(`${API}/reports/daily/excel/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
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
      const params = { period: selectedPeriod };
      
      if ((reportType === 'individual' || reportType === 'team') && selectedManagerId) {
        params.user_id = selectedManagerId;
      }
      
      if (selectedPeriod === 'monthly') {
        params.month = selectedMonth;
      } else if (selectedPeriod === 'quarterly') {
        params.quarter = selectedQuarter;
      } else if (selectedPeriod === 'yearly') {
        params.year = selectedYear;
      }
      
      const response = await axios.get(`${API}/reports/period/excel/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
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
    setSelectedManagerId(''); // Reset manager selection when changing tabs
    setReportData(null);
    setHierarchyData(null); // Clear hierarchy view
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setReportData(null);
    setHierarchyData(null); // Clear hierarchy view when period changes
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setReportData(null);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setReportData(null);
  };

  const handleQuarterChange = (e) => {
    setSelectedQuarter(e.target.value);
    setReportData(null);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
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

    // Calculate totals - CRITICAL: bankers_premium is SEPARATE from premium
    const totals = reportData.data.reduce((acc, person) => ({
      contacts: acc.contacts + (parseFloat(person.contacts) || 0),
      appointments: acc.appointments + (parseFloat(person.appointments) || 0),
      presentations: acc.presentations + (parseFloat(person.presentations) || 0),
      referrals: acc.referrals + (parseFloat(person.referrals) || 0),
      testimonials: acc.testimonials + (parseFloat(person.testimonials) || 0),
      sales: acc.sales + (parseFloat(person.sales) || 0),
      new_face_sold: acc.new_face_sold + (parseFloat(person.new_face_sold) || 0),
      fact_finders: acc.fact_finders + (parseFloat(person.fact_finders) || 0),
      bankers_premium: acc.bankers_premium + (parseFloat(person.bankers_premium) || 0),
      premium: acc.premium + (parseFloat(person.premium) || 0)
    }), { contacts: 0, appointments: 0, presentations: 0, referrals: 0, testimonials: 0, sales: 0, new_face_sold: 0, fact_finders: 0, bankers_premium: 0, premium: 0 });

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
                <th className="px-4 py-3 text-center text-sm font-semibold">Fact Finders</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Bankers Premium</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Premium</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportData.data.map((person, idx) => {
                // Find the manager in available managers to get their ID
                const managerData = availableManagers.find(m => m.name === person.name);
                const isClickable = managerData && ['State Manager', 'Regional Manager', 'District Manager'].includes(person.role);
                
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {isClickable ? (
                        <button
                          onClick={() => fetchManagerHierarchy(managerData.id, person.name)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                          title={`Click to view ${person.name}'s team hierarchy`}
                        >
                          {person.name} 👥
                        </button>
                      ) : (
                        person.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{person.role}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.contacts}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.appointments}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.presentations}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.referrals}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.testimonials}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.sales}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.new_face_sold}</td>
                    <td className="px-4 py-3 text-sm text-center">{person.fact_finders || 0}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-amber-600">
                      ${typeof person.bankers_premium === 'number' ? person.bankers_premium.toFixed(2) : (person.bankers_premium || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                      ${typeof person.premium === 'number' ? person.premium.toFixed(2) : person.premium}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {isClickable && (
                        <span className="text-xs text-gray-500">Click name for team</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Row */}
            {reportData.data.length > 0 && (
              <tfoot className="bg-gradient-to-r from-amber-100 to-yellow-100 border-t-2 border-amber-400">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-amber-900">TOTALS</td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-900">{reportData.data.length} members</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.contacts}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.appointments}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.presentations}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.referrals}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.testimonials}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.sales}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.new_face_sold}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.fact_finders}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-700">${totals.bankers_premium.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-green-700">${totals.premium.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {reportData.data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No activity recorded for this period
          </div>
        )}
        <div className="mt-4 text-xs text-gray-500">
          💡 <strong>Tip:</strong> Click on a manager&apos;s name (👥) to view their entire team hierarchy with totals
        </div>
      </div>
    );
  };

  const renderHierarchyView = () => {
    if (!hierarchyData) return null;

    // Calculate totals for hierarchy data - CRITICAL: bankers_premium is SEPARATE from premium
    const totals = hierarchyData.hierarchy_data.reduce((acc, person) => ({
      contacts: acc.contacts + (parseFloat(person.contacts) || 0),
      appointments: acc.appointments + (parseFloat(person.appointments) || 0),
      presentations: acc.presentations + (parseFloat(person.presentations) || 0),
      referrals: acc.referrals + (parseFloat(person.referrals) || 0),
      testimonials: acc.testimonials + (parseFloat(person.testimonials) || 0),
      sales: acc.sales + (parseFloat(person.sales) || 0),
      new_face_sold: acc.new_face_sold + (parseFloat(person.new_face_sold) || 0),
      fact_finders: acc.fact_finders + (parseFloat(person.fact_finders) || 0),
      bankers_premium: acc.bankers_premium + (parseFloat(person.bankers_premium) || 0),
      premium: acc.premium + (parseFloat(person.premium) || 0)
    }), { contacts: 0, appointments: 0, presentations: 0, referrals: 0, testimonials: 0, sales: 0, new_face_sold: 0, fact_finders: 0, bankers_premium: 0, premium: 0 });

    return (
      <div className="mt-6">
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-purple-900">
                👥 {hierarchyData.manager_name}&apos;s Team Hierarchy - {hierarchyData.period_name}
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                {hierarchyData.manager_role} • {hierarchyData.total_members} team member{hierarchyData.total_members !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              onClick={clearHierarchyView}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              ← Back to Report
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Relationship</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Contacts</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Appointments</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Presentations</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Referrals</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Testimonials</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Sales</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">New Face</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Fact Finders</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Bankers Premium</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody>
              {hierarchyData.hierarchy_data.map((person, idx) => (
                <tr 
                  key={idx} 
                  className={`
                    ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    ${person.relationship === 'Manager' ? 'border-l-4 border-purple-500 bg-purple-50' : ''}
                    ${person.relationship === 'Direct Report' ? 'border-l-4 border-green-500' : ''}
                    ${person.relationship === 'Indirect Report' ? 'border-l-4 border-blue-500' : ''}
                  `}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {person.relationship === 'Manager' && '👑 '}
                    {person.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{person.role}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      person.relationship === 'Manager' ? 'bg-purple-100 text-purple-800' :
                      person.relationship === 'Direct Report' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {person.relationship}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{person.contacts}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.appointments}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.presentations}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.referrals}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.testimonials}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.sales}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.new_face_sold}</td>
                  <td className="px-4 py-3 text-sm text-center">{person.fact_finders || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-amber-600">
                    ${typeof person.bankers_premium === 'number' ? person.bankers_premium.toFixed(2) : (person.bankers_premium || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                    ${typeof person.premium === 'number' ? person.premium.toFixed(2) : person.premium}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            {hierarchyData.hierarchy_data.length > 0 && (
              <tfoot className="bg-gradient-to-r from-amber-100 to-yellow-100 border-t-2 border-amber-400">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-amber-900">TOTALS</td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-900">{hierarchyData.hierarchy_data.length} members</td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-900"></td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.contacts}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.appointments}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.presentations}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.referrals}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.testimonials}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.sales}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.new_face_sold}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.fact_finders}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-700">${totals.bankers_premium.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-green-700">${totals.premium.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          💡 <strong>Legend:</strong> 👑 Manager • 
          <span className="text-purple-600">■</span> Manager • 
          <span className="text-green-600">■</span> Direct Report • 
          <span className="text-blue-600">■</span> Indirect Report
        </div>
      </div>
    );
  };

  const renderTeamReport = () => {
    if (!reportData || reportData.report_type !== 'team') return null;

    // Calculate totals for team report - CRITICAL: bankers_premium is SEPARATE from premium
    const totals = reportData.data.reduce((acc, team) => ({
      contacts: acc.contacts + (parseFloat(team.contacts) || 0),
      appointments: acc.appointments + (parseFloat(team.appointments) || 0),
      presentations: acc.presentations + (parseFloat(team.presentations) || 0),
      referrals: acc.referrals + (parseFloat(team.referrals) || 0),
      testimonials: acc.testimonials + (parseFloat(team.testimonials) || 0),
      sales: acc.sales + (parseFloat(team.sales) || 0),
      new_face_sold: acc.new_face_sold + (parseFloat(team.new_face_sold) || 0),
      fact_finders: acc.fact_finders + (parseFloat(team.fact_finders) || 0),
      bankers_premium: acc.bankers_premium + (parseFloat(team.bankers_premium) || 0),
      premium: acc.premium + (parseFloat(team.premium) || 0)
    }), { contacts: 0, appointments: 0, presentations: 0, referrals: 0, testimonials: 0, sales: 0, new_face_sold: 0, fact_finders: 0, bankers_premium: 0, premium: 0 });

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
                <th className="px-4 py-3 text-center text-sm font-semibold">Fact Finders</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Bankers Premium</th>
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
                  <td className="px-4 py-3 text-sm text-center">{team.fact_finders || 0}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-amber-600">
                    ${typeof team.bankers_premium === 'number' ? team.bankers_premium.toFixed(2) : (team.bankers_premium || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                    ${typeof team.premium === 'number' ? team.premium.toFixed(2) : team.premium}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            {reportData.data.length > 0 && (
              <tfoot className="bg-gradient-to-r from-amber-100 to-yellow-100 border-t-2 border-amber-400">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-amber-900">TOTALS</td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-900">{reportData.data.length} teams</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.contacts}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.appointments}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.presentations}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.referrals}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.testimonials}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.sales}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.new_face_sold}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-900">{totals.fact_finders}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-700">${totals.bankers_premium.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-green-700">${totals.premium.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {reportData.data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No teams found or no activity for this period
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
            <div className="text-2xl font-bold text-green-700">{data.contacts || 0}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Appointments</div>
            <div className="text-2xl font-bold text-purple-700">{data.appointments || 0}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
            <div className="text-sm text-gray-600">Presentations</div>
            <div className="text-2xl font-bold text-orange-700">{data.presentations || 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-pink-50 p-4 rounded-lg border-l-4 border-pink-500">
            <div className="text-sm text-gray-600">Referrals</div>
            <div className="text-2xl font-bold text-pink-700">{data.referrals || 0}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
            <div className="text-sm text-gray-600">Testimonials</div>
            <div className="text-2xl font-bold text-indigo-700">{data.testimonials || 0}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
            <div className="text-sm text-gray-600">Sales</div>
            <div className="text-2xl font-bold text-red-700">{data.sales || 0}</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg border-l-4 border-teal-500">
            <div className="text-sm text-gray-600">New Face Sold</div>
            <div className="text-2xl font-bold text-teal-700">{data.new_face_sold || 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-cyan-50 p-4 rounded-lg border-l-4 border-cyan-500">
            <div className="text-sm text-gray-600">Fact Finders</div>
            <div className="text-2xl font-bold text-cyan-700">{data.fact_finders || 0}</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
            <div className="text-sm text-gray-600">Bankers Premium</div>
            <div className="text-2xl font-bold text-amber-700">
              ${typeof data.bankers_premium === 'number' ? data.bankers_premium.toFixed(2) : (data.bankers_premium || 0)}
            </div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg border-l-4 border-emerald-500">
            <div className="text-sm text-gray-600">Total Premium</div>
            <div className="text-2xl font-bold text-emerald-700">
              ${typeof data.premium === 'number' ? data.premium.toFixed(2) : (data.premium || 0)}
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

  const periods = [
    { id: 'daily', label: 'Daily', icon: Calendar, color: 'blue', description: 'View data for a specific date' },
    { id: 'weekly', label: 'Weekly', icon: Calendar, color: 'teal', description: 'Current week totals (Mon-Sun)' },
    { id: 'monthly', label: 'Monthly', icon: BarChart3, color: 'green', description: 'Current month totals' },
    { id: 'quarterly', label: 'Quarterly', icon: LineChart, color: 'purple', description: 'Current quarter totals' },
    { id: 'yearly', label: 'Yearly', icon: TrendingUp, color: 'orange', description: 'Current year totals' }
  ];

  const content = (
    <>
      {/* Period Selection */}
      <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-100 rounded-lg border border-slate-300">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Time Period
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {periods.map((period) => {
              const Icon = period.icon;
              return (
                <button
                  key={period.id}
                  onClick={() => handlePeriodChange(period.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg font-medium transition-all border-2 ${
                    selectedPeriod === period.id
                      ? `bg-${period.color}-100 border-${period.color}-500 text-${period.color}-700`
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm">{period.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {periods.find(p => p.id === selectedPeriod)?.description || ''}
          </p>
        </div>

        {/* Manager Selection - Show for Individual and Team reports */}
        {(activeTab === 'individual' || activeTab === 'team') && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg border border-green-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Manager (Optional)
            </label>
            <select
              value={selectedManagerId}
              onChange={(e) => {
                setSelectedManagerId(e.target.value);
                setReportData(null);
              }}
              className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">
                {activeTab === 'individual' ? 'All Team Members' : 'All Teams'}
              </option>
              {availableManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} - {manager.role}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {selectedManagerId 
                ? `Showing ${activeTab === 'individual' ? 'data for selected manager only' : 'team data for selected manager\'s team'}` 
                : `Showing ${activeTab === 'individual' ? 'data for all team members under you' : 'data for all teams under you'}`
              }
            </p>
          </div>
        )}

        {/* Date/Period Selectors - Show based on selected period */}
        {selectedPeriod === 'daily' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg border border-blue-300">
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
        )}

        {selectedPeriod === 'monthly' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg border border-green-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              max={new Date().toISOString().slice(0, 7)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        )}

        {selectedPeriod === 'weekly' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-100 rounded-lg border border-teal-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Date Range
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <span className="text-gray-500 mt-5">to</span>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {selectedPeriod === 'quarterly' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-violet-100 rounded-lg border border-purple-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Quarter
            </label>
            <select
              value={selectedQuarter}
              onChange={handleQuarterChange}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {/* Generate quarters for current year and previous years */}
              {Array.from({ length: 12 }, (_, i) => {
                const year = new Date().getFullYear() - Math.floor(i / 4);
                const quarter = 4 - (i % 4);
                const value = `${year}-Q${quarter}`;
                return (
                  <option key={value} value={value}>
                    Q{quarter} {year}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {selectedPeriod === 'yearly' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-100 rounded-lg border border-orange-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {/* Generate years - current year and 4 years back */}
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        )}

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
            onClick={viewReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Calendar size={18} className="mr-2" />
            View {selectedPeriod === 'daily' ? 'Daily' : selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Report
          </Button>
          <Button
            onClick={downloadExcel}
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
            <p className="mt-4 text-gray-600">Loading {selectedPeriod} report...</p>
          </div>
        )}

        {!loading && hierarchyData && renderHierarchyView()}

        {!loading && reportData && !hierarchyData && (
          <div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900">
                📊 {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report
                {selectedManagerId && reportData.selected_user 
                  ? ` - ${availableManagers.find(m => m.id === selectedManagerId)?.name || 'Selected Manager'}` 
                  : ''
                }
                {selectedPeriod === 'daily' 
                  ? ` for ${new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}`
                  : ` - ${reportData.period_name || selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`
                }
              </h3>
            </div>
            
            {activeTab === 'individual' && renderIndividualReport()}
            {activeTab === 'team' && renderTeamReport()}
            {activeTab === 'organization' && renderOrganizationReport()}
          </div>
        )}

        {!loading && !reportData && !hierarchyData && (
          <div className="text-center py-12 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Select a period and click &quot;View Report&quot; to see activity data</p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📋 Report Types & Periods</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Individual:</strong> Shows each team member&apos;s activity for the selected period</li>
            <li>• <strong>Team:</strong> Shows aggregated totals for each direct report&apos;s team</li>
            <li>• <strong>Organization:</strong> Shows organization-wide totals for the selected period</li>
            <li>• <strong>Daily:</strong> Activity for a specific date</li>
            <li>• <strong>Monthly:</strong> Current month totals (1st through last day)</li>
            <li>• <strong>Quarterly:</strong> Current quarter totals (Q1-Q4)</li>
            <li>• <strong>Yearly:</strong> Current year totals (January 1st through December 31st)</li>
            <li>• All reports include 8 activity categories plus total premium</li>
            <li>• Excel downloads are formatted and ready to use</li>
          </ul>
        </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Clock className="text-blue-600" />
          Manager Reports
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          View and download comprehensive activity reports for your team hierarchy across different time periods
        </p>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default DailyReport;
