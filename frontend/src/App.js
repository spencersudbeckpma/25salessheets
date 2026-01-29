import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { Toaster } from './components/ui/sonner';
import { BrandingProvider } from './contexts/BrandingContext';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState(null);
  const [features, setFeatures] = useState(null);
  const [uiSettings, setUiSettings] = useState(null);
  const [viewSettings, setViewSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setUser(res.data);
          // Fetch branding and features after getting user
          return Promise.all([
            axios.get(`${API}/auth/branding`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/teams/my-features`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
        })
        .then(([brandingRes, featuresRes]) => {
          setBranding(brandingRes.data);
          setFeatures(featuresRes.data.features);
          setUiSettings(featuresRes.data.ui_settings);
          setViewSettings(featuresRes.data.view_settings);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Handler to update branding and features (called from Login)
  const handleSetBranding = (data) => {
    // Maintain consistent format: { branding: {...}, team_name: "..." }
    if (data) {
      setBranding({
        branding: data.branding,
        team_name: data.team_name
      });
    }
    if (data.features) setFeatures(data.features);
    if (data.ui_settings) setUiSettings(data.ui_settings);
    if (data.view_settings) setViewSettings(data.view_settings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <BrandingProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login setUser={setUser} setBranding={handleSetBranding} />}
          />
          <Route
            path="/*"
            element={user ? <Dashboard user={user} setUser={setUser} branding={branding} setBranding={setBranding} features={features} uiSettings={uiSettings} /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </BrandingProvider>
  );
}

export default App;