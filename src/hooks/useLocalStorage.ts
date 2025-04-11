import { useState, useEffect } from 'react';

/**
 * Hook personalizzato per gestire lo stato persistente nel localStorage
 * @param key La chiave del localStorage
 * @param initialValue Il valore iniziale se non esiste già un valore nel localStorage
 * @returns Uno stato React e una funzione setter, simile a useState
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Stato per memorizzare il valore attuale
  // Passiamo la funzione di inizializzazione a useState così la logica viene eseguita solo una volta
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      // Prova a ottenere il valore da localStorage
      const item = window.localStorage.getItem(key);
      // Analizza il JSON memorizzato o restituisce initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Se c'è un errore, restituisce initialValue
      console.error(`Errore nel recupero di ${key} da localStorage:`, error);
      return initialValue;
    }
  });
  
  // Funzione per aggiornare sia il valore nel localStorage che nello stato React
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Consenti al valore di essere una funzione per avere la stessa API di useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Salva nello stato
      setStoredValue(valueToStore);
      
      // Salva in localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Errore nel salvataggio di ${key} in localStorage:`, error);
    }
  };
  
  // Ascolta i cambiamenti al localStorage da altre schede/finestre
  useEffect(() => {
    // Gestore per l'evento storage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          // Aggiorna lo stato con il nuovo valore
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.error(`Errore nell'aggiornamento dello stato da evento storage:`, error);
        }
      }
    };
    
    // Aggiungi l'ascoltatore
    window.addEventListener('storage', handleStorageChange);
    
    // Rimuovi l'ascoltatore al cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);
  
  return [storedValue, setValue];
}

/**
 * Hook simile a useLocalStorage ma senza persistenza, utile per sviluppo e testing
 * @param key Chiave virtuale (non utilizzata realmente)
 * @param initialValue Valore iniziale
 * @returns Uno stato React e una funzione setter, simile a useState
 */
export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Per semplicità, usa direttamente useState
  // In un'implementazione reale, questo userebbe sessionStorage
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  
  // In un'applicazione reale, potresti voler implementare la persistenza con sessionStorage
  // Qui lo manteniamo semplice per scopi di sviluppo
  
  return [storedValue, setStoredValue];
}

export default useLocalStorage;