import React, { useState, useEffect } from 'react';
import { ConsentLevel } from '../services/analytics/types';
import { IConsentService } from '../services/analytics/interfaces/IConsentService';
import { configManager } from '../config/ConfigManager';

interface ConsentBannerProps {
  consentService: IConsentService;
  onConsentChange: (level: ConsentLevel) => void;
}

export const SimpleConsentBanner: React.FC<ConsentBannerProps> = ({
  consentService,
  onConsentChange
}) => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  // Ottieni la configurazione privacy
  const privacyConfig = configManager.getSection('privacy');
  useEffect(() => {
    // Mostra banner se abilitato e se non c'è consenso o è vecchio
    if (!privacyConfig.enabled) {
      return;
    }
    
    const timestamp = consentService.getConsentTimestamp();
    const needsConsent = !timestamp || 
      (Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000); // 30 giorni
    
    setShowBanner(needsConsent);
  }, [consentService, privacyConfig.enabled]);
  
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
        <h3>{privacyConfig.bannerTitle || 'Preferenze privacy'}</h3>
        <p>{privacyConfig.bannerMessage || 'Utilizziamo i dati di conversazione per migliorare il nostro assistente AI.'}</p>
        
        <div className="consent-buttons">
          <button onClick={handleAcceptMinimal} className="btn-minimal">
            {privacyConfig.consentLabels?.minimal || 'Solo essenziali'}
          </button>
          <button onClick={handleAcceptFunctional} className="btn-functional">
            {privacyConfig.consentLabels?.functional || 'Funzionali'}
          </button>
          <button onClick={handleAcceptAll} className="btn-analytics">
            {privacyConfig.consentLabels?.analytics || 'Tutto (consigliato)'}
          </button>
        </div>
        
        <p className="consent-info">
          {privacyConfig.additionalInfo || 'Con "Tutto" ci aiuti a personalizzare meglio le risposte in base alle tue preferenze.'}
        </p>
        
        {privacyConfig.policyLink && (
          <p className="policy-link">
            <a href={privacyConfig.policyLink} target="_blank" rel="noopener noreferrer">
              Consulta la nostra privacy policy completa
            </a>
          </p>
        )}
      </div>
    </div>
  );
};