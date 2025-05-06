// src/components/SimpleConsentBanner.tsx
import React, { useState, useEffect } from 'react';
import { ConsentLevel } from '../services/analytics/types';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';

interface ConsentBannerProps {
  consentService: SimpleConsentService;
  onConsentChange: (level: ConsentLevel) => void;
}

export const SimpleConsentBanner: React.FC<ConsentBannerProps> = ({
  consentService,
  onConsentChange
}) => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  
  useEffect(() => {
    // Mostra banner se non c'è consenso o è vecchio
    const timestamp = consentService.getConsentTimestamp();
    const needsConsent = !timestamp || 
      (Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000); // 30 giorni
    
    setShowBanner(needsConsent);
  }, [consentService]);
  
  const handleAcceptAll = () => {
    consentService.updateConsent(ConsentLevel.ANALYTICS);
    onConsentChange(ConsentLevel.ANALYTICS);
    setShowBanner(false);
  };
  
  const handleAcceptFunctional = () => {
    consentService.updateConsent(ConsentLevel.FUNCTIONAL);
    onConsentChange(ConsentLevel.FUNCTIONAL);
    setShowBanner(false);
  };
  
  const handleAcceptMinimal = () => {
    consentService.updateConsent(ConsentLevel.MINIMAL);
    onConsentChange(ConsentLevel.MINIMAL);
    setShowBanner(false);
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="consent-banner">
      <div className="consent-content">
        <h3>Preferenze privacy</h3>
        <p>
          Utilizziamo i dati di conversazione per migliorare il nostro assistente AI.
          Scegli il livello di condivisione dati che preferisci:
        </p>
        
        <div className="consent-buttons">
          <button onClick={handleAcceptMinimal} className="btn-minimal">
            Solo essenziali
          </button>
          <button onClick={handleAcceptFunctional} className="btn-functional">
            Funzionali
          </button>
          <button onClick={handleAcceptAll} className="btn-analytics">
            Tutto (consigliato)
          </button>
        </div>
        
        <p className="consent-info">
          Con "Tutto" ci aiuti a personalizzare meglio le risposte in base alle tue preferenze.
        </p>
      </div>
    </div>
  );
};