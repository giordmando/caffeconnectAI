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