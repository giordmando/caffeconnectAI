import { useCallback, useState } from 'react';
import type { AppConfig } from '../../config/interfaces/IAppConfig';
import { configManager } from '../../config/ConfigManager';

export const useConfigPersistence = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  
  const saveConfig = useCallback(async (config: AppConfig) => {
    setIsSaving(true);
    try {
      // Save each section
      Object.keys(config).forEach(section => {
        configManager.updateSection(section as keyof AppConfig, (config as any)[section]);
      });
      
      // Apply theme if changed
      if (config.business.theme) {
        const { themeService } = await import('../../services/theme/ThemeService');
        themeService.applyTheme({
          primaryColor: config.business.theme.primaryColor,
          secondaryColor: config.business.theme.secondaryColor,
          bgColor: config.business.theme.backgroundColor,
          textColor: config.business.theme.textColor
        });
      }
      
      setLastSaveTime(new Date());
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);
  
  const exportConfig = useCallback((config: AppConfig) => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafeconnect-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  
  const importConfig = useCallback(async (file: File): Promise<AppConfig | null> => {
    try {
      const text = await file.text();
      const config = JSON.parse(text) as AppConfig;
      
      // Basic validation
      if (!config.business || !config.ai || !config.catalog) {
        throw new Error('Invalid config format');
      }
      
      return config;
    } catch (error) {
      console.error('Error importing config:', error);
      return null;
    }
  }, []);
  
  return {
    saveConfig,
    exportConfig,
    importConfig,
    isSaving,
    lastSaveTime
  };
};