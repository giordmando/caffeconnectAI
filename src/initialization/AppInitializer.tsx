import React from 'react';
import { useServices } from '../contexts/ServiceProvider';
import LoadingScreen from '../components/LoadingScreen';

interface AppInitializerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children, fallback }) => {
  const { isInitialized, initializationError, reloadServices, appConfig } = useServices();
  const [progress, setProgress] = React.useState(0);
  const [showLoader, setShowLoader] = React.useState(true);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isInitialized && !initializationError) {
      // Simula progressione per UI
      setShowLoader(true);
      setProgress(10); // Start
      timer = setTimeout(() => setProgress(50), 300);
      timer = setTimeout(() => setProgress(80), 800);
    } else {
      setProgress(100);
      // Attendi un breve istante per mostrare il 100% prima di nascondere
      timer = setTimeout(() => setShowLoader(false), 300);
    }
    return () => clearTimeout(timer);
  }, [isInitialized, initializationError]);

  const businessName = appConfig?.business?.name || 'CaféConnect AI';

  if (showLoader || (!isInitialized && !initializationError)) {
    return (
      <LoadingScreen
        businessName={businessName}
        progress={progress}
        error={initializationError} // Passa l'errore solo se esiste
        onRetry={reloadServices}
      />
    );
  }

  if (initializationError) {
    // Se c'è un errore E il loader non è più mostrato,
    // mostra il fallback (se fornito) o un messaggio di errore predefinito.
    // LoadingScreen con errore è già gestito sopra se showLoader è true.
    return <>{fallback || <p>Impossibile caricare l'applicazione: {initializationError}</p>}</>;
  }

  // Se inizializzato e nessun errore
  return <>{children}</>;
};

export default AppInitializer;