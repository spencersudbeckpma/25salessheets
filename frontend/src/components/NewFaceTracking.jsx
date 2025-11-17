import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NewFaceTracking = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchAllCustomers();
  }, []);

  const fetchAllCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/new-face-customers/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.county.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !filterDate || customer.date === filterDate;
    
    return matchesSearch && matchesDate;
  });

  // Group by agent
  const groupedByAgent = filteredCustomers.reduce((acc, customer) => {
    if (!acc[customer.user_name]) {
      acc[customer.user_name] = [];
    }
    acc[customer.user_name].push(customer);
    return acc;
  }, {});

  return (
    <Card className="shadow-lg bg-white">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          🎯 New Face Customer Tracking
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          All new face customers sold by your team
        </p>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Search (Customer, County, or Agent)</Label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
            />
          </div>
          <div>
            <Label>Filter by Date</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{filteredCustomers.length}</div>
            <div className="text-sm text-gray-600">Total Customers</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              ${filteredCustomers.reduce((sum, c) => sum + c.policy_amount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Policy Amount</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{Object.keys(groupedByAgent).length}</div>
            <div className="text-sm text-gray-600">Agents with Sales</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || filterDate ? 'No customers match your filters' : 'No new face customers yet'}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByAgent).map(([agentName, agentCustomers]) => (
              <div key={agentName} className="border-2 border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2">
                  👤 {agentName}
                  <span className="text-sm text-gray-600">
                    ({agentCustomers.length} {agentCustomers.length === 1 ? 'customer' : 'customers'})
                  </span>
                </h3>
                <div className="space-y-2">
                  {agentCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-3 bg-green-50 rounded border border-green-200 grid grid-cols-1 md:grid-cols-4 gap-2"
                    >
                      <div>
                        <div className="text-xs text-gray-500">Customer</div>
                        <div className="font-semibold">{customer.customer_name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">County</div>
                        <div>{customer.county}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Policy Amount</div>
                        <div className="font-semibold text-green-700">${customer.policy_amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Date</div>
                        <div>{customer.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewFaceTracking;
