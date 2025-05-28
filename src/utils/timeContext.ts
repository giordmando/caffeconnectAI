/**
 * Utility per gestire il contesto temporale nell'applicazione
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/**
 * Determina il momento della giornata in base all'ora corrente
 * @returns 'morning', 'afternoon', o 'evening'
 */
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

/**
 * Determina se il locale è aperto in base all'ora corrente
 * @returns true se il locale è aperto, false altrimenti
 */
export function isVenueOpen(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Domenica, 6 = Sabato
  
  if (day >= 1 && day <= 5) { // Lunedì-Venerdì
    return hour >= 7 && hour < 22;
  } else { // Sabato-Domenica
    return hour >= 8 && hour < 23;
  }
}

/**
 * Ottiene il saluto appropriato in base all'ora del giorno
 * @returns Una stringa di saluto
 */
export function getGreeting(): string {
  const timeOfDay = getTimeOfDay();
  
  switch (timeOfDay) {
    case 'morning':
      return 'Buongiorno';
    case 'afternoon':
      return 'Buon pomeriggio';
    case 'evening':
      return 'Buonasera';
    default:
      return 'Benvenuto';
  }
}

/**
 * Formatta una data nel formato italiano
 * @param date La data da formattare
 * @returns La data formattata (es. "15 marzo 2023")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  
  return d.toLocaleDateString('it-IT', options);
}

/**
 * Formatta un'ora nel formato italiano
 * @param date La data da cui estrarre l'ora
 * @returns L'ora formattata (es. "14:30")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  };
  
  return d.toLocaleTimeString('it-IT', options);
}

/**
 * Ottiene un suggerimento in base al momento della giornata
 * @returns Un suggerimento sul menu
 */
export function getTimeBasedSuggestion(): string {
  const timeOfDay = getTimeOfDay();
  
  switch (timeOfDay) {
    case 'morning':
      return 'È un ottimo momento per una colazione energetica. Che ne dici di un cappuccino con cornetto?';
    case 'afternoon':
      return 'Per pranzo oggi abbiamo ottime insalate e panini freschi.';
    case 'evening':
      return 'È il momento perfetto per un aperitivo. Prova il nostro Aperol Spritz con tagliere!';
    default:
      return "Dai un'occhiata al nostro menu per scoprire le specialità del giorno.";
  }
}