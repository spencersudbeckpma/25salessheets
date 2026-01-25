import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { 
  FileText, Plus, Download, Calendar, ChevronLeft, ChevronRight,
  User, Phone, MapPin, DollarSign, PiggyBank, Briefcase, CheckCircle,
  XCircle, Users, ClipboardList, Trash2, Eye, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SuitabilityForm = ({ user }) => {
  const [activeTab, setActiveTab] = useState('new');
  const [forms, setForms] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_address: '',
    annual_income: '',
    monthly_savings: '',
    liquid_net_worth: '',
    sale_made: false,
    agents: [''],
    presentation_date: new Date().toISOString().split('T')[0],
    presentation_location: '',
    notes: ''
  });

  useEffect(() => {
    fetchConfig();
    fetchForms();
  }, []);

  useEffect(() => {
    if (activeTab === 'weekly') {
      fetchWeeklyReport();
    }
  }, [activeTab, weekOffset]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/suitability-forms/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to fetch config');
    }
  };

  const fetchForms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/suitability-forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForms(response.data);
    } catch (error) {
      console.error('Failed to fetch forms');
    }
  };

  const fetchWeeklyReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/suitability-forms/weekly-report?week_offset=${weekOffset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWeeklyReport(response.data);
    } catch (error) {
      console.error('Failed to fetch weekly report');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.client_name || !formData.annual_income || !formData.monthly_savings || !formData.liquid_net_worth) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const submitData = {
        ...formData,
        agents: formData.agents.filter(a => a.trim() !== '')
      };
      
      await axios.post(`${API}/suitability-forms`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Suitability form submitted successfully!');
      resetForm();
      fetchForms();
      setActiveTab('my-forms');
    } catch (error) {
      toast.error('Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_phone: '',
      client_address: '',
      annual_income: '',
      monthly_savings: '',
      liquid_net_worth: '',
      sale_made: false,
      agents: [''],
      presentation_date: new Date().toISOString().split('T')[0],
      presentation_location: '',
      notes: ''
    });
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/suitability-forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Form deleted');
      fetchForms();
      if (activeTab === 'weekly') fetchWeeklyReport();
    } catch (error) {
      toast.error('Failed to delete form');
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/suitability-forms/export?format=csv`;
      
      if (weeklyReport) {
        url += `&start_date=${weeklyReport.week_start}&end_date=${weeklyReport.week_end}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `suitability_forms_${weeklyReport?.week_start || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Export downloaded!');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const addAgentField = () => {
    setFormData(prev => ({ ...prev, agents: [...prev.agents, ''] }));
  };

  const updateAgent = (index, value) => {
    const newAgents = [...formData.agents];
    newAgents[index] = value;
    setFormData(prev => ({ ...prev, agents: newAgents }));
  };

  const removeAgentField = (index) => {
    if (formData.agents.length > 1) {
      setFormData(prev => ({ 
        ...prev, 
        agents: prev.agents.filter((_, i) => i !== index) 
      }));
    }
  };

  const getLabelForValue = (type, value) => {
    if (!config) return value;
    const options = config[type] || [];
    const option = options.find(o => o.value === value);
    return option ? option.label : value;
  };

  const viewForm = (form) => {
    setSelectedForm(form);
    setShowViewModal(true);
  };

  return (
    <Card className="shadow-lg" data-testid="suitability-form-card">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="suitability-title">
          <FileText size={24} />
          Suitability Form (Financial Survey)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">New Form</span>
              <span className="sm:hidden">New</span>
            </TabsTrigger>
            <TabsTrigger value="my-forms" className="flex items-center gap-2">
              <ClipboardList size={16} />
              <span className="hidden sm:inline">My Forms</span>
              <span className="sm:hidden">Forms</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Calendar size={16} />
              <span className="hidden sm:inline">Weekly Report</span>
              <span className="sm:hidden">Report</span>
            </TabsTrigger>
          </TabsList>

          {/* New Form Tab */}
          <TabsContent value="new">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Information */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <User size={18} className="text-emerald-600" />
                  Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.client_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Enter client name"
                      required
                      data-testid="client-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone size={14} className="inline mr-1" />
                      Phone Number
                    </label>
                    <Input
                      value={formData.client_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                      placeholder="(555) 555-5555"
                      data-testid="client-phone-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin size={14} className="inline mr-1" />
                    Address
                  </label>
                  <Input
                    value={formData.client_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                    placeholder="Enter client address"
                    data-testid="client-address-input"
                  />
                </div>
              </div>

              {/* Financial Information */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-600" />
                  Financial Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Income <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.annual_income}
                      onChange={(e) => setFormData(prev => ({ ...prev, annual_income: e.target.value }))}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="annual-income-select"
                    >
                      <option value="">Select range...</option>
                      {config?.income_ranges?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <PiggyBank size={14} className="inline mr-1" />
                      Monthly Savings <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.monthly_savings}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthly_savings: e.target.value }))}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="monthly-savings-select"
                    >
                      <option value="">Select range...</option>
                      {config?.savings_ranges?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Briefcase size={14} className="inline mr-1" />
                      Liquid Net Worth <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.liquid_net_worth}
                      onChange={(e) => setFormData(prev => ({ ...prev, liquid_net_worth: e.target.value }))}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="net-worth-select"
                    >
                      <option value="">Select range...</option>
                      {config?.net_worth_ranges?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Presentation Details */}
              <div className="bg-amber-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar size={18} className="text-amber-600" />
                  Presentation Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Presentation Date
                    </label>
                    <Input
                      type="date"
                      value={formData.presentation_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, presentation_date: e.target.value }))}
                      data-testid="presentation-date-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Presentation Location
                    </label>
                    <Input
                      value={formData.presentation_location}
                      onChange={(e) => setFormData(prev => ({ ...prev, presentation_location: e.target.value }))}
                      placeholder="Enter location"
                      data-testid="presentation-location-input"
                    />
                  </div>
                </div>

                {/* Sale Made */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Was a sale made?
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sale_made: true }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.sale_made 
                          ? 'bg-green-100 border-green-500 text-green-700' 
                          : 'border-gray-300 text-gray-600 hover:border-green-300'
                      }`}
                      data-testid="sale-yes-btn"
                    >
                      <CheckCircle size={18} />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sale_made: false }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        !formData.sale_made 
                          ? 'bg-red-100 border-red-500 text-red-700' 
                          : 'border-gray-300 text-gray-600 hover:border-red-300'
                      }`}
                      data-testid="sale-no-btn"
                    >
                      <XCircle size={18} />
                      No
                    </button>
                  </div>
                </div>
              </div>

              {/* Agents */}
              <div className="bg-purple-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Users size={18} className="text-purple-600" />
                  Agent(s) Associated
                </h3>
                {formData.agents.map((agent, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={agent}
                      onChange={(e) => updateAgent(index, e.target.value)}
                      placeholder={`Agent ${index + 1} name`}
                      className="flex-1"
                      data-testid={`agent-input-${index}`}
                    />
                    {formData.agents.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeAgentField(index)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <X size={18} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAgentField}
                  className="text-purple-600 border-purple-300 hover:bg-purple-100"
                >
                  <Plus size={16} className="mr-1" />
                  Add Another Agent
                </Button>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes / Additional Information
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes..."
                  className="w-full border rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-emerald-500"
                  data-testid="notes-textarea"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Clear Form
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="submit-form-btn"
                >
                  {loading ? 'Submitting...' : 'Submit Suitability Form'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* My Forms Tab */}
          <TabsContent value="my-forms">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">My Submitted Forms ({forms.length})</h3>
                {forms.length > 0 && (
                  <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                    <Download size={16} />
                    Export CSV
                  </Button>
                )}
              </div>
              
              {forms.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No forms submitted yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab('new')}
                    className="text-emerald-600"
                  >
                    Submit your first form
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {forms.map(form => (
                    <div 
                      key={form.id} 
                      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{form.client_name}</h4>
                            {form.sale_made ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                <CheckCircle size={12} />
                                Sale Made
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                No Sale
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {form.presentation_date} • {form.presentation_location || 'No location'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Income: {getLabelForValue('income_ranges', form.annual_income)} • 
                            Savings: {getLabelForValue('savings_ranges', form.monthly_savings)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => viewForm(form)}
                            className="text-blue-600"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteForm(form.id)}
                            className="text-red-600"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Weekly Report Tab */}
          <TabsContent value="weekly">
            <div className="space-y-6">
              {/* Week Navigation */}
              <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
                <Button
                  variant="ghost"
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={18} />
                  Previous
                </Button>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">
                    {weeklyReport ? `${weeklyReport.week_start} to ${weeklyReport.week_end}` : 'Loading...'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} weeks ago`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                  disabled={weekOffset === 0}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={18} />
                </Button>
              </div>

              {/* Stats Cards */}
              {weeklyReport && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700">{weeklyReport.total_forms}</p>
                    <p className="text-sm text-blue-600">Total Forms</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">{weeklyReport.sales_made}</p>
                    <p className="text-sm text-green-600">Sales Made</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-amber-700">{weeklyReport.conversion_rate}%</p>
                    <p className="text-sm text-amber-600">Conversion Rate</p>
                  </div>
                </div>
              )}

              {/* By Agent Breakdown */}
              {weeklyReport && Object.keys(weeklyReport.by_agent).length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">By Agent</h4>
                  <div className="space-y-2">
                    {Object.entries(weeklyReport.by_agent).map(([agent, stats]) => (
                      <div key={agent} className="flex justify-between items-center py-2 border-b last:border-0">
                        <span className="font-medium">{agent}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-600">{stats.total} forms</span>
                          <span className="text-green-600">{stats.sales} sales</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export Button */}
              {weeklyReport && weeklyReport.total_forms > 0 && (
                <div className="flex justify-end">
                  <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                    <Download size={16} />
                    Export This Week's Report (CSV)
                  </Button>
                </div>
              )}

              {/* Forms List */}
              {weeklyReport && weeklyReport.forms.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Forms This Week</h4>
                  {weeklyReport.forms.map(form => (
                    <div 
                      key={form.id} 
                      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => viewForm(form)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{form.client_name}</h4>
                            {form.sale_made && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Sale
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {form.presentation_date} • {form.submitted_by_name}
                          </p>
                        </div>
                        <Eye size={18} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {weeklyReport && weeklyReport.forms.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No forms submitted this week</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* View Form Modal */}
      {showViewModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg flex justify-between items-center">
              <h3 className="font-bold text-lg">Suitability Form Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-white hover:bg-white/20 p-1 rounded">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Client Name</p>
                  <p className="font-medium">{selectedForm.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedForm.client_phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{selectedForm.client_address || '-'}</p>
                </div>
              </div>

              <hr />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Annual Income</p>
                  <p className="font-medium">{getLabelForValue('income_ranges', selectedForm.annual_income)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monthly Savings</p>
                  <p className="font-medium">{getLabelForValue('savings_ranges', selectedForm.monthly_savings)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Liquid Net Worth</p>
                  <p className="font-medium">{getLabelForValue('net_worth_ranges', selectedForm.liquid_net_worth)}</p>
                </div>
              </div>

              <hr />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Presentation Date</p>
                  <p className="font-medium">{selectedForm.presentation_date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{selectedForm.presentation_location || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sale Made</p>
                  <p className={`font-medium ${selectedForm.sale_made ? 'text-green-600' : 'text-gray-600'}`}>
                    {selectedForm.sale_made ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Agent(s)</p>
                  <p className="font-medium">{selectedForm.agents?.join(', ') || '-'}</p>
                </div>
              </div>

              {selectedForm.notes && (
                <>
                  <hr />
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">{selectedForm.notes}</p>
                  </div>
                </>
              )}

              <hr />

              <div className="text-sm text-gray-500">
                Submitted by {selectedForm.submitted_by_name} on {selectedForm.created_at?.substring(0, 10)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SuitabilityForm;
