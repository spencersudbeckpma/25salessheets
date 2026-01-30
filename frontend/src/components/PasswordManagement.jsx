import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { UserX, Key, RefreshCw, Users, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PasswordManagement = ({ user }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin-reset');

  // Check if user can do admin reset (state_manager or super_admin)
  const canAdminReset = user.role === 'state_manager' || user.role === 'super_admin';

  // Fetch available users for reset (for state managers and super_admin)
  useEffect(() => {
    if (canAdminReset) {
      fetchAvailableUsers();
    }
  }, [user.role]);

  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableUsers(response.data.managers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAdminReset = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API}/auth/admin-reset-password`, {
        user_id: selectedUser,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data;
      toast.success(
        <div>
          <div className="font-bold">Password Reset Successful!</div>
          <div>User: {userData.user_name}</div>
          <div>Email: {userData.user_email}</div>
          <div className="text-sm mt-1">Tell them to login with the new password</div>
        </div>,
        { duration: 10000 }
      );
      
      // Clear form
      setSelectedUser('');
      setNewPassword('');
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to reset password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      toast.error('Please enter an email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, {
        email: forgotEmail
      });
      
      const data = response.data;
      
      if (data.temporary_password) {
        toast.success(
          <div>
            <div className="font-bold">Temporary Password Generated!</div>
            <div>User: {data.user_name}</div>
            <div className="bg-gray-100 p-2 my-2 rounded font-mono text-lg">
              {data.temporary_password}
            </div>
            <div className="text-sm">{data.instructions}</div>
          </div>,
          { duration: 15000 }
        );
      } else {
        toast.info(data.message);
      }
      
      // Clear form
      setForgotEmail('');
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to generate temporary password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selection */}
      <div className="flex space-x-4 border-b border-gray-200">
        {user.role === 'state_manager' && (
          <button
            onClick={() => setActiveTab('admin-reset')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'admin-reset'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            Admin Reset
          </button>
        )}
        <button
          onClick={() => setActiveTab('forgot-password')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'forgot-password'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Key size={18} className="inline mr-2" />
          Forgot Password
        </button>
      </div>

      {/* Admin Reset Password (State Managers Only) */}
      {activeTab === 'admin-reset' && user.role === 'state_manager' && (
        <Card className="shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="text-red-600" />
              Admin Password Reset
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Reset passwords for team members who forgot their credentials
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminReset} className="space-y-4">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Choose a team member...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.role} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter new password for the user"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw size={18} className="mr-2" />
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Forgot Password */}
      {activeTab === 'forgot-password' && (
        <Card className="shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Key className="text-blue-600" />
              Forgot Password
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Generate a temporary password for users who forgot their credentials
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter user's email address"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail size={18} className="mr-2" />
                {loading ? 'Generating...' : 'Generate Temporary Password'}
              </Button>
            </form>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">📋 How it Works</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Enter the user's email address</li>
                <li>• System generates a temporary 8-character password</li>
                <li>• Share the temporary password with the user securely</li>
                <li>• User logs in with temporary password</li>
                <li>• User immediately changes to a permanent password</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Restrictions */}
      {user.role !== 'state_manager' && activeTab === 'admin-reset' && (
        <Card className="shadow-lg bg-white border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-yellow-700">
              <UserX size={24} />
              <div>
                <h3 className="font-semibold">Access Restricted</h3>
                <p className="text-sm">Only State Managers can reset passwords for team members.</p>
                <p className="text-sm mt-1">You can still use the "Forgot Password" feature or change your own password.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">🔐 Security Best Practices</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Always share passwords through secure channels (not email/text)</li>
          <li>• Encourage users to change temporary passwords immediately</li>
          <li>• Use strong passwords with numbers, letters, and special characters</li>
          <li>• Never share your own admin credentials</li>
          <li>• Report any suspicious password reset requests</li>
        </ul>
      </div>
    </div>
  );
};

export default PasswordManagement;