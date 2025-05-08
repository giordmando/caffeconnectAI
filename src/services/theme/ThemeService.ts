// src/services/theme/ThemeService.ts
import { configManager } from '../../config/ConfigManager';
import { ThemeColors } from './interfaces/IThemeColors';
import { IThemeService } from './interfaces/IThemeService';

/**
 * Servizio per gestire il tema dell'applicazione
 */
export class ThemeService implements IThemeService {
  private static instance: ThemeService;
  private currentTheme: ThemeColors;
  
  private constructor() {
    this.currentTheme = this.getDefaultTheme();
    this.applyThemeFromConfig();
  }
  
  /**
   * Ottiene l'istanza singleton
   */
  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }
  
  /**
   * Ottiene il tema corrente
   */
  public getCurrentTheme(): ThemeColors {
    return { ...this.currentTheme };
  }
  
  /**
   * Applica un tema personalizzato
   * @param theme Tema personalizzato
   */
  public applyTheme(theme: Partial<ThemeColors>): void {
    // Unisci il tema personalizzato con quello corrente
    this.currentTheme = { ...this.currentTheme, ...theme };
    
    // Aggiorna le variabili CSS
    this.updateCSSVariables();
    
    console.log('Theme applied:', theme);
  }
  
  /**
   * Ripristina il tema predefinito
   */
  public resetTheme(): void {
    this.currentTheme = this.getDefaultTheme();
    this.updateCSSVariables();
    console.log('Theme reset to default');
  }
  
  /**
   * Genera un tema basato su un colore primario
   * @param primaryColor Colore primario in formato esadecimale
   */
  public generateThemeFromColor(primaryColor: string): ThemeColors {
    // Calcola colori derivati dal colore primario
    const primaryLight = this.lightenColor(primaryColor, 0.2);
    const secondaryColor = this.complementaryColor(primaryColor);
    const bgColor = this.lightenColor(primaryColor, 0.9);
    
    const newTheme: ThemeColors = {
      ...this.currentTheme,
      primaryColor,
      primaryLight,
      secondaryColor,
      bgColor,
      userMessageBg: this.lightenColor(primaryColor, 0.8),
      aiMessageBg: bgColor
    };
    
    return newTheme;
  }
  
  /**
   * Applica il tema dalla configurazione
   */
  private applyThemeFromConfig(): void {
    const businessConfig = configManager.getSection('business');
    const { theme } = businessConfig;
    
    if (theme) {
      const configTheme: Partial<ThemeColors> = {
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        bgColor: theme.backgroundColor,
        textColor: theme.textColor,
      };
      
      // Calcola colori derivati
      configTheme.primaryLight = this.lightenColor(theme.primaryColor, 0.2);
      configTheme.userMessageBg = this.lightenColor(theme.primaryColor, 0.8);
      
      this.applyTheme(configTheme);
    }
  }
  
  /**
   * Aggiorna le variabili CSS con il tema corrente
   */
  private updateCSSVariables(): void {
    const root = document.documentElement;
    
    Object.entries(this.currentTheme).forEach(([key, value]) => {
      // Converti camelCase in kebab-case per CSS
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssVar}`, value);
    });
  }
  
  /**
   * Ottiene il tema predefinito
   */
  private getDefaultTheme(): ThemeColors {
    return {
      primaryColor: '#2a4365',
      primaryLight: '#4a69dd',
      secondaryColor: '#ed8936',
      bgColor: '#f7fafc',
      textColor: '#2d3748',
      lightGray: '#e2e8f0',
      mediumGray: '#a0aec0',
      darkGray: '#4a5568',
      successColor: '#48bb78',
      errorColor: '#e53e3e',
      infoColor: '#4299e1',
      userMessageBg: '#ebf4ff',
      aiMessageBg: '#f7fafc'
    };
  }
  
  /**
   * Schiarisce un colore di una percentuale
   * @param color Colore in formato esadecimale
   * @param amount Percentuale di schiarimento (0-1)
   */
  private lightenColor(color: string, amount: number): string {
    // Rimuovi # se presente
    color = color.replace('#', '');
    
    // Converti in RGB
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);
    
    // Schiarisci
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
    
    // Converti in esadecimale
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  /**
   * Genera un colore complementare
   * @param color Colore in formato esadecimale
   */
  private complementaryColor(color: string): string {
    // Rimuovi # se presente
    color = color.replace('#', '');
    
    // Converti in RGB
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);
    
    // Calcola il complementare (255 - value)
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
    
    // Converti in esadecimale
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

// Esporta l'istanza singleton
export const themeService = ThemeService.getInstance();