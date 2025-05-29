import { useCallback } from 'react';
import type { AppConfig } from '../../config/interfaces/IAppConfig';

export interface ValidationError {
  section: string;
  field: string;
  message: string;
}

export const useConfigValidation = () => {
  const validateConfig = useCallback((config: AppConfig): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Validate business
    if (!config.business.name) {
      errors.push({
        section: 'business',
        field: 'name',
        message: 'Il nome del business è obbligatorio'
      });
    }
    
    if (!config.business.type) {
      errors.push({
        section: 'business',
        field: 'type',
        message: 'Il tipo di business è obbligatorio'
      });
    }
    
    // Validate theme colors
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(config.business.theme.primaryColor)) {
      errors.push({
        section: 'theme',
        field: 'primaryColor',
        message: 'Colore primario non valido'
      });
    }
    
    // Validate AI
    if (!config.ai.systemPrompt) {
      errors.push({
        section: 'ai',
        field: 'systemPrompt',
        message: 'System prompt è obbligatorio'
      });
    }
    
    // Validate catalog
    if (!config.catalog.enableLocalData) {
      if (!config.catalog.menuEndpoint) {
        errors.push({
          section: 'catalog',
          field: 'menuEndpoint',
          message: 'Endpoint menu richiesto quando dati locali disabilitati'
        });
      }
    }
    
    return errors;
  }, []);
  
  const validateSection = useCallback((
    section: keyof AppConfig,
    config: AppConfig
  ): ValidationError[] => {
    const allErrors = validateConfig(config);
    return allErrors.filter(error => error.section === section);
  }, [validateConfig]);
  
  return {
    validateConfig,
    validateSection
  };
};