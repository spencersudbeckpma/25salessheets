import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ChevronRight, ChevronDown, Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeamView = ({ user }) => {
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/team/hierarchy`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHierarchy(response.data);
      setExpandedNodes({ [response.data.id]: true });
    } catch (error) {
      toast.error('Failed to fetch team hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];

    return (
      <div key={node.id} className="mb-2">
        <div
          className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
          style={{ marginLeft: `${level * 20}px` }}
          data-testid={`team-member-${node.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <button
                    onClick={() => toggleNode(node.id)}
                    data-testid={`toggle-node-${node.id}`}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                )}
                <div>
                  <div className="font-semibold text-lg" data-testid={`member-name-${node.id}`}>{node.name}</div>
                  <div className="text-sm text-gray-600" data-testid={`member-role-${node.id}`}>
                    {node.role.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">{node.email}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-blue-50 p-2 rounded" data-testid={`member-contacts-${node.id}`}>
                  <div className="font-semibold">{node.stats.contacts}</div>
                  <div className="text-xs text-gray-600">Contacts</div>
                </div>
                <div className="bg-green-50 p-2 rounded" data-testid={`member-appointments-${node.id}`}>
                  <div className="font-semibold">{node.stats.appointments}</div>
                  <div className="text-xs text-gray-600">Appointments</div>
                </div>
                <div className="bg-purple-50 p-2 rounded" data-testid={`member-presentations-${node.id}`}>
                  <div className="font-semibold">{node.stats.presentations}</div>
                  <div className="text-xs text-gray-600">Presentations</div>
                </div>
                <div className="bg-pink-50 p-2 rounded" data-testid={`member-sales-${node.id}`}>
                  <div className="font-semibold">{node.stats.sales}</div>
                  <div className="text-xs text-gray-600">Sales</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-lg" data-testid="team-view-loading">
        <CardContent className="p-8 text-center">Loading team hierarchy...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg" data-testid="team-view-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="team-view-title">
          <Users className="text-blue-600" />
          Team Hierarchy
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hierarchy ? renderNode(hierarchy) : <div>No team data available</div>}
      </CardContent>
    </Card>
  );
};

export default TeamView;