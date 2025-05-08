import React from 'react';
import { BaseChatInterfaceProps, BaseChatInterface } from './BaseChatInterface';
import { NLPInsightsPanel } from './ui/nlp/NLPInsightsPanel';
import { SimpleConsentBanner } from './SimpleConsentBanner';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { ConsentLevel } from '../services/analytics/types';

/**
 * Factory per creare interfacce di chat con funzionalità a scelta
 * Utilizza il pattern di composizione per combinare diverse funzionalità
 */
export const createChatInterface = (options: {
  withNLP?: boolean;
  withConsent?: boolean;
  customClassName?: string;
}) => {
  // Servizio di consenso condiviso
  const consentService = new SimpleConsentService();
  
  /**
   * Componente di chat configurabile
   * Assemblato con le funzionalità scelte nelle opzioni
   */
  const ConfigurableChatInterface: React.FC<BaseChatInterfaceProps> = (props) => {
    // Gestione consenso
    const handleConsentChange = async (level: ConsentLevel) => {
      console.log(`Consenso aggiornato: ${level}`);
    };
    
    return (
      <div className={`chat-interface-container ${options.customClassName || ''}`}>
        {/* Componente base sempre presente */}
        <BaseChatInterface 
          {...props} 
          enableNLP={options.withNLP}
        />
        
        {/* Componenti aggiuntivi basati sulle opzioni */}
        {options.withNLP && props.enableNLP && (
          <NLPInsightsPanel 
            components={[]} // Da popolare in base agli insights dell'analisi
            onAction={(action, payload) => console.log(action, payload)}
          />
        )}
        
        {options.withConsent && (
          <SimpleConsentBanner 
            consentService={consentService}
            onConsentChange={handleConsentChange}
          />
        )}
      </div>
    );
  };
  
  return ConfigurableChatInterface;
};

/**
 * Esempi di utilizzo pre-configurati
 */
export const StandardChatInterface = createChatInterface({
  withConsent: true
});

export const AdvancedChatInterface = createChatInterface({
  withNLP: true,
  withConsent: true,
  customClassName: 'advanced-chat'
});

export const MinimalChatInterface = createChatInterface({});

// Utilizzo semplificato con tutte le funzionalità
export default AdvancedChatInterface;