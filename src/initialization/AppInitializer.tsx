import React, { useState, useEffect } from 'react';
import { useServices } from '../contexts/ServiceProvider';
import { configManager } from '../config/ConfigManager';
import LoadingScreen from '../components/LoadingScreen';

interface AppInitializerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente che gestisce l'inizializzazione dell'applicazione
 * Mostra una schermata di caricamento durante l'inizializzazione dei servizi
 * e gestisce gli errori di inizializzazione
 */
const AppInitializer: React.FC<AppInitializerProps> = ({ 
  children, 
  fallback 
}) => {
  // Stati di inizializzazione
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Ottieni i servizi dal context
  const { 
    isInitialized,
    initializationError,
    reloadServices
  } = useServices();
  
  // Simulazione di un progressivo caricamento per UX migliore
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      // Incrementa progressivamente fino all'80% se non è ancora inizializzato
      if (!isInitialized && progress < 80) {
        progress += Math.random() * 5;
        setLoadingProgress(Math.min(progress, 80));
      } 
      // Salta al 100% quando è inizializzato
      else if (isInitialized) {
        setLoadingProgress(100);
        
        // Aggiungi un breve ritardo prima di nascondere il loader per effetti visivi
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
        
        clearInterval(interval);
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, [isInitialized]);
  
  // Gestione errori di inizializzazione
  useEffect(() => {
    if (initializationError) {
      setInitError(initializationError);
      setLoadingProgress(100);
      
      // Aggiungi un breve ritardo prima di nascondere il loader
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, [initializationError]);
  
  // Gestione retry in caso di errore
  const handleRetry = async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setInitError(null);
    
    try {
      await reloadServices();
    } catch (error) {
      console.error('Errore nel tentativo di reinizializzazione:', error);
      setInitError(error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };
  
  // Mostra loading screen
  if (isLoading) {
    // Usa il business name dalla configurazione per personalizzare il loading
    const businessName = configManager.getSection('business').name || 'CaféConnect';
    
    return (
      <LoadingScreen 
        businessName={businessName}
        progress={loadingProgress}
        error={initError}
        onRetry={handleRetry}
      />
    );
  }
  
  // Mostra fallback in caso di errore persistente
  if (initError && fallback) {
    return <>{fallback}</>;
  }
  
  // Tutto ok, mostra l'applicazione
  return <>{children}</>;
};

export default AppInitializer;