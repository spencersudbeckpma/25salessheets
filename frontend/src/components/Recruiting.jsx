import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Users, Plus, Trash2, Edit2, Save, X, Search, 
  CheckCircle, Circle, Download
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Recruiting = ({ user }) => {
  const [recruits, setRecruits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    source: '',
    state: '',
    rm_dm: '',
    text_email: false,
    vertafore: false,
    study_materials: false,
    fingerprint: false,
    testing_date: '',
    pass_fail: '',
    npa_license: false,
    comments: ''
  });

  useEffect(() => {
    fetchRecruits();
  }, []);

  const fetchRecruits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/recruiting`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecruits(response.data);
    } catch (error) {
      toast.error('Failed to fetch recruits');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.put(`${API}/recruiting/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Recruit updated!');
      } else {
        await axios.post(`${API}/recruiting`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Recruit added!');
      }
      resetForm();
      fetchRecruits();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save recruit');
    }
  };

  const handleEdit = (recruit) => {
    setFormData({
      name: recruit.name || '',
      source: recruit.source || '',
      state: recruit.state || '',
      rm_dm: recruit.rm_dm || '',
      text_email: recruit.text_email || false,
      vertafore: recruit.vertafore || false,
      study_materials: recruit.study_materials || false,
      fingerprint: recruit.fingerprint || false,
      testing_date: recruit.testing_date || '',
      pass_fail: recruit.pass_fail || '',
      npa_license: recruit.npa_license || false,
      comments: recruit.comments || ''
    });
    setEditingId(recruit.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recruit?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/recruiting/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Recruit deleted');
      fetchRecruits();
    } catch (error) {
      toast.error('Failed to delete recruit');
    }
  };

  const toggleField = async (recruit, field) => {
    try {
      const token = localStorage.getItem('token');
      const updatedData = { ...recruit, [field]: !recruit[field] };
      await axios.put(`${API}/recruiting/${recruit.id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecruits();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const updatePassFail = async (recruit, value) => {
    try {
      const token = localStorage.getItem('token');
      const updatedData = { ...recruit, pass_fail: value };
      await axios.put(`${API}/recruiting/${recruit.id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecruits();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      source: '',
      state: '',
      rm_dm: '',
      text_email: false,
      vertafore: false,
      study_materials: false,
      fingerprint: false,
      testing_date: '',
      pass_fail: '',
      npa_license: false,
      comments: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Where Came From', 'State', 'RM/DM', 'Text+Email', 'Vertafore', 'Study Materials', 'Fingerprint', 'Testing Date', 'Pass/Fail', 'NPA License', 'Comments'];
    const rows = filteredRecruits.map(r => [
      r.name,
      r.source,
      r.state,
      r.rm_dm,
      r.text_email ? 'Yes' : 'No',
      r.vertafore ? 'Yes' : 'No',
      r.study_materials ? 'Yes' : 'No',
      r.fingerprint ? 'Yes' : 'No',
      r.testing_date || '',
      r.pass_fail || '',
      r.npa_license ? 'Yes' : 'No',
      r.comments
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruiting_pipeline_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredRecruits = recruits.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.comments?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = filterState === 'all' || r.state === filterState;
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'pass' && r.pass_fail === 'Pass') ||
                          (filterStatus === 'fail' && r.pass_fail === 'Fail') ||
                          (filterStatus === 'pending' && (!r.pass_fail || r.pass_fail === ''));
    return matchesSearch && matchesState && matchesStatus;
  });

  const CheckBox = ({ checked, onClick, label }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
        checked 
          ? 'bg-green-500 text-white hover:bg-green-600' 
          : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
      }`}
      title={label}
    >
      {checked ? <CheckCircle size={18} /> : <Circle size={18} />}
    </button>
  );

  const PassFailBadge = ({ value, onSelect }) => {
    const colors = {
      'Pass': 'bg-green-500 text-white',
      'Fail': 'bg-red-500 text-white',
      '': 'bg-slate-200 text-slate-500'
    };
    
    return (
      <select
        value={value || ''}
        onChange={(e) => onSelect(e.target.value)}
        className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer ${colors[value] || colors['']}`}
      >
        <option value="">-</option>
        <option value="Pass">Pass</option>
        <option value="Fail">Fail</option>
      </select>
    );
  };

  if (user.role !== 'state_manager') {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-8 text-center text-slate-500">
          You don't have access to this section.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="text-amber-600" size={24} />
            Recruiting Pipeline
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Download size={14} className="mr-1" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400"
              size="sm"
            >
              <Plus size={16} className="mr-1" />
              Add Recruit
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Track your recruiting pipeline • {recruits.length} total recruits
        </p>
      </CardHeader>

      <CardContent>
        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingId ? 'Edit Recruit' : 'Add New Recruit'}
                </h3>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Recruit name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Where Came From</label>
                    <Input
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="Referral, job board, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      <option value="">Select State</option>
                      <option value="MN">Minnesota</option>
                      <option value="ND">North Dakota</option>
                      <option value="SD">South Dakota</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">RM/DM</label>
                    <Input
                      value={formData.rm_dm}
                      onChange={(e) => setFormData({ ...formData, rm_dm: e.target.value })}
                      placeholder="Regional/District Manager"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Testing Date</label>
                    <Input
                      type="date"
                      value={formData.testing_date}
                      onChange={(e) => setFormData({ ...formData, testing_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Pass / Fail</label>
                    <select
                      value={formData.pass_fail}
                      onChange={(e) => setFormData({ ...formData, pass_fail: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      <option value="">Not Yet</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-3">Progress Checkpoints</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { key: 'text_email', label: 'Text + Email' },
                      { key: 'vertafore', label: 'Vertafore' },
                      { key: 'study_materials', label: 'Study Materials' },
                      { key: 'fingerprint', label: 'Fingerprint' },
                      { key: 'npa_license', label: 'NPA License' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData[key]}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Comments</label>
                  <textarea
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    placeholder="Additional notes..."
                    className="w-full border rounded-lg p-2 text-sm h-20 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-amber-400">
                    <Save size={16} className="mr-1" />
                    {editingId ? 'Update' : 'Add'} Recruit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search recruits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="border rounded-lg px-3 h-9 text-sm"
          >
            <option value="all">All States</option>
            <option value="MN">Minnesota</option>
            <option value="ND">North Dakota</option>
            <option value="SD">South Dakota</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 h-9 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Name</th>
                <th className="px-3 py-3 text-left font-medium hidden sm:table-cell">Source</th>
                <th className="px-3 py-3 text-left font-medium">State</th>
                <th className="px-3 py-3 text-left font-medium hidden md:table-cell">RM/DM</th>
                <th className="px-3 py-3 text-center font-medium" title="Text + Email">T+E</th>
                <th className="px-3 py-3 text-center font-medium" title="Vertafore">VF</th>
                <th className="px-3 py-3 text-center font-medium" title="Study Materials">SM</th>
                <th className="px-3 py-3 text-center font-medium" title="Fingerprint">FP</th>
                <th className="px-3 py-3 text-center font-medium hidden sm:table-cell">Test Date</th>
                <th className="px-3 py-3 text-center font-medium">P/F</th>
                <th className="px-3 py-3 text-center font-medium" title="NPA License">NPA</th>
                <th className="px-3 py-3 text-left font-medium hidden lg:table-cell">Comments</th>
                <th className="px-3 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="13" className="px-3 py-8 text-center text-slate-400">
                    Loading recruits...
                  </td>
                </tr>
              ) : filteredRecruits.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-3 py-8 text-center text-slate-400">
                    {searchTerm || filterState !== 'all' || filterStatus !== 'all'
                      ? 'No recruits match your filters'
                      : 'No recruits yet. Click "Add Recruit" to get started.'}
                  </td>
                </tr>
              ) : (
                filteredRecruits.map((recruit) => (
                  <tr key={recruit.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-800">{recruit.name}</td>
                    <td className="px-3 py-3 text-slate-600 hidden sm:table-cell">{recruit.source || '-'}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium">
                        {recruit.state || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 hidden md:table-cell">{recruit.rm_dm || '-'}</td>
                    <td className="px-3 py-3 text-center">
                      <CheckBox
                        checked={recruit.text_email}
                        onClick={() => toggleField(recruit, 'text_email')}
                        label="Text + Email"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CheckBox
                        checked={recruit.vertafore}
                        onClick={() => toggleField(recruit, 'vertafore')}
                        label="Vertafore"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CheckBox
                        checked={recruit.study_materials}
                        onClick={() => toggleField(recruit, 'study_materials')}
                        label="Study Materials"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CheckBox
                        checked={recruit.fingerprint}
                        onClick={() => toggleField(recruit, 'fingerprint')}
                        label="Fingerprint"
                      />
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-slate-600 hidden sm:table-cell">
                      {recruit.testing_date || '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <PassFailBadge 
                        value={recruit.pass_fail} 
                        onSelect={(val) => updatePassFail(recruit, val)}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CheckBox
                        checked={recruit.npa_license}
                        onClick={() => toggleField(recruit, 'npa_license')}
                        label="NPA License"
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-600 hidden lg:table-cell max-w-[200px] truncate" title={recruit.comments}>
                      {recruit.comments || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleEdit(recruit)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(recruit.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        {filteredRecruits.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[
              { label: 'Text + Email', key: 'text_email' },
              { label: 'Vertafore', key: 'vertafore' },
              { label: 'Study Materials', key: 'study_materials' },
              { label: 'Fingerprint', key: 'fingerprint' },
              { label: 'Passed Test', key: 'pass_fail', isPassFail: true },
              { label: 'NPA License', key: 'npa_license' }
            ].map(({ label, key, isPassFail }) => {
              const count = isPassFail 
                ? filteredRecruits.filter(r => r.pass_fail === 'Pass').length
                : filteredRecruits.filter(r => r[key]).length;
              const percentage = Math.round((count / filteredRecruits.length) * 100);
              return (
                <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-slate-800">{count}/{filteredRecruits.length}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Recruiting;
