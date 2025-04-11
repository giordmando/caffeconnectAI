import React from 'react';
import { getTimeOfDay, getGreeting } from '../utils/timeContext';

interface HeaderProps {
  currentProvider: string;
  onConfigClick: () => void;
  userName?: string;
  logoSrc?: string;
}

/**
 * Header dell'applicazione con logo, saluto e impostazioni AI
 */
export const Header: React.FC<HeaderProps> = ({
  currentProvider,
  onConfigClick,
  userName = 'Ospite',
  logoSrc = '/logo.svg'
}) => {
  const greeting = getGreeting();
  const timeOfDay = getTimeOfDay();
  
  // Determina l'icona per il provider AI
  const getProviderIcon = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return '🤖'; // O un'icona specifica per OpenAI
      case 'claude':
        return '🧠'; // O un'icona specifica per Claude
      case 'gemini':
        return '✨'; // O un'icona specifica per Gemini
      case 'mock ai':
        return '🎮'; // Icona per modalità demo
      default:
        return '🤖';
    }
  };
  
  return (
    <header className="app-header">
      <div className="logo">
        <img src={logoSrc} alt="CaféConnect" />
        <h1>CaféConnect</h1>
      </div>
      
      <div className="greeting">
        <span className="greeting-text">{greeting}, {userName}!</span>
        {timeOfDay === 'morning' && <span className="time-emoji">☕</span>}
        {timeOfDay === 'afternoon' && <span className="time-emoji">🌞</span>}
        {timeOfDay === 'evening' && <span className="time-emoji">🌙</span>}
      </div>
      
      <div className="header-actions">
        <div className="provider-info">
          <span className="provider-icon">{getProviderIcon(currentProvider)}</span>
          <span className="provider-label">AI:</span>
          <span className="provider-name">{currentProvider}</span>
        </div>
        
        <button 
          className="config-button"
          onClick={onConfigClick}
          aria-label="Configurazione AI"
        >
          <span className="config-icon">⚙️</span>
          <span className="config-text">Configurazione AI</span>
        </button>
      </div>
    </header>
  );
};

/**
 * Versione semplificata dell'header per dispositivi mobili
 */
export const MobileHeader: React.FC<HeaderProps> = ({
  currentProvider,
  onConfigClick,
  logoSrc = '/logo.svg'
}) => {
  return (
    <header className="mobile-header">
      <div className="mobile-logo">
        <img src={logoSrc} alt="CaféConnect" className="mobile-logo-img" />
      </div>
      
      <div className="mobile-actions">
        <div className="mobile-provider">
          <span className="provider-icon">{currentProvider === 'openai' ? '🤖' : '🧠'}</span>
        </div>
        
        <button 
          className="mobile-config-button"
          onClick={onConfigClick}
          aria-label="Configurazione AI"
        >
          <span className="config-icon">⚙️</span>
        </button>
      </div>
    </header>
  );
};

export default Header;