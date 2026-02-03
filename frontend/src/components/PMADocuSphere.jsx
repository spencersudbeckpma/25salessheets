import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Folder, FolderOpen, FileText, Upload, Trash2, Download, Eye, 
  ChevronRight, ChevronDown, Plus, Search, FolderPlus, X, Printer
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PMADocuSphere = ({ user }) => {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [foldersError, setFoldersError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState(null);

  useEffect(() => {
    // Small delay to ensure auth token is available
    const timer = setTimeout(() => {
      fetchFolders();
      fetchDocuments();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchFolders = async (retryCount = 0) => {
    setFoldersLoading(true);
    setFoldersError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Retry once after a short delay if token not found
        if (retryCount < 2) {
          setTimeout(() => fetchFolders(retryCount + 1), 500);
          return;
        }
        setFoldersError('Not authenticated');
        setFoldersLoading(false);
        return;
      }
      const response = await axios.get(`${API}/docusphere/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      // Auto-retry once on failure
      if (retryCount < 1) {
        setTimeout(() => fetchFolders(retryCount + 1), 1000);
        return;
      }
      setFoldersError(error.response?.data?.detail || error.message || 'Failed to load folders');
      toast.error('Failed to load folders. Tap "Try again" to retry.');
    } finally {
      setFoldersLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/docusphere/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/docusphere/folders`, {
        name: newFolderName.trim(),
        parent_id: newFolderParent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Folder created!');
      setNewFolderName('');
      setNewFolderParent(null);
      setShowNewFolderModal(false);
      fetchFolders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Delete folder "${folderName}" and all its contents?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/docusphere/folders/${folderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Folder deleted');
      fetchFolders();
      fetchDocuments();
      if (selectedFolder === folderId) setSelectedFolder(null);
    } catch (error) {
      toast.error('Failed to delete folder');
    }
  };

  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Filter only PDFs
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      toast.error('Only PDF files are allowed');
      return;
    }

    // Check file sizes
    const oversizedFiles = pdfFiles.filter(f => f.size > 15 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} file(s) exceed 15MB limit and will be skipped`);
    }

    const validFiles = pdfFiles.filter(f => f.size <= 15 * 1024 * 1024);
    if (validFiles.length === 0) {
      toast.error('No valid files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });

    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress({ current: i + 1, total: validFiles.length });

      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolder) {
        formData.append('folder_id', selectedFolder);
      }

      try {
        await axios.post(`${API}/docusphere/documents`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} document(s) uploaded successfully!`);
      fetchDocuments();
    }
    if (failCount > 0) {
      toast.error(`${failCount} document(s) failed to upload`);
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    event.target.value = '';
  };

  const handleDeleteDocument = async (docId, filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/docusphere/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleView = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/docusphere/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to view document');
    }
  };

  const handleDownload = async (docId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/docusphere/documents/${docId}/download`, {
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
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const handlePrint = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/docusphere/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const printWindow = window.open(url, '_blank');
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      toast.error('Failed to print document');
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Build folder tree structure
  const buildFolderTree = (parentId = null) => {
    return folders
      .filter(f => {
        // Handle both null and undefined parent_id
        if (parentId === null) {
          return f.parent_id === null || f.parent_id === undefined || f.parent_id === '';
        }
        return f.parent_id === parentId;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get documents for a folder
  const getFolderDocuments = (folderId) => {
    return documents.filter(d => d.folder_id === folderId);
  };

  // Get total document count for a folder including all subfolders (recursive)
  const getTotalDocumentCount = (folderId) => {
    // Direct documents in this folder
    let count = documents.filter(d => d.folder_id === folderId).length;
    
    // Add documents from all subfolders recursively
    const childFolders = folders.filter(f => f.parent_id === folderId);
    for (const child of childFolders) {
      count += getTotalDocumentCount(child.id);
    }
    
    return count;
  };

  // Filter documents by search
  const filteredDocuments = searchTerm
    ? documents.filter(d => 
        d.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        folders.find(f => f.id === d.folder_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : selectedFolder 
      ? getFolderDocuments(selectedFolder)
      : documents;

  // Get folder path for breadcrumb
  const getFolderPath = (folderId) => {
    const path = [];
    let current = folders.find(f => f.id === folderId);
    while (current) {
      path.unshift(current);
      current = folders.find(f => f.id === current.parent_id);
    }
    return path;
  };

  // Render folder item recursively
  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;
    const children = buildFolderTree(folder.id);
    const totalDocCount = getTotalDocumentCount(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
            isSelected ? 'bg-slate-800 text-amber-400' : 'hover:bg-slate-100'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            setSelectedFolder(folder.id);
            setSearchTerm('');
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
            className="p-0.5 hover:bg-slate-200 rounded"
          >
            {children.length > 0 ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <span className="w-4" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen size={18} className={isSelected ? 'text-amber-400' : 'text-amber-600'} />
          ) : (
            <Folder size={18} className={isSelected ? 'text-amber-400' : 'text-amber-600'} />
          )}
          <span className="flex-1 truncate text-sm font-medium">{folder.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${isSelected ? 'bg-amber-500 text-slate-900' : 'bg-slate-200 text-slate-600'}`}>
            {totalDocCount}
          </span>
          {(user.role === 'state_manager' || user.role === 'super_admin') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder.id, folder.name);
              }}
              className="p-1 hover:bg-red-100 rounded text-red-500 opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {isExpanded && children.map(child => renderFolder(child, depth + 1))}
      </div>
    );
  };

  return (
    <Card className="shadow-lg bg-white" data-testid="docusphere-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="docusphere-title">
          <FileText className="text-amber-600" size={24} />
          PMA DocuSphere
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Document library for your team • {documents.length} documents
        </p>
        {/* Read-only notice for non-admin users */}
        {user.role !== 'state_manager' && user.role !== 'super_admin' && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <span className="font-medium">Read-only access:</span> Only State Managers and Super Admins can upload or modify documents.
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar - Folders */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              {/* Search */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* All Documents */}
              <div
                className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                  selectedFolder === null && !searchTerm ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'
                }`}
                onClick={() => {
                  setSelectedFolder(null);
                  setSearchTerm('');
                }}
              >
                <Folder size={18} className={selectedFolder === null && !searchTerm ? 'text-amber-400' : 'text-slate-600'} />
                <span className="flex-1 text-sm font-medium">All Documents</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${selectedFolder === null && !searchTerm ? 'bg-amber-500 text-slate-900' : 'bg-amber-500/20 text-slate-600'}`}>
                  {documents.length}
                </span>
              </div>

              {/* Folder Tree - Scrollable with better mobile height */}
              <div className="max-h-[50vh] lg:max-h-96 overflow-y-auto overflow-x-hidden">
                {foldersLoading ? (
                  <div className="text-xs text-slate-400 p-2 flex items-center gap-2">
                    <div className="animate-spin h-3 w-3 border-2 border-slate-300 border-t-amber-500 rounded-full"></div>
                    Loading folders...
                  </div>
                ) : foldersError ? (
                  <div className="text-xs text-red-500 p-2">
                    <p>{foldersError}</p>
                    <button 
                      onClick={fetchFolders}
                      className="mt-2 text-amber-600 hover:text-amber-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-xs text-slate-400 p-2">No folders yet</div>
                ) : (
                  buildFolderTree(null).map(folder => renderFolder(folder))
                )}
              </div>

              {/* Add Folder Button (State Manager and Super Admin) */}
              {(user.role === 'state_manager' || user.role === 'super_admin') && (
                <Button
                  onClick={() => {
                    setNewFolderParent(selectedFolder);
                    setShowNewFolderModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-xs"
                >
                  <FolderPlus size={14} className="mr-1" />
                  New Folder
                </Button>
              )}
            </div>
          </div>

          {/* Main Content - Documents */}
          <div className="flex-1">
            {/* Header with Breadcrumb & Upload */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                {selectedFolder ? (
                  <div className="flex items-center gap-1 text-sm">
                    <button
                      onClick={() => setSelectedFolder(null)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      All Documents
                    </button>
                    {getFolderPath(selectedFolder).map((folder, idx) => (
                      <React.Fragment key={folder.id}>
                        <ChevronRight size={14} className="text-slate-400" />
                        <button
                          onClick={() => setSelectedFolder(folder.id)}
                          className={idx === getFolderPath(selectedFolder).length - 1 
                            ? 'font-semibold text-slate-800' 
                            : 'text-slate-500 hover:text-slate-800'
                          }
                        >
                          {folder.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                ) : searchTerm ? (
                  <div className="text-sm text-slate-600">
                    Search results for "{searchTerm}" ({filteredDocuments.length} found)
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-slate-800">All Documents</div>
                )}
              </div>

              {/* Upload Button (State Manager and Super Admin) */}
              {(user.role === 'state_manager' || user.role === 'super_admin') && (
                <label>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 py-2 px-4 rounded-lg cursor-pointer transition-colors text-sm font-medium">
                    <Upload size={16} />
                    {uploading 
                      ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
                      : 'Upload PDFs'}
                  </div>
                </label>
              )}
            </div>

            {/* Drag & Drop Zone (State Manager and Super Admin) */}
            {(user.role === 'state_manager' || user.role === 'super_admin') && (
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 mb-4 text-center hover:border-amber-500 hover:bg-amber-50/50 transition-colors cursor-pointer"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-amber-500', 'bg-amber-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-amber-500', 'bg-amber-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-amber-500', 'bg-amber-50');
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    const event = { target: { files, value: '' } };
                    handleFileUpload(event);
                  }
                }}
                onClick={() => document.getElementById('bulk-upload-input').click()}
              >
                <input
                  id="bulk-upload-input"
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600 font-medium">
                  {uploading 
                    ? `Uploading ${uploadProgress.current} of ${uploadProgress.total} files...` 
                    : 'Drag & drop multiple PDFs here, or click to select'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedFolder 
                    ? `Files will be added to: ${folders.find(f => f.id === selectedFolder)?.name || 'Selected folder'}`
                    : 'Select a folder first, or files will go to root'}
                </p>
                {uploading && (
                  <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Documents Grid */}
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading documents...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">
                  {searchTerm ? 'No documents found' : 'No documents in this folder'}
                </p>
                {user.role === 'state_manager' && !searchTerm && (
                  <p className="text-sm text-slate-400 mt-2">Drag & drop PDFs above or click to upload</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                        <FileText size={24} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-800 truncate" title={doc.filename}>
                          {doc.filename}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatFileSize(doc.file_size)}
                        </div>
                        {searchTerm && doc.folder_id && (
                          <div className="text-xs text-amber-600 mt-1">
                            📁 {folders.find(f => f.id === doc.folder_id)?.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleView(doc.id)}
                        className="flex-1 h-8 text-xs"
                      >
                        <Eye size={14} className="mr-1" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(doc.id, doc.filename)}
                        className="flex-1 h-8 text-xs"
                      >
                        <Download size={14} className="mr-1" /> Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrint(doc.id)}
                        className="h-8 text-xs px-2"
                      >
                        <Printer size={14} />
                      </Button>
                      {user.role === 'state_manager' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                          className="h-8 text-xs px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* New Folder Modal */}
        {showNewFolderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New Folder</h3>
                <button onClick={() => setShowNewFolderModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Folder Name</label>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent Folder</label>
                  <select
                    value={newFolderParent || ''}
                    onChange={(e) => setNewFolderParent(e.target.value || null)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Root (No parent)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowNewFolderModal(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFolder} className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-400">
                    Create Folder
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PMADocuSphere;
