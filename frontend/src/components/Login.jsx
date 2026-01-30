import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Label } from './ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ setUser, setBranding }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('agent');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Helper to extract error message from API response
  const getErrorMessage = (error) => {
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      // Handle structured error response
      if (typeof detail === 'object' && detail.message) {
        return detail.message;
      }
      // Handle string error response
      if (typeof detail === 'string') {
        return detail;
      }
    }
    // Network errors
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    // Fallback with more info for debugging
    return `Login failed: ${error.message || 'Unknown error'}`;
  };

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
    setErrorMessage('');

    // Client-side validation
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email or username');
      setLoading(false);
      return;
    }
    
    if (!trimmedPassword) {
      setErrorMessage('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const response = await axios.post(`${API}/auth/login`, { 
          email: trimmedEmail, 
          password: trimmedPassword 
        });
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        // Set branding and features from login response
        if (setBranding) {
          setBranding({
            branding: response.data.branding,
            team_name: response.data.user.team_name,
            features: response.data.features
          });
        }
        toast.success('Login successful!');
      } else {
        const response = await axios.post(`${API}/auth/register`, {
          email: trimmedEmail,
          password: trimmedPassword,
          name,
          role,
          invite_code: inviteCode || null
        });
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        toast.success('Registration successful!');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
      console.error('[LOGIN_ERROR]', {
        status: error.response?.status,
        code: error.response?.data?.detail?.code,
        message: message,
        email: trimmedEmail
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg" data-testid="login-card">
        <CardHeader className="space-y-3">
          <div className="flex justify-center mb-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_0086b560-8cff-4294-89b3-b94a427d032c/artifacts/yzm6empe_image.png" 
              alt="PMAUSA - We Build Leaders" 
              className="h-32 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-slate-800" data-testid="login-title">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-center text-slate-500" data-testid="login-description">
            {isLogin ? 'Sign in to your account' : 'Register for access'}
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
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
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
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                autoComplete="new-password"
                required
              />
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" data-testid="login-error">
                <span className="font-medium">⚠️ </span>{errorMessage}
              </div>
            )}

            <Button
              type="submit"
              data-testid="submit-btn"
              className="w-full bg-slate-800 hover:bg-slate-700"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              data-testid="toggle-mode-btn"
              className="text-sm text-slate-600 hover:underline"
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