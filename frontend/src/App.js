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
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Add timeout to prevent infinite loading
      const timeout = 15000; // 15 seconds
      
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: timeout
      })
        .then(res => {
          setUser(res.data);
          // Fetch branding and features after getting user
          return Promise.all([
            axios.get(`${API}/auth/branding`, { headers: { Authorization: `Bearer ${token}` }, timeout: timeout }),
            axios.get(`${API}/teams/my-features`, { headers: { Authorization: `Bearer ${token}` }, timeout: timeout })
          ]);
        })
        .then(([brandingRes, featuresRes]) => {
          setBranding(brandingRes.data);
          setFeatures(featuresRes.data.features);
          setUiSettings(featuresRes.data.ui_settings);
          setViewSettings(featuresRes.data.view_settings);
          setLoading(false);
        })
        .catch((error) => {
          console.error('[APP_LOAD_ERROR]', {
            code: error.code,
            message: error.message,
            online: navigator.onLine
          });
          localStorage.removeItem('token');
          
          // Set error message for user
          if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
            setLoadError('Connection failed. Please check your network and try again.');
          }
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-xl font-semibold text-gray-700 mb-4">Loading...</div>
        <div className="text-sm text-gray-500">Connecting to server...</div>
      </div>
    );
  }

  // Show error screen if connection failed
  if (loadError && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-xl font-semibold text-gray-800 mb-2">Connection Problem</div>
          <div className="text-gray-600 mb-4">{loadError}</div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                setLoadError(null);
              }}
              className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go to Login
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>If this keeps happening:</p>
            <p>• Try switching from Wi-Fi to mobile data</p>
            <p>• Check if your network blocks certain sites</p>
          </div>
        </div>
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
            element={user ? <Dashboard user={user} setUser={setUser} branding={branding} setBranding={setBranding} features={features} uiSettings={uiSettings} viewSettings={viewSettings} /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </BrandingProvider>
  );
}

export default App;