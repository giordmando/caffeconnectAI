import React from 'react';

interface LoadingScreenProps {
  businessName: string;
  progress: number;
  onRetry: () => Promise<void>;
  error?: string | null; // Added the error property
}

/**
 * Componente che mostra una schermata di caricamento animata
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ businessName }) => {
  return (
    <div className="loading-screen">
      <div className="loading-logo-container">
        <div className="loading-spinner"></div>
      </div>
      
      <h1 className="loading-title">{businessName}</h1>
      <p className="loading-message">Inizializzazione in corso...</p>
      
      <div className="loading-progress">
        <div className="loading-bar">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;