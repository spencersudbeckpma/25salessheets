import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { FileText, Upload, Trash2, Download, Eye, Building2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PMABonuses = ({ user }) => {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  useEffect(() => {
    fetchBonuses();
    // Fetch teams for super_admin
    if (user.role === 'super_admin') {
      fetchTeams();
    }
  }, [user.role]);

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams');
    }
  };

  const fetchBonuses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/pma-bonuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBonuses(response.data);
    } catch (error) {
      toast.error('Failed to fetch bonus PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // super_admin must select a team
    if (user.role === 'super_admin' && !selectedTeamId) {
      toast.error('Please select a team first');
      event.target.value = '';
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Add team_id for super_admin
    if (user.role === 'super_admin' && selectedTeamId) {
      formData.append('team_id', selectedTeamId);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/pma-bonuses`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(response.data.message || 'PDF uploaded successfully!');
      fetchBonuses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload PDF');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (bonusId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/pma-bonuses/${bonusId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('PDF deleted successfully');
      fetchBonuses();
    } catch (error) {
      toast.error('Failed to delete PDF');
    }
  };

  const handleDownload = async (bonusId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/pma-bonuses/${bonusId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleView = async (bonusId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/pma-bonuses/${bonusId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to view PDF');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="shadow-lg bg-white" data-testid="pma-bonuses-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="pma-bonuses-title">
          <FileText className="text-blue-600" size={24} />
          PMA Bonuses
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Current bonus documents and resources for your team
        </p>
      </CardHeader>
      <CardContent className="pt-2 space-y-6">
        {/* Upload Section - State Manager and Super Admin Only */}
        {(user.role === 'state_manager' || user.role === 'super_admin') && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Upload size={20} />
              Upload New Bonus PDF
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload PDF files for current PMA bonuses. Maximum file size: 10MB.
              {user.role === 'state_manager' && (
                <span className="block mt-1 text-blue-600">Documents will be visible only to your team.</span>
              )}
            </p>
            
            {/* Team Selection for Super Admin */}
            {user.role === 'super_admin' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Building2 size={16} />
                  Select Target Team <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full max-w-md p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="team-select-upload"
                >
                  <option value="">-- Select a team --</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Document will be visible ONLY to users in the selected team.
                </p>
              </div>
            )}
            
            <label className="block">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading || (user.role === 'super_admin' && !selectedTeamId)}
                className="hidden"
                data-testid="file-upload-input"
              />
              <div 
                className={`flex items-center justify-center gap-2 py-3 px-6 rounded-lg cursor-pointer transition-colors max-w-md ${
                  (user.role === 'super_admin' && !selectedTeamId) 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Upload size={18} />
                {uploading ? 'Uploading...' : 
                 (user.role === 'super_admin' && !selectedTeamId) ? 'Select a team first' :
                 'Choose PDF to Upload'}
              </div>
            </label>
          </div>
        )}

        {/* Bonus PDFs List */}
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText size={20} />
            Current Bonus Documents
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading documents...</div>
          ) : bonuses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p>No bonus PDFs available for your team</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bonuses.map(bonus => (
                <div
                  key={bonus.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow gap-4"
                  data-testid={`bonus-item-${bonus.id}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
                      <FileText size={24} className="text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{bonus.filename}</div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(bonus.file_size)} • Uploaded {formatDate(bonus.uploaded_at)}
                      </div>
                      <div className="text-xs text-gray-400">
                        By: {bonus.uploaded_by_name}
                        {bonus.team_name && <span className="ml-2">• Team: {bonus.team_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(bonus.id)}
                      title="View PDF"
                      className="flex items-center gap-1"
                      data-testid={`view-btn-${bonus.id}`}
                    >
                      <Eye size={16} />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(bonus.id, bonus.filename)}
                      title="Download PDF"
                      className="flex items-center gap-1"
                      data-testid={`download-btn-${bonus.id}`}
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    {(user.role === 'state_manager' || user.role === 'super_admin') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(bonus.id, bonus.filename)}
                        title="Delete PDF"
                        className="flex items-center gap-1"
                        data-testid={`delete-btn-${bonus.id}`}
                      >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PMABonuses;
