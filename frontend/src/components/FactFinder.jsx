import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { 
  Plus, Search, FileText, Download, Copy, Trash2, Edit, 
  ChevronLeft, Save, Calendar, User, Building 
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Rating scale labels
const RATING_LABELS = {
  1: 'Very Concerned',
  2: '',
  3: '',
  4: '',
  5: 'Not Concerned'
};

// Section definitions matching the worksheet
const HEALTH_EXPENSES = [
  { key: 'choose_physician', label: 'Choose your physician' },
  { key: 'coverage_traveling', label: 'Coverage when traveling' },
  { key: 'personal_agent', label: 'Personal agent' },
  { key: 'affordability', label: 'Affordability' },
  { key: 'critical_illness', label: 'Coverage for Critical Illness' },
];

const RETIREMENT_INCOME = [
  { key: 'safety_principal', label: 'Safety of principal' },
  { key: 'transferring_assets', label: 'Transferring assets' },
  { key: 'minimizing_taxes', label: 'Minimizing taxes' },
  { key: 'accessibility_money', label: 'Accessibility of money' },
  { key: 'rate_return', label: 'Rate of return' },
  { key: 'outliving_assets', label: 'Outliving assets' },
];

const FINAL_EXPENSES = [
  { key: 'funeral_costs', label: 'Funeral costs' },
  { key: 'survivor_income', label: 'Survivor income' },
  { key: 'legacy_giving', label: 'Legacy giving' },
  { key: 'charitable_giving', label: 'Charitable giving' },
  { key: 'living_benefits', label: 'Living benefits of Life Insurance' },
];

const EXTENDED_CARE = [
  { key: 'remaining_independent', label: 'Remaining independent' },
  { key: 'protecting_assets', label: 'Protecting assets' },
  { key: 'care_location_choices', label: 'Having choices in care location' },
  { key: 'not_burdening_family', label: 'Not burdening friends or family' },
  { key: 'how_remembered', label: 'How you are remembered' },
];

const FactFinder = ({ user }) => {
  const [view, setView] = useState('list'); // list | form
  const [factFinders, setFactFinders] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    client_info: {
      first_name: '',
      last_name: '',
      birth_date: '',
      spouse_first: '',
      spouse_last: '',
      spouse_birth_date: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      employer: '',
      employer_retired: false,
      spouse_employer: '',
      spouse_employer_retired: false,
      email: '',
      phone: ''
    },
    health_expenses: {},
    retirement_income: {},
    final_expenses: {},
    extended_care: {},
    producer_name_1: '',
    producer_name_2: '',
    agent_number_1: '',
    agent_number_2: '',
    notes: '',
    status: 'draft'
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchFactFinders();
    fetchMonths();
  }, [selectedMonth, searchTerm]);

  const fetchFactFinders = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/fact-finders`;
      const params = new URLSearchParams();
      if (selectedMonth && selectedMonth !== 'all') {
        params.append('month', selectedMonth);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await axios.get(url, { headers });
      setFactFinders(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load Fact Finders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonths = async () => {
    try {
      const res = await axios.get(`${API}/api/fact-finders/months/list`, { headers });
      setMonths(res.data);
    } catch (error) {
      console.error('Failed to fetch months', error);
    }
  };

  const resetForm = () => {
    setFormData({
      client_info: {
        first_name: '',
        last_name: '',
        birth_date: '',
        spouse_first: '',
        spouse_last: '',
        spouse_birth_date: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        employer: '',
        employer_retired: false,
        spouse_employer: '',
        spouse_employer_retired: false,
        email: '',
        phone: ''
      },
      health_expenses: {},
      retirement_income: {},
      final_expenses: {},
      extended_care: {},
      producer_name_1: user?.name || '',
      producer_name_2: '',
      agent_number_1: '',
      agent_number_2: '',
      notes: '',
      status: 'draft'
    });
    setEditingId(null);
  };

  const openNewForm = () => {
    resetForm();
    setView('form');
  };

  const openEditForm = async (id) => {
    try {
      const res = await axios.get(`${API}/api/fact-finders/${id}`, { headers });
      setFormData(res.data);
      setEditingId(id);
      setView('form');
    } catch (error) {
      toast.error('Failed to load Fact Finder');
    }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await axios.put(`${API}/api/fact-finders/${editingId}`, formData, { headers });
        toast.success('Fact Finder updated!');
      } else {
        await axios.post(`${API}/api/fact-finders`, formData, { headers });
        toast.success('Fact Finder created!');
      }
      setView('list');
      fetchFactFinders();
      fetchMonths();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save Fact Finder');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await axios.post(`${API}/api/fact-finders/${id}/duplicate`, {}, { headers });
      toast.success('Fact Finder duplicated!');
      fetchFactFinders();
      fetchMonths();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to duplicate');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API}/api/fact-finders/${deleteTarget}`, { headers });
      toast.success('Fact Finder deleted');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchFactFinders();
      fetchMonths();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleExportPDF = (id) => {
    window.open(`${API}/api/fact-finders/${id}/pdf`, '_blank');
  };

  const updateClientInfo = (field, value) => {
    setFormData(prev => ({
      ...prev,
      client_info: { ...prev.client_info, [field]: value }
    }));
  };

  const updateRating = (section, key, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  // Group fact finders by month
  const groupedByMonth = factFinders.reduce((acc, ff) => {
    const month = ff.month_key || 'Unknown';
    if (!acc[month]) acc[month] = [];
    acc[month].push(ff);
    return acc;
  }, {});

  const formatMonth = (monthKey) => {
    if (!monthKey || monthKey === 'Unknown') return 'Unknown';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Rating component
  const RatingRow = ({ label, section, itemKey, value }) => (
    <div className="flex items-center justify-between py-2 border-b border-amber-200 last:border-b-0">
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => updateRating(section, itemKey, rating)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === rating 
                ? 'bg-amber-600 border-amber-600 text-white' 
                : 'bg-white border-gray-300 hover:border-amber-400'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );

  // Rating section component
  const RatingSection = ({ title, items, section, data, color = 'amber' }) => (
    <Card className={`bg-${color}-50 border-${color}-200`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-semibold text-${color}-800`}>{title}</CardTitle>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Very Concerned</span>
          <span>Not Concerned</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.map((item) => (
          <RatingRow
            key={item.key}
            label={item.label}
            section={section}
            itemKey={item.key}
            value={data[item.key]}
          />
        ))}
      </CardContent>
    </Card>
  );

  // List View
  if (view === 'list') {
    return (
      <div className="space-y-4 p-4" data-testid="fact-finder-list">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Fact Finders</h2>
            <p className="text-sm text-gray-600">Client assessment worksheets</p>
          </div>
          <Button onClick={openNewForm} className="bg-amber-600 hover:bg-amber-700" data-testid="new-fact-finder-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Fact Finder
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by client name, email, city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="fact-finder-search"
                  />
                </div>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-48" data-testid="month-filter">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m.month} value={m.month}>
                      {formatMonth(m.month)} ({m.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : factFinders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No Fact Finders found</p>
              <Button onClick={openNewForm} variant="outline" className="mt-4">
                Create your first Fact Finder
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.keys(groupedByMonth).sort().reverse().map((month) => (
            <div key={month} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                {formatMonth(month)}
                <span className="text-sm font-normal text-gray-500">({groupedByMonth[month].length})</span>
              </h3>
              <div className="grid gap-3">
                {groupedByMonth[month].map((ff) => (
                  <Card key={ff.id} className="hover:shadow-md transition-shadow" data-testid={`fact-finder-card-${ff.id}`}>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-800">
                              {ff.client_info?.first_name} {ff.client_info?.last_name || 'Unnamed Client'}
                            </span>
                            {ff.status === 'draft' && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Draft</span>
                            )}
                            {ff.status === 'completed' && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Completed</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {ff.client_info?.city && `${ff.client_info.city}, `}
                            {ff.client_info?.state}
                            {ff.client_info?.email && ` • ${ff.client_info.email}`}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Created by {ff.creator_name} • {new Date(ff.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => openEditForm(ff.id)} data-testid={`edit-${ff.id}`}>
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportPDF(ff.id)} className="text-green-700 border-green-300" data-testid={`export-${ff.id}`}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDuplicate(ff.id)} className="text-blue-700 border-blue-300">
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          {(ff.created_by === user?.id || user?.role === 'state_manager' || user?.role === 'super_admin') && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => { setDeleteTarget(ff.id); setShowDeleteModal(true); }}
                              className="text-red-700 border-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Fact Finder?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The Fact Finder will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Form View
  return (
    <div className="space-y-4 p-4" data-testid="fact-finder-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setView('list')} className="text-gray-600">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to List
        </Button>
        <div className="flex gap-2">
          <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" data-testid="save-fact-finder-btn">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center py-4 bg-gradient-to-r from-amber-100 to-amber-50 rounded-lg border border-amber-200">
        <h1 className="text-xl font-bold text-amber-800">PMA USA</h1>
        <p className="text-amber-700 italic">You may have spent a lifetime accumulating assets</p>
      </div>

      {/* Rating Sections - 2 columns on larger screens */}
      <div className="grid md:grid-cols-2 gap-4">
        <RatingSection
          title="Health Expenses:"
          items={HEALTH_EXPENSES}
          section="health_expenses"
          data={formData.health_expenses}
        />
        <RatingSection
          title="Retirement Income:"
          items={RETIREMENT_INCOME}
          section="retirement_income"
          data={formData.retirement_income}
        />
        <RatingSection
          title="Final Expenses:"
          items={FINAL_EXPENSES}
          section="final_expenses"
          data={formData.final_expenses}
        />
        <RatingSection
          title="Extended Care:"
          items={EXTENDED_CARE}
          section="extended_care"
          data={formData.extended_care}
        />
      </div>

      {/* Producer Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Producer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Producer's name</Label>
            <Input
              value={formData.producer_name_1}
              onChange={(e) => setFormData(prev => ({ ...prev, producer_name_1: e.target.value }))}
              placeholder="Producer name"
            />
          </div>
          <div className="space-y-2">
            <Label>Bankers Life Agent Number</Label>
            <Input
              value={formData.agent_number_1}
              onChange={(e) => setFormData(prev => ({ ...prev, agent_number_1: e.target.value }))}
              placeholder="Agent number"
            />
          </div>
          <div className="space-y-2">
            <Label>Producer's name (2)</Label>
            <Input
              value={formData.producer_name_2}
              onChange={(e) => setFormData(prev => ({ ...prev, producer_name_2: e.target.value }))}
              placeholder="Second producer (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label>Bankers Life Agent Number (2)</Label>
            <Input
              value={formData.agent_number_2}
              onChange={(e) => setFormData(prev => ({ ...prev, agent_number_2: e.target.value }))}
              placeholder="Agent number (optional)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-amber-800">Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Name and DOB */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">First Name</Label>
              <Input
                value={formData.client_info.first_name}
                onChange={(e) => updateClientInfo('first_name', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Last Name</Label>
              <Input
                value={formData.client_info.last_name}
                onChange={(e) => updateClientInfo('last_name', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Birth Date</Label>
              <Input
                type="date"
                value={formData.client_info.birth_date}
                onChange={(e) => updateClientInfo('birth_date', e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* Row 2: Spouse */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Spouse First</Label>
              <Input
                value={formData.client_info.spouse_first}
                onChange={(e) => updateClientInfo('spouse_first', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Spouse Last</Label>
              <Input
                value={formData.client_info.spouse_last}
                onChange={(e) => updateClientInfo('spouse_last', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Spouse Birth Date</Label>
              <Input
                type="date"
                value={formData.client_info.spouse_birth_date}
                onChange={(e) => updateClientInfo('spouse_birth_date', e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* Row 3: Address */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2 md:col-span-3 space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                value={formData.client_info.address}
                onChange={(e) => updateClientInfo('address', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City</Label>
              <Input
                value={formData.client_info.city}
                onChange={(e) => updateClientInfo('city', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">State</Label>
              <Input
                value={formData.client_info.state}
                onChange={(e) => updateClientInfo('state', e.target.value)}
                className="bg-white"
                maxLength={2}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Zip</Label>
              <Input
                value={formData.client_info.zip_code}
                onChange={(e) => updateClientInfo('zip_code', e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* Row 4: Employer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Employer</Label>
              <Input
                value={formData.client_info.employer}
                onChange={(e) => updateClientInfo('employer', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                checked={formData.client_info.employer_retired}
                onCheckedChange={(checked) => updateClientInfo('employer_retired', checked)}
              />
              <Label className="text-xs">Retired</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Spouse Employer</Label>
              <Input
                value={formData.client_info.spouse_employer}
                onChange={(e) => updateClientInfo('spouse_employer', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                checked={formData.client_info.spouse_employer_retired}
                onCheckedChange={(checked) => updateClientInfo('spouse_employer_retired', checked)}
              />
              <Label className="text-xs">Retired</Label>
            </div>
          </div>

          {/* Row 5: Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                value={formData.client_info.email}
                onChange={(e) => updateClientInfo('email', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone #</Label>
              <Input
                type="tel"
                value={formData.client_info.phone}
                onChange={(e) => updateClientInfo('phone', e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes..."
            rows={4}
            className="bg-amber-50"
          />
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" data-testid="save-fact-finder-btn-bottom">
          <Save className="w-4 h-4 mr-2" />
          Save Fact Finder
        </Button>
      </div>
    </div>
  );
};

export default FactFinder;
