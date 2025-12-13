import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Label } from './ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('agent');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyInvite = async () => {
    if (!inviteCode) {
      toast.error('Please enter an invite code');
      return;
    }
    try {
      const response = await axios.get(`${API}/invites/verify/${inviteCode}`);
      setInviteData(response.data);
      setEmail(response.data.email);
      setName(response.data.name);
      setRole(response.data.role);
      toast.success('Invite code verified!');
    } catch (error) {
      toast.error('Invalid invite code');
      setInviteData(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Debug logging
        console.log('Login attempt with:', { email, passwordLength: password.length });
        const response = await axios.post(`${API}/auth/login`, { email, password });
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        toast.success('Login successful!');
      } else {
        const response = await axios.post(`${API}/auth/register`, {
          email,
          password,
          name,
          role,
          invite_code: inviteCode || null
        });
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        toast.success('Registration successful!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg" data-testid="login-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center" data-testid="login-title">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-center" data-testid="login-description">
            {isLogin ? 'Login to your CRM Sales Tracker account' : 'Register for CRM Sales Tracker'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-code"
                      data-testid="invite-code-input"
                      placeholder="Enter invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      disabled={inviteData !== null}
                    />
                    <Button
                      type="button"
                      data-testid="verify-invite-btn"
                      onClick={handleVerifyInvite}
                      disabled={inviteData !== null}
                    >
                      Verify
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    data-testid="name-input"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={inviteData !== null}
                    required
                  />
                </div>

                {!inviteData && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      data-testid="role-select"
                      className="w-full p-2 border rounded-md"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="agent">Agent</option>
                      <option value="district_manager">District Manager</option>
                      <option value="regional_manager">Regional Manager</option>
                      <option value="state_manager">State Manager</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email or Username</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="text"
                placeholder="email@example.com or username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Show quick login if user starts typing 'spencer'
                  if (e.target.value.toLowerCase().includes('spencer')) {
                    setShowQuickLogin(true);
                  } else {
                    setShowQuickLogin(false);
                  }
                }}
                disabled={inviteData !== null}
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <Button
              type="submit"
              data-testid="submit-btn"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              data-testid="toggle-mode-btn"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => {
                setIsLogin(!isLogin);
                setInviteData(null);
                setInviteCode('');
              }}
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;