import { useEffect, useMemo } from 'react';
import { DeduplicationRule } from '../services/ui/compstore/ComponentDeduplicator';
import { ComponentManager } from '../services/ui/compstore/ComponentManager';


export function useComponentManager(customRules?: DeduplicationRule[]) {
  const componentManager = useMemo(() => {
    return new ComponentManager(customRules);
  }, []); // Crea una sola volta
  
  // Cleanup periodico
  useEffect(() => {
    const cleanup = setInterval(() => {
      componentManager.cleanupOldComponents(3600000); // 1 ora
    }, 300000); // ogni 5 minuti
    
    return () => clearInterval(cleanup);
  }, [componentManager]);
  
  return componentManager;
}
