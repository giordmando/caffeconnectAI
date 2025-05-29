import { useState, useCallback } from 'react';
import { AppConfig } from '../../config/interfaces/IAppConfig';
import { configManager } from '../../config/ConfigManager';

export const useConfigState = () => {
  const [config, setConfig] = useState<AppConfig>(configManager.getConfig());
  const [isDirty, setIsDirty] = useState(false);

  const updateSection = useCallback((section: keyof AppConfig, field: string, value: any) => {
    setConfig(prevConfig => {
      const newConfig = JSON.parse(JSON.stringify(prevConfig)) as AppConfig;
      
      if (field.includes('.')) {
        const parts = field.split('.');
        let current: any = newConfig[section];
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        (newConfig[section] as any)[field] = value;
      }
      
      return newConfig;
    });
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    Object.keys(config).forEach(section => {
      configManager.updateSection(section as keyof AppConfig, (config as any)[section]);
    });
    setIsDirty(false);
  }, [config]);

  return {
    config,
    updateSection,
    isDirty,
    save
  };
};