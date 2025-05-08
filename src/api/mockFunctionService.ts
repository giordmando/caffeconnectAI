/**
 * Servizio per simulare l'esecuzione di funzioni in modalità mock
 * Questa implementazione è necessaria per testare l'app senza API reali
 */

/**
 * Esegue una chiamata a funzione simulata
 * @param functionName Nome della funzione da simulare
 * @param args Argomenti della funzione
 * @returns Risultato simulato
 */
export async function mockFunctionExecution(functionName: string, args: any): Promise<any> {
    console.log(`[MOCK] Esecuzione funzione: ${functionName}`, args);
    
    // Simula diverse funzioni
    switch (functionName) {
      case 'get_user_loyalty_points':
        return mockGetUserLoyaltyPoints(args);
        
      case 'get_user_preferences':
        return mockGetUserPreferences(args);
        
      case 'get_menu_recommendations':
        return mockGetMenuRecommendations(args);
        
      case 'get_product_recommendations':
        return mockGetProductRecommendations(args);
        
      case 'track_user_action':
        return mockTrackUserAction(args);
        
      default:
        console.warn(`[MOCK] Funzione sconosciuta: ${functionName}`);
        return {
          success: false,
          error: `Funzione "${functionName}" non supportata in modalità mock.`
        };
    }
  }
  
  /**
   * Simula il recupero dei punti fedeltà dell'utente
   */
  function mockGetUserLoyaltyPoints(args: any): any {
    return {
      success: true,
      args,
      data: {
        points: 1250,
        tier: 'Gold',
        nextTier: {
          name: 'Platinum',
          pointsNeeded: 250
        },
        history: [
          { date: '2023-03-15', points: 50, reason: 'Acquisto Cappuccino' },
          { date: '2023-03-10', points: 100, reason: 'Acquisto French Press' },
          { date: '2023-03-05', points: 75, reason: 'Acquisto Cornetto Integrale x3' },
          { date: '2023-02-28', points: 200, reason: 'Acquisto Gift Box Caffè' }
        ]
      }
    };
  }
  
  /**
   * Simula il recupero delle preferenze dell'utente
   */
  function mockGetUserPreferences(args: any): any {
    return {
      success: true,
      args,
      data: {
        favoriteDrinks: ['Cappuccino', 'Espresso'],
        favoriteFood: ['Cornetto Integrale', 'Pain au Chocolat'],
        dietaryRestrictions: ['low-sugar'],
        usualVisitTime: 'morning',
        lastOrderedItems: [
          { name: 'Cappuccino', date: '2023-03-15' },
          { name: 'Cornetto Integrale', date: '2023-03-15' },
          { name: 'Tè Verde', date: '2023-03-10' },
          { name: 'Panino Veggie', date: '2023-03-05' }
        ]
      }
    };
  }
  
  /**
   * Simula il recupero di raccomandazioni di menu
   */
  function mockGetMenuRecommendations(args: any): any {
    const timeOfDay = args.timeOfDay || 'morning';
    let recommendations: { id: string; name: string; confidence: number }[] = [];
    
    if (timeOfDay === 'morning') {
      recommendations = [
        { id: 'coffee-2', name: 'Cappuccino', confidence: 0.95 },
        { id: 'pastry-2', name: 'Cornetto Integrale', confidence: 0.88 },
        { id: 'pastry-3', name: 'Pain au Chocolat', confidence: 0.75 }
      ];
    } else if (timeOfDay === 'afternoon') {
      recommendations = [
        { id: 'sandwich-1', name: 'Panino Veggie', confidence: 0.85 },
        { id: 'salad-1', name: 'Insalata Caesar', confidence: 0.82 },
        { id: 'tea-1', name: 'Tè Verde', confidence: 0.78 }
      ];
    } else if (timeOfDay === 'evening') {
      recommendations = [
        { id: 'aperitivo-1', name: 'Aperol Spritz', confidence: 0.92 },
        { id: 'aperitivo-2', name: 'Tagliere Misto', confidence: 0.90 },
        { id: 'dessert-1', name: 'Tiramisù', confidence: 0.85 }
      ];
    }
    
    return {
      success: true,
      args,
      data: {
        recommendations
      }
    };
  }
  
  /**
   * Simula il recupero di raccomandazioni di prodotti
   */
  function mockGetProductRecommendations(args: any): any {
    const category = args.category || 'all';
    let recommendations = [];
    
    if (category === 'coffee' || category === 'all') {
      recommendations = [
        { id: 'coffee-bag-2', name: 'Caffè Specialty Etiopia Yirgacheffe', confidence: 0.92 },
        { id: 'coffee-bag-1', name: 'Caffè Arabica - Miscela Premium', confidence: 0.88 },
        { id: 'accessory-3', name: 'Moka Express 3 tazze', confidence: 0.75 }
      ];
    } else if (category === 'accessory') {
      recommendations = [
        { id: 'accessory-2', name: 'French Press Premium', confidence: 0.89 },
        { id: 'accessory-1', name: 'Tazza in Ceramica CaféConnect', confidence: 0.82 },
        { id: 'accessory-3', name: 'Moka Express 3 tazze', confidence: 0.78 }
      ];
    } else {
      recommendations = [
        { id: 'gift-1', name: 'Gift Box Caffè del Mondo', confidence: 0.94 },
        { id: 'food-2', name: 'Cioccolato Fondente 70%', confidence: 0.85 },
        { id: 'food-1', name: 'Biscotti alle Mandorle', confidence: 0.80 }
      ];
    }
    
    return {
      success: true,
      args,
      data: {
        recommendations
      }
    };
  }
  
  /**
   * Simula il tracciamento di un'azione utente
   */
  function mockTrackUserAction(args: any): any {
    return {
      success: true,
      message: `Azione ${args.actionType} tracciata con successo`,
      timestamp: Date.now()
    };
  }