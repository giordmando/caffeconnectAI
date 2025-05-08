import React, { createContext, useContext, useState, useEffect } from 'react';
import { ICatalogService } from '../services/catalog/interfaces/ICatalogService';
import { catalogService } from '../services/catalog/CatalogService';

// Tipo per il contesto Catalog
interface CatalogContextType {
  catalogService: ICatalogService;
  isInitialized: boolean;
  initializationError: string | null;
  refreshCatalog: () => Promise<void>;
}

// Creazione del contesto
const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

// Provider per i servizi di catalogo
export const CatalogServiceProvider: React.FC<{
  children: React.ReactNode;
  onInitialized?: (catalogService: ICatalogService) => void;
}> = ({ children, onInitialized }) => {
  // Stati per il provider
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Inizializza il servizio di catalogo
  useEffect(() => {
    const initializeCatalog = async () => {
      try {
        await catalogService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing catalog service:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(true); // Continua comunque
      }
    };
    initializeCatalog();
  }, []);

  useEffect(() => {
    if (isInitialized && onInitialized) {
      onInitialized(catalogService);
    }
  }, [isInitialized, onInitialized]);
  // Funzione per aggiornare il catalogo
  const refreshCatalog = async () => {
    try {
      await catalogService.refreshCatalog();
    } catch (error) {
      console.error('Error refreshing catalog:', error);
    }
  };

  // Valore del contesto
  const contextValue: CatalogContextType = {
    catalogService,
    isInitialized,
    initializationError,
    refreshCatalog
  };

  if (!isInitialized) {
    return <div>Initializing Catalog services...</div>;
  }

  return (
    <CatalogContext.Provider value={contextValue}>
      {children}
    </CatalogContext.Provider>
  );
};

// Hook per utilizzare il contesto Catalog
export const useCatalog = (): CatalogContextType => {
  const context = useContext(CatalogContext);
  
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogServiceProvider');
  }
  
  return context;
};