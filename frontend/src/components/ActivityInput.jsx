import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, Save } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ActivityInput = ({ user }) => {
  // Get today's date in local timezone
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [activity, setActivity] = useState({
    contacts: 0,
    appointments: 0,
    presentations: 0,
    referrals: 0,
    testimonials: 0,
    apps: 0,
    sales: 0,
    new_face_sold: 0,
    bankers_premium: 0,
    premium: 0
  });
  const [loading, setLoading] = useState(false);
  const [showNewFaceForm, setShowNewFaceForm] = useState(false);
  const [newFaceCustomers, setNewFaceCustomers] = useState([]);
  const [newFaceForm, setNewFaceForm] = useState({
    customer_name: '',
    county: '',
    policy_amount: ''
  });

  useEffect(() => {
    fetchActivity();
    fetchNewFaceCustomers();
  }, [selectedDate]);

  const fetchNewFaceCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/new-face-customers/date/${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewFaceCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch new face customers');
    }
  };

  const fetchActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/activities/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dayActivity = response.data.find(a => a.date === selectedDate);
      if (dayActivity) {
        setActivity({
          contacts: dayActivity.contacts,
          appointments: dayActivity.appointments,
          presentations: dayActivity.presentations,
          referrals: dayActivity.referrals,
          testimonials: dayActivity.testimonials,
          apps: dayActivity.apps || 0,
          sales: dayActivity.sales,
          new_face_sold: dayActivity.new_face_sold,
          bankers_premium: dayActivity.bankers_premium || 0,
          premium: dayActivity.premium
        });
      } else {
        setActivity({
          contacts: 0,
          appointments: 0,
          presentations: 0,
          referrals: 0,
          testimonials: 0,
          apps: 0,
          sales: 0,
          new_face_sold: 0,
          bankers_premium: 0,
          premium: 0
        });
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Clean and parse all values before sending
      const cleanedActivity = {
        contacts: parseFloat(activity.contacts) || 0,
        appointments: parseFloat(activity.appointments) || 0,
        presentations: parseFloat(activity.presentations) || 0,
        referrals: parseInt(activity.referrals) || 0,
        testimonials: parseInt(activity.testimonials) || 0,
        sales: parseInt(activity.sales) || 0,
        new_face_sold: parseFloat(activity.new_face_sold) || 0,
        premium: parseFloat(activity.premium) || 0
      };
      
      await axios.put(`${API}/activities/${selectedDate}`, {
        date: selectedDate,
        ...cleanedActivity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Activity saved successfully!');
      // Refresh the activity to show updated data
      fetchActivity();
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save activity';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveNewFaceCustomer = async () => {
    if (!newFaceForm.customer_name || !newFaceForm.county || !newFaceForm.policy_amount) {
      toast.error('Please fill all customer fields');
      return;
    }

    if (newFaceCustomers.length >= 3) {
      toast.error('Maximum 3 new face customers per day');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/new-face-customers`, {
        date: selectedDate,
        customer_name: newFaceForm.customer_name,
        county: newFaceForm.county,
        policy_amount: parseFloat(newFaceForm.policy_amount) || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('New face customer added!');
      setNewFaceForm({ customer_name: '', county: '', policy_amount: '' });
      setShowNewFaceForm(false);
      fetchNewFaceCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const deleteNewFaceCustomer = async (customerId) => {
    if (!window.confirm('Delete this customer record?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/new-face-customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Customer deleted');
      fetchNewFaceCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const categories = [
    { key: 'contacts', label: 'Contacts', icon: '📞' },
    { key: 'appointments', label: 'Appointments', icon: '📅' },
    { key: 'presentations', label: 'Presentations', icon: '📊' },
    { key: 'referrals', label: 'Referrals', icon: '🤝' },
    { key: 'testimonials', label: 'Testimonials', icon: '⭐' },
    { key: 'sales', label: 'Sales', icon: '💰' },
    { key: 'new_face_sold', label: 'New Face Sold', icon: '🎯' },
    { key: 'premium', label: 'Total Premium ($)', icon: '💵' }
  ];

  return (
    <Card className="shadow-lg bg-white" data-testid="activity-input-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl" data-testid="activity-title">
          <Calendar className="text-blue-600" size={24} />
          Daily Activity Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div className="space-y-2">
          <Label htmlFor="date" className="text-base font-semibold">Select Date</Label>
          <Input
            id="date"
            data-testid="date-input"
            type="date"
            value={selectedDate}
            max={getLocalDate()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full max-w-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {categories.map(cat => (
            <div key={cat.key} className="space-y-2">
              <Label htmlFor={cat.key} data-testid={`${cat.key}-label`} className="text-sm font-medium">
                {cat.icon} {cat.label}
              </Label>
              <Input
                id={cat.key}
                data-testid={`${cat.key}-input`}
                type="number"
                min="0"
                step={
                  cat.key === 'premium' ? '0.01' : 
                  (cat.key === 'presentations' || cat.key === 'contacts' || cat.key === 'appointments' || cat.key === 'new_face_sold') ? '0.5' : 
                  '1'
                }
                value={activity[cat.key] === 0 ? '' : activity[cat.key]}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string, otherwise parse the number
                  if (value === '') {
                    setActivity({ ...activity, [cat.key]: 0 });
                  } else {
                    const parsed = parseFloat(value);
                    setActivity({ ...activity, [cat.key]: isNaN(parsed) ? 0 : parsed });
                  }
                }}
                onBlur={(e) => {
                  // On blur, ensure we have a valid number
                  const value = e.target.value;
                  if (value === '' || isNaN(parseFloat(value))) {
                    setActivity({ ...activity, [cat.key]: 0 });
                  }
                }}
                placeholder="0"
                className="w-full"
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          data-testid="save-activity-btn"
          className="w-full flex items-center justify-center gap-2 mt-6 py-6 text-base"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Activity'}
        </Button>

        {/* New Face Customer Tracking */}
        {activity.new_face_sold > 0 && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              🎯 New Face Customer Details ({newFaceCustomers.length}/3)
            </h3>
            
            {/* Show existing customers for this date */}
            {newFaceCustomers.length > 0 && (
              <div className="mb-4 space-y-2">
                {newFaceCustomers.map((customer) => (
                  <div key={customer.id} className="p-3 bg-white rounded border border-green-200 flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{customer.customer_name}</div>
                      <div className="text-sm text-gray-600">County: {customer.county} | Policy: ${customer.policy_amount.toLocaleString()}</div>
                    </div>
                    <Button
                      onClick={() => deleteNewFaceCustomer(customer.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {newFaceCustomers.length < 3 && !showNewFaceForm && (
              <Button
                onClick={() => setShowNewFaceForm(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                + Add Customer Details
              </Button>
            )}

            {showNewFaceForm && (
              <div className="space-y-3 p-4 bg-white rounded border border-green-300">
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={newFaceForm.customer_name}
                    onChange={(e) => setNewFaceForm({...newFaceForm, customer_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>County</Label>
                  <Input
                    value={newFaceForm.county}
                    onChange={(e) => setNewFaceForm({...newFaceForm, county: e.target.value})}
                    placeholder="County name"
                  />
                </div>
                <div>
                  <Label>Policy Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newFaceForm.policy_amount}
                    onChange={(e) => setNewFaceForm({...newFaceForm, policy_amount: e.target.value})}
                    placeholder="5000.00"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={saveNewFaceCustomer}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Save Customer
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNewFaceForm(false);
                      setNewFaceForm({ customer_name: '', county: '', policy_amount: '' });
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityInput;