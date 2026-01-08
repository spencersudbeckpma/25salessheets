import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { 
  Award, Calendar, DollarSign, User, Users, Search, 
  CheckCircle, XCircle, ArrowUpRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NPATracker = ({ user }) => {
  const [npaAgents, setNpaAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduced, setFilterProduced] = useState('all'); // 'all', 'yes', 'no'

  useEffect(() => {
    fetchNPAData();
  }, []);

  const fetchNPAData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/npa-tracker`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNpaAgents(response.data);
    } catch (error) {
      toast.error('Failed to fetch NPA data');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = npaAgents.filter(agent => {
    const matchesSearch = 
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.upline_dm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.upline_rm?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterProduced === 'all' ||
      (filterProduced === 'yes' && agent.has_produced) ||
      (filterProduced === 'no' && !agent.has_produced);
    
    return matchesSearch && matchesFilter;
  });

  const producedCount = npaAgents.filter(a => a.has_produced).length;
  const notProducedCount = npaAgents.filter(a => !a.has_produced).length;
  const totalFirstPremium = npaAgents.reduce((sum, a) => sum + (a.first_production_premium || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Award className="text-amber-600" size={20} />
          NPA Tracker - First Production
        </h3>
        <p className="text-sm text-gray-500">
          Track first production dates and upline assignments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{npaAgents.length}</div>
            <div className="text-sm opacity-90">Total Agents</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{producedCount}</div>
            <div className="text-sm opacity-90">Have Produced</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{notProducedCount}</div>
            <div className="text-sm opacity-90">Not Yet Produced</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              ${(totalFirstPremium / 1000).toFixed(1)}K
            </div>
            <div className="text-sm opacity-90">Total First Premium</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or upline..."
            className="pl-10"
          />
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilterProduced('all')}
            className={`px-3 py-1 rounded text-sm ${filterProduced === 'all' ? 'bg-white shadow font-medium' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterProduced('yes')}
            className={`px-3 py-1 rounded text-sm ${filterProduced === 'yes' ? 'bg-white shadow font-medium' : ''}`}
          >
            Produced
          </button>
          <button
            onClick={() => setFilterProduced('no')}
            className={`px-3 py-1 rounded text-sm ${filterProduced === 'no' ? 'bg-white shadow font-medium' : ''}`}
          >
            Not Yet
          </button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Agent Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">First Production</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">First Premium</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Upline DM</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Upline RM</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent, idx) => (
                  <tr key={agent.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      {agent.has_produced ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={18} />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <XCircle size={18} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{agent.role}</td>
                    <td className="px-4 py-3">
                      {agent.first_production_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar size={14} className="text-gray-400" />
                          {agent.first_production_date}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {agent.first_production_premium > 0 ? (
                        <span className="font-medium text-green-600">
                          ${agent.first_production_premium.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {agent.upline_dm ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User size={14} className="text-blue-500" />
                          {agent.upline_dm}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {agent.upline_rm ? (
                        <div className="flex items-center gap-1 text-sm">
                          <ArrowUpRight size={14} className="text-purple-500" />
                          {agent.upline_rm}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredAgents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No agents found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NPATracker;
