// Placeholder for mock API implementation
import { MenuItem } from '../types/MenuItem';
import { Product } from '../types/Product';

// Import dei dati mock
import menuItemsData from './mockData/menuItems.json';
import productsData from './mockData/products.json';

/**
 * Simula il recupero degli elementi del menu dal server
 * In un'implementazione reale, questa funzione chiamerebbe un'API esterna
 * @returns Promise che si risolve con gli elementi del menu
 */
export const mockApiGetMenuItems = async (): Promise<MenuItem[]> => {
  console.log('[Mock API] Recupero elementi menu');
  
  // Simuliamo un ritardo di rete
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Filtriamo gli elementi in base all'orario del giorno
  const currentHour = new Date().getHours();
  let timeOfDay: string;
  
  if (currentHour >= 6 && currentHour < 12) {
    timeOfDay = 'morning';
  } else if (currentHour >= 12 && currentHour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }
  
  // Simula un errore casuale in 10% dei casi per testare la gestione degli errori
  //if (Math.random() < 0.1) {
  //  throw new Error('Errore di rete simulato durante il recupero degli elementi menu');
  //}
  
  // Converti i dati JSON in MenuItem[]
  return (menuItemsData.menuItems as MenuItem[])
    .filter(item => item.timeOfDay.includes(timeOfDay));
};

/**
 * Simula il recupero di tutti gli elementi del menu, indipendentemente dall'orario
 * @returns Promise che si risolve con tutti gli elementi del menu
 */
export const mockApiGetAllMenuItems = async (): Promise<MenuItem[]> => {
  console.log('[Mock API] Recupero tutti gli elementi menu');
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Simula un errore casuale in 10% dei casi per testare la gestione degli errori
  if (Math.random() < 0.1) {
    throw new Error('Errore di rete simulato durante il recupero di tutti gli elementi menu');
  }
  
  return menuItemsData.menuItems as MenuItem[];
};

/**
 * Simula il recupero di un elemento menu specifico tramite ID
 * @param id ID dell'elemento da recuperare
 * @returns Promise che si risolve con l'elemento del menu o null se non trovato
 */
export const mockApiGetMenuItemById = async (id: string): Promise<MenuItem | null> => {
  console.log(`[Mock API] Recupero elemento menu con ID: ${id}`);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const allItems = menuItemsData.menuItems as MenuItem[];
  const item = allItems.find(item => item.id === id);
  
  return item || null;
};

/**
 * Simula il recupero dei prodotti acquistabili dal server
 * @param category Categoria opzionale per filtrare i prodotti
 * @returns Promise che si risolve con i prodotti
 */
export const mockApiGetProducts = async (category?: string): Promise<Product[]> => {
  console.log(`[Mock API] Recupero prodotti${category ? ' per categoria: ' + category : ''}`);
  
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const allProducts = productsData as Product[];
  
  // Se è specificata una categoria, filtra i risultati
  if (category && category !== 'all') {
    return allProducts.filter(product => product.category === category);
  }
  
  return allProducts;
};

/**
 * Simula il recupero di un prodotto specifico tramite ID
 * @param id ID del prodotto da recuperare
 * @returns Promise che si risolve con il prodotto o null se non trovato
 */
export const mockApiGetProductById = async (id: string): Promise<Product | null> => {
  console.log(`[Mock API] Recupero prodotto con ID: ${id}`);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const allProducts = productsData as Product[];
  const product = allProducts.find(product => product.id === id);
  
  return product || null;
};

/**
 * Simula l'invio di un ordine
 * @param userId ID dell'utente
 * @param items Array di elementi ordinati con ID e quantità
 * @returns Promise che si risolve con la conferma dell'ordine
 */
export const mockApiSubmitOrder = async (
  userId: string, 
  items: Array<{id: string, type: 'menuItem' | 'product', quantity: number}>
): Promise<{orderId: string, success: boolean, message: string}> => {
  console.log(`[Mock API] Invio ordine per utente: ${userId}`, items);
  
  // Simuliamo un ritardo più lungo per l'elaborazione dell'ordine
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simula un errore casuale in 15% dei casi
  if (Math.random() < 0.15) {
    throw new Error('Errore durante l\'elaborazione dell\'ordine');
  }
  
  // Genera un ID ordine casuale
  const orderId = 'ORD-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  return {
    orderId,
    success: true,
    message: `Ordine ${orderId} confermato con successo! Il tuo ordine sarà pronto in 10-15 minuti.`
  };
};

/**
 * Simula il recupero dello storico ordini di un utente
 * @param userId ID dell'utente
 * @returns Promise che si risolve con lo storico ordini
 */
export const mockApiGetOrderHistory = async (userId: string): Promise<any[]> => {
  console.log(`[Mock API] Recupero storico ordini per utente: ${userId}`);
  
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Genera un numero casuale di ordini storici
  const numOrders = Math.floor(Math.random() * 5) + 3;
  const orderHistory = [];
  
  for (let i = 0; i < numOrders; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Ordine negli ultimi 30 giorni
    
    orderHistory.push({
      orderId: 'ORD-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
      date: date.toISOString(),
      total: (Math.random() * 50 + 5).toFixed(2),
      items: [
        {
          id: i % 2 === 0 ? 'coffee-2' : 'pastry-2',
          name: i % 2 === 0 ? 'Cappuccino' : 'Cornetto Integrale',
          quantity: Math.floor(Math.random() * 3) + 1,
          price: i % 2 === 0 ? 2.50 : 1.50
        },
        {
          id: i % 3 === 0 ? 'coffee-3' : 'pastry-3',
          name: i % 3 === 0 ? 'Caffè Americano' : 'Pain au Chocolat',
          quantity: Math.floor(Math.random() * 2) + 1,
          price: i % 3 === 0 ? 1.80 : 1.70
        }
      ],
      status: 'completed'
    });
  }
  
  // Ordina per data decrescente (più recenti prima)
  return orderHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};