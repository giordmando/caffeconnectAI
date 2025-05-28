// src/components/pwa/InstallBanner.tsx
import React, { useState, useEffect } from 'react';
import { pwaService } from '../../services/pwa/PWAService';
import './pwa.css';

export const InstallBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
    
    // Subscribe to install ready
    const unsubscribe = pwaService.onInstallReady(() => {
      setShowBanner(true);
    });
    
    // Check if can install immediately
    if (pwaService.canInstall()) {
      setShowBanner(true);
    }
    
    return unsubscribe;
  }, []);
  
  const handleInstall = async () => {
    const installed = await pwaService.install();
    if (installed) {
      setShowBanner(false);
    }
  };
  
  const handleDismiss = () => {
    setShowBanner(false);
    // Save dismissal in localStorage
    localStorage.setItem('installBannerDismissed', 'true');
  };
  
  if (!showBanner) return null;
  
  if (isIOS) {
    return (
      <div className="install-banner ios">
        <div className="install-content">
          <div className="install-icon">📱</div>
          <div className="install-text">
            <h3>Installa CaféConnect</h3>
            <p>
              Tocca <span className="ios-share">􀈂</span> e poi 
              "Aggiungi alla schermata Home"
            </p>
          </div>
          <button className="dismiss-btn" onClick={handleDismiss}>×</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="install-banner">
      <div className="install-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          <h3>Installa CaféConnect</h3>
          <p>Installa l'app per un'esperienza migliore</p>
        </div>
        <div className="install-actions">
          <button className="install-btn" onClick={handleInstall}>
            Installa
          </button>
          <button className="dismiss-btn" onClick={handleDismiss}>
            Non ora
          </button>
        </div>
      </div>
    </div>
  );
};