import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trophy, FileText, Upload, Trash2, Download, Eye } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Leaderboard = ({ user }) => {
  const [period, setPeriod] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bonuses, setBonuses] = useState([]);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/leaderboard/${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaderboard(response.data);
    } catch (error) {
      toast.error('Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchBonuses = async () => {
    setBonusLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/pma-bonuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBonuses(response.data);
    } catch (error) {
      toast.error('Failed to fetch bonus PDFs');
    } finally {
      setBonusLoading(false);
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

  const getRankBadge = (rank) => {
    if (rank === 0) return <span className="text-2xl">🥇</span>;
    if (rank === 1) return <span className="text-2xl">🥈</span>;
    if (rank === 2) return <span className="text-2xl">🥉</span>;
    return <span className="text-gray-600 font-bold text-lg">#{rank + 1}</span>;
  };

  const categories = [
    { key: 'presentations', label: 'Presentations', icon: '📊', color: 'border-purple-500' },
    { key: 'referrals', label: 'Referrals', icon: '🤝', color: 'border-blue-500' },
    { key: 'testimonials', label: 'Testimonials', icon: '⭐', color: 'border-yellow-500' },
    { key: 'new_face_sold', label: 'New Face Sold', icon: '🎯', color: 'border-red-500' },
    { key: 'premium', label: 'Total Premium', icon: '💵', color: 'border-green-500' }
  ];

  return (
    <Card className="shadow-lg bg-white" data-testid="leaderboard-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="leaderboard-title">
          <Trophy className="text-yellow-500" size={24} />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs defaultValue="leaderboard" className="space-y-4" onValueChange={(val) => {
          if (val === 'bonuses') fetchBonuses();
        }}>
          <TabsList className="inline-flex bg-gray-100 p-1 gap-1">
            <TabsTrigger value="leaderboard" className="py-2 px-4 text-sm whitespace-nowrap">
              🏆 Leaderboard
            </TabsTrigger>
            <TabsTrigger value="bonuses" className="py-2 px-4 text-sm whitespace-nowrap">
              📄 Current PMA Bonuses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <p className="text-sm text-gray-600" data-testid="leaderboard-subtitle">
                Top 5 performers for {period} period
              </p>
              <div className="flex flex-wrap gap-2">
                {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
                  <Button
                    key={p}
                    data-testid={`period-${p}-btn`}
                    variant={period === p ? 'default' : 'outline'}
                    onClick={() => setPeriod(p)}
                    size="sm"
                    className="text-xs"
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading leaderboard...</div>
            ) : leaderboard && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(category => (
                  <div key={category.key} className={`bg-gradient-to-br from-white to-gray-50 rounded-lg border-l-4 ${category.color} p-5 shadow-sm`}>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" data-testid={`category-${category.key}-title`}>
                      <span className="text-2xl">{category.icon}</span>
                      {category.label}
                    </h3>
                    <div className="space-y-3">
                      {leaderboard[category.key] && leaderboard[category.key].slice(0, 5).map((entry, index) => (
                        <div
                          key={entry.user_id}
                          data-testid={`leaderboard-${category.key}-rank-${index + 1}`}
                          className={`flex items-center justify-between p-3 rounded-lg transition-all ${ 
                            entry.user_id === user.id ? 'bg-blue-100 border-2 border-blue-400 shadow-md' : 'bg-white shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 flex justify-center shrink-0" data-testid={`rank-badge-${category.key}-${index + 1}`}>
                              {getRankBadge(index)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate" data-testid={`name-${category.key}-${index + 1}`}>
                                {entry.name}
                                {entry.user_id === user.id && (
                                  <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded" data-testid={`you-badge-${category.key}`}>
                                    (You)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="font-bold text-lg shrink-0 ml-2" data-testid={`value-${category.key}-${index + 1}`}>
                            {category.key === 'premium' ? `$${entry[category.key].toFixed(2)}` : entry[category.key]}
                          </div>
                        </div>
                      ))}
                      {(!leaderboard[category.key] || leaderboard[category.key].length === 0) && (
                        <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg" data-testid={`no-data-${category.key}`}>
                          No data yet
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bonuses" className="space-y-6">
            {/* Upload Section - State Manager Only */}
            {user.role === 'state_manager' && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Upload size={20} />
                  Upload New Bonus PDF
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload PDF files for current PMA bonuses. Maximum file size: 10MB.
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg cursor-pointer transition-colors">
                      <Upload size={18} />
                      {uploading ? 'Uploading...' : 'Choose PDF to Upload'}
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Bonus PDFs List */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FileText size={20} />
                Current Bonus Documents
              </h3>

              {bonusLoading ? (
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
                      className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-red-100 rounded-lg">
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
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(bonus.id)}
                          title="View PDF"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(bonus.id, bonus.filename)}
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </Button>
                        {user.role === 'state_manager' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(bonus.id, bonus.filename)}
                            title="Delete PDF"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
