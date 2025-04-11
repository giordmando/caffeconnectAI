/**
 * Utility per la formattazione di dati nell'applicazione
 */

/**
 * Formatta un prezzo in formato Euro
 * @param price Il prezzo da formattare
 * @param options Opzioni di formattazione
 * @returns Il prezzo formattato (es. "€9,99")
 */
export function formatPrice(price: number, options: { showCurrency?: boolean } = {}): string {
    const { showCurrency = true } = options;
    
    const formatter = new Intl.NumberFormat('it-IT', {
      style: showCurrency ? 'currency' : 'decimal',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatter.format(price);
  }
  
  /**
   * Formatta una data nel formato italiano
   * @param date La data da formattare
   * @param options Opzioni di formattazione
   * @returns La data formattata (es. "15/03/2023")
   */
  export function formatDate(
    date: Date | string, 
    options: { format?: 'short' | 'medium' | 'long' } = {}
  ): string {
    const { format = 'short' } = options;
    const d = typeof date === 'string' ? new Date(date) : date;
    
    let dateOptions: Intl.DateTimeFormatOptions;
    
    switch (format) {
      case 'long':
        dateOptions = { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        };
        break;
      case 'medium':
        dateOptions = { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        };
        break;
      case 'short':
      default:
        dateOptions = { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        };
        break;
    }
    
    return d.toLocaleDateString('it-IT', dateOptions);
  }
  
  /**
   * Formatta un'ora nel formato italiano
   * @param date La data da cui estrarre l'ora
   * @param options Opzioni di formattazione
   * @returns L'ora formattata (es. "14:30")
   */
  export function formatTime(
    date: Date | string,
    options: { includeSeconds?: boolean } = {}
  ): string {
    const { includeSeconds = false } = options;
    const d = typeof date === 'string' ? new Date(date) : date;
    
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false
    };
    
    return d.toLocaleTimeString('it-IT', timeOptions);
  }
  
  /**
   * Formatta una data relativa (es. "5 minuti fa", "ieri")
   * @param date La data da formattare
   * @returns Una stringa che rappresenta quanto tempo è passato
   */
  export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffSec < 60) {
      return diffSec <= 5 ? 'ora' : `${diffSec} secondi fa`;
    } else if (diffMin < 60) {
      return diffMin === 1 ? 'un minuto fa' : `${diffMin} minuti fa`;
    } else if (diffHour < 24) {
      return diffHour === 1 ? 'un\'ora fa' : `${diffHour} ore fa`;
    } else if (diffDay === 1) {
      return 'ieri';
    } else if (diffDay < 7) {
      return `${diffDay} giorni fa`;
    } else {
      return formatDate(d);
    }
  }
  
  /**
   * Tronca un testo se supera una lunghezza massima
   * @param text Il testo da troncare
   * @param maxLength La lunghezza massima
   * @param suffix Il suffisso da aggiungere (es. "...")
   * @returns Il testo troncato
   */
  export function truncateText(
    text: string, 
    maxLength: number, 
    suffix: string = '...'
  ): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Tronca al carattere di spazio più vicino per evitare di tagliare parole
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 0 && lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + suffix;
    }
    
    return truncated + suffix;
  }
  
  /**
   * Capitalizza la prima lettera di una stringa
   * @param str La stringa da capitalizzare
   * @returns La stringa con la prima lettera maiuscola
   */
  export function capitalize(str: string): string {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Formatta un numero con separatore delle migliaia
   * @param num Il numero da formattare
   * @returns Il numero formattato con separatore delle migliaia
   */
  export function formatNumber(num: number): string {
    return new Intl.NumberFormat('it-IT').format(num);
  }
  
  /**
   * Formatta una categoria in formato leggibile
   * @param category La categoria da formattare
   * @returns La categoria formattata
   */
  export function formatCategory(category: string): string {
    // Mappa delle categorie personalizzate
    const categoryMap: Record<string, string> = {
      'beverage': 'Bevande',
      'food': 'Cibo',
      'coffee': 'Caffè',
      'tea': 'Tè',
      'accessory': 'Accessori',
      'gift': 'Regali'
    };
    
    // Se esiste una mappatura, usala
    if (categoryMap[category]) {
      return categoryMap[category];
    }
    
    // Altrimenti capitalizza e sostituisci underscore con spazi
    return capitalize(category.replace(/_/g, ' '));
  }