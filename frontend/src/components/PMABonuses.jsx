import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { FileText, Upload, Trash2, Download, Eye } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PMABonuses = ({ user }) => {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBonuses();
  }, []);

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

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/pma-bonuses`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('PDF uploaded successfully!');
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
          Current bonus documents and resources
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
            </p>
            <label className="block">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg cursor-pointer transition-colors max-w-md">
                <Upload size={18} />
                {uploading ? 'Uploading...' : 'Choose PDF to Upload'}
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
              <p>No bonus PDFs uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bonuses.map(bonus => (
                <div
                  key={bonus.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow gap-4"
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
