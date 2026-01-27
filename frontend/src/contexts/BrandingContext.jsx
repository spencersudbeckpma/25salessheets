import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext(null);

const DEFAULT_BRANDING = {
  logo_url: null,
  primary_color: '#1e40af',
  accent_color: '#3b82f6',
  display_name: null,
  tagline: null
};

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [teamName, setTeamName] = useState(null);

  // Apply CSS variables when branding changes
  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', branding.primary_color || DEFAULT_BRANDING.primary_color);
      root.style.setProperty('--brand-accent', branding.accent_color || DEFAULT_BRANDING.accent_color);
      
      // Generate lighter/darker variants
      const primaryHex = branding.primary_color || DEFAULT_BRANDING.primary_color;
      root.style.setProperty('--brand-primary-light', adjustBrightness(primaryHex, 40));
      root.style.setProperty('--brand-primary-dark', adjustBrightness(primaryHex, -20));
      
      const accentHex = branding.accent_color || DEFAULT_BRANDING.accent_color;
      root.style.setProperty('--brand-accent-light', adjustBrightness(accentHex, 40));
      root.style.setProperty('--brand-accent-dark', adjustBrightness(accentHex, -20));
    }
  }, [branding]);

  // Helper function to adjust color brightness
  const adjustBrightness = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  };

  const updateBranding = (newBranding, newTeamName = null) => {
    setBranding(newBranding || DEFAULT_BRANDING);
    if (newTeamName !== null) {
      setTeamName(newTeamName);
    }
  };

  const clearBranding = () => {
    setBranding(DEFAULT_BRANDING);
    setTeamName(null);
    // Reset CSS variables
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', DEFAULT_BRANDING.primary_color);
    root.style.setProperty('--brand-accent', DEFAULT_BRANDING.accent_color);
    root.style.setProperty('--brand-primary-light', adjustBrightness(DEFAULT_BRANDING.primary_color, 40));
    root.style.setProperty('--brand-primary-dark', adjustBrightness(DEFAULT_BRANDING.primary_color, -20));
    root.style.setProperty('--brand-accent-light', adjustBrightness(DEFAULT_BRANDING.accent_color, 40));
    root.style.setProperty('--brand-accent-dark', adjustBrightness(DEFAULT_BRANDING.accent_color, -20));
  };

  const getDisplayName = () => {
    return branding?.display_name || teamName || 'Sales Activity Hub';
  };

  const getTagline = () => {
    return branding?.tagline || '';
  };

  return (
    <BrandingContext.Provider value={{
      branding,
      teamName,
      updateBranding,
      clearBranding,
      getDisplayName,
      getTagline,
      logoUrl: branding?.logo_url
    }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export default BrandingContext;
