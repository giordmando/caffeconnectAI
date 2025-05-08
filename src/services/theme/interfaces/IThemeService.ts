import { ThemeColors } from "./IThemeColors";

/**
 * Interfaccia per il servizio di gestione del tema
 */
export interface IThemeService {
  /**
   * Ottiene il tema corrente
   */
  getCurrentTheme(): ThemeColors;

  /**
   * Applica un tema personalizzato
   * @param theme Tema personalizzato
   */
  applyTheme(theme: Partial<ThemeColors>): void;

  /**
   * Ripristina il tema predefinito
   */
  resetTheme(): void;

  /**
   * Genera un tema basato su un colore primario
   * @param primaryColor Colore primario in formato esadecimale
   */
  generateThemeFromColor(primaryColor: string): ThemeColors;
}