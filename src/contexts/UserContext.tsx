import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPreference } from '../types/UserPreference';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Interfaccia per il contesto utente
export interface UserContextData {
  userId: string;
  preferences: UserPreference[];
  interactions: string[];
  lastVisit: string;
  dietaryRestrictions: string[];
  name?: string;
  email?: string;
}

// Interfaccia per le funzioni del contesto
interface UserContextFunctions {
  updatePreference: (preference: UserPreference) => void;
  removePreference: (itemId: string, itemType: string) => void;
  addInteraction: (interaction: string) => void;
  updateDietaryRestrictions: (restrictions: string[]) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  resetContext: () => void;
}

// Tipo per il contesto completo
type UserContextType = UserContextData & UserContextFunctions;

// Valore di default per il contesto
const defaultUserContext: UserContextData = {
  userId: `user-${Math.floor(Math.random() * 10000)}`,
  preferences: [],
  interactions: [],
  lastVisit: new Date().toISOString(),
  dietaryRestrictions: []
};

// Creazione del contesto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider del contesto
export const UserContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Utilizziamo localStorage per persistenza tra sessioni
  const [userData, setUserData] = useLocalStorage<UserContextData>(
    'cafeconnect-user-context',
    defaultUserContext
  );
  
  // Funzione per aggiornare una preferenza
  const updatePreference = (preference: UserPreference) => {
    setUserData(prev => {
      // Cerca se esiste già una preferenza simile
      const existingIndex = prev.preferences.findIndex(
        p => p.itemId === preference.itemId && p.itemType === preference.itemType
      );
      
      const updatedPreferences = [...prev.preferences];
      
      if (existingIndex >= 0) {
        // Aggiorna preferenza esistente
        updatedPreferences[existingIndex] = {
          ...updatedPreferences[existingIndex],
          rating: preference.rating,
          timestamp: Date.now()
        };
      } else {
        // Aggiungi nuova preferenza
        updatedPreferences.push({
          ...preference,
          timestamp: Date.now()
        });
      }
      
      return {
        ...prev,
        preferences: updatedPreferences
      };
    });
  };
  
  // Funzione per rimuovere una preferenza
  const removePreference = (itemId: string, itemType: string) => {
    setUserData(prev => ({
      ...prev,
      preferences: prev.preferences.filter(
        p => !(p.itemId === itemId && p.itemType === itemType)
      )
    }));
  };
  
  // Funzione per aggiungere un'interazione
  const addInteraction = (interaction: string) => {
    setUserData(prev => {
      // Aggiungi all'inizio e mantieni solo le ultime 20
      const updatedInteractions = [
        interaction,
        ...prev.interactions
      ].slice(0, 20);
      
      return {
        ...prev,
        interactions: updatedInteractions,
        lastVisit: new Date().toISOString()
      };
    });
  };
  
  // Funzione per aggiornare le restrizioni dietetiche
  const updateDietaryRestrictions = (restrictions: string[]) => {
    setUserData(prev => ({
      ...prev,
      dietaryRestrictions: restrictions
    }));
  };
  
  // Funzione per impostare il nome
  const setName = (name: string) => {
    setUserData(prev => ({
      ...prev,
      name
    }));
  };
  
  // Funzione per impostare l'email
  const setEmail = (email: string) => {
    setUserData(prev => ({
      ...prev,
      email
    }));
  };
  
  // Funzione per resettare il contesto
  const resetContext = () => {
    // Genera un nuovo ID utente ma mantiene le preferenze e le interazioni
    setUserData({
      ...defaultUserContext,
      userId: `user-${Math.floor(Math.random() * 10000)}`
    });
  };
  
  // Aggiorna lastVisit ad ogni sessione
  useEffect(() => {
    setUserData(prev => ({
      ...prev,
      lastVisit: new Date().toISOString()
    }));
  }, []);
  
  // Oggetto che contiene valori e funzioni del contesto
  const contextValue: UserContextType = {
    ...userData,
    updatePreference,
    removePreference,
    addInteraction,
    updateDietaryRestrictions,
    setName,
    setEmail,
    resetContext
  };
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Hook personalizzato per usare il contesto
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext deve essere usato all\'interno di un UserContextProvider');
  }
  return context;
};

export default UserContext;