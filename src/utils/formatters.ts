
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
  
  

  

