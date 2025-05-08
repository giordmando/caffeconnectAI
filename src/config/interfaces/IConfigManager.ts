import { AppConfig } from "./IAppConfig";

/**
 * Interfaccia per il gestore della configurazione dell'applicazione
 */
export interface IConfigManager {
  /**
   * Carica la configurazione da un endpoint remoto
   * @param configUrl URL dell'endpoint di configurazione
   */
  loadConfig(configUrl: string): Promise<void>;

  /**
   * Carica la configurazione da un oggetto locale
   * @param config Oggetto di configurazione
   */
  loadLocalConfig(config: Partial<AppConfig>): void;

  /**
   * Ottiene la configurazione completa
   */
  getConfig(): AppConfig;

  /**
   * Ottiene una sezione specifica della configurazione
   * @param section Nome della sezione
   */
  getSection<K extends keyof AppConfig>(section: K): AppConfig[K];

  /**
   * Aggiorna una parte della configurazione
   * @param section Nome della sezione
   * @param data Nuovi dati
   */
  updateSection<K extends keyof AppConfig>(section: K, data: Partial<AppConfig[K]>): void;
}