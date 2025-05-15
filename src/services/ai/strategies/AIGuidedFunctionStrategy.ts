import { IFunctionExecutionStrategy } from "../../function/interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "../../function/interfaces/IFunctionService";
import { IAIProvider } from "../interfaces/IAIProvider";
import { UserContext } from "../../../types/UserContext";
import { FunctionCallResult } from "../../../types/Function";
import { getTimeOfDay } from "../../../utils/timeContext";

export class AIGuidedFunctionStrategy implements IFunctionExecutionStrategy {
  constructor(
    private aiProvider: IAIProvider,
    private functionService: IFunctionService
  ) {}
  
  async executeFunction(functionName: string, args: any): Promise<FunctionCallResult> {
    return this.functionService.executeFunction(functionName, args);
  }
  
  async determineFunctions(userMessage: string, context: UserContext): Promise<string[]> {
    // Ottieni tutte le funzioni disponibili
    const availableFunctions = this.functionService.getAllFunctions();
    
    // Costruisci prompt per la selezione delle funzioni
    const prompt = this.buildFunctionSelectionPrompt(userMessage, availableFunctions, context);
    
    try {
      // Chiama l'AI per determinare quali funzioni chiamare
      const response = await this.aiProvider.sendMessage(prompt);
      
      // Estrai i nomi delle funzioni dalla risposta dell'AI
      const selectedFunctions = this.extractFunctionsFromResponse(response);
      
      // Filtra solo le funzioni che effettivamente esistono
      return selectedFunctions.filter(fn => this.functionService.hasFunction(fn));
    } catch (error) {
      console.error('Error determining functions:', error);
      return [];
    }
  }
  
  async executeForMessage(userMessage: string, context: UserContext): Promise<any[]> {
    // Determina quali funzioni chiamare
    const functionsToCall = await this.determineFunctions(userMessage, context);
    
    // Se non ci sono funzioni da chiamare, restituisci array vuoto
    if (functionsToCall.length === 0) return [];
    
    // Esegui tutte le funzioni in parallelo
    const results = await Promise.all(
      functionsToCall.map(async fnName => {
        try {
          const params = await this.buildParamsForFunction(fnName, userMessage, context);
          const result = await this.executeFunction(fnName, params);
          return { functionName: fnName, success: true, result };
        } catch (error) {
          console.error(`Error executing function ${fnName}:`, error);
          return { functionName: fnName, success: false, error: String(error) };
        }
      })
    );
    
    return results;
  }
  
  private buildFunctionSelectionPrompt(userMessage: string, availableFunctions: any[], context: UserContext): string {
    return `
    Messaggio utente: "${userMessage}"

    Contesto utente:
    - ID: ${context.userId}
    - Preferenze: ${context.preferences.map(p => `${p.itemType}:${p.itemId} (rating: ${p.rating})`).join(', ')}
    - Restrizioni dietetiche: ${context.dietaryRestrictions.join(', ') || 'Nessuna'}
    - Ultima visita: ${context.lastVisit || 'Prima visita'}

    Funzioni disponibili:
    ${availableFunctions.map(fn => `- ${fn.name}: ${fn.description}`).join('\n')}

    Individua le funzioni più adatte per recuperare i dati necessari a rispondere alla richiesta dell'utente.
    Restituisci SOLO un array JSON con i nomi delle funzioni necessarie.
    Esempio: ["get_menu_recommendations", "get_user_preferences"]
    Non includere spiegazioni o altro testo, solo l'array JSON.
    `;
  }
  
  private extractFunctionsFromResponse(response: string): string[] {
    try {
      // Cerca pattern di array JSON nella risposta
      const match = response.match(/\[(.*?)\]/);
      if (!match) return [];
      
      // Parsing del risultato
      const jsonArray = JSON.parse(match[0]);
      if (!Array.isArray(jsonArray)) return [];
      
      // Filtra solo stringhe
      return jsonArray.filter(item => typeof item === 'string');
    } catch (error) {
      console.error('Error extracting functions from response:', error);
      return [];
    }
  }
  
  async buildParamsForFunction(functionName: string, userMessage: string, context: UserContext): Promise<any> {
    // Parametri di base per tutte le funzioni
    const baseParams = {
      userId: context.userId
    };
    
    // 1. Ottieni la definizione della funzione dal registry
    const functionDef = this.functionService.getFunctionDefinition(functionName);
    if (!functionDef) {
      console.warn(`Function definition not found for ${functionName}`);
      return baseParams;
    }
    
    // 2. Utilizza AI per generare i parametri in base alla definizione
    try {
      const paramSchema = functionDef.parameters;
      const requiredParams = paramSchema.required || [];
      
      // Usa un prompt specifico per estrarre i parametri necessari
      const paramPrompt = `
Messaggio utente: "${userMessage}"

Per la funzione "${functionName}" (${functionDef.description}), estrai i seguenti parametri richiesti:
${requiredParams.map(param => {
  const paramDef = paramSchema.properties[param];
  return `- ${param}: ${paramDef.description}${paramDef.enum ? ` (opzioni: ${paramDef.enum.join(', ')})` : ''}`;
}).join('\n')}

Restituisci SOLO un oggetto JSON con i parametri estratti.
Se non riesci a identificare un parametro, usa null.
`;

      // Chiama l'AI per estrarre i parametri
      const response = await this.aiProvider.sendMessage(paramPrompt);
      
      // Estrai i parametri dalla risposta
      const extractedParams = this.extractJSONFromResponse(response);
      
      // 3. Integra i parametri estratti con i parametri base
      const finalParams = {
        ...baseParams,
        ...extractedParams
      };
      
      // 4. Verifica i parametri richiesti e fornisci valori di default se necessario
      for (const param of requiredParams) {
        if (finalParams[param] === undefined || finalParams[param] === null) {
          finalParams[param] = this.getDefaultValueForParam(param, functionDef.parameters.properties[param]);
        }
      }
      
      return finalParams;
    } catch (error) {
      console.error(`Error building parameters for ${functionName}:`, error);
      return baseParams;
    }
  }
  
  
  private extractJSONFromResponse(response: string): any {
    try {
      // Cerca pattern di oggetti JSON nella risposta
      const match = response.match(/\{[\s\S]*\}/);
      if (!match) return {};
      
      // Parsing del risultato
      return JSON.parse(match[0]);
    } catch (error) {
      console.error('Error extracting JSON from response:', error);
      return {};
    }
  }
  
  private getDefaultValueForParam(paramName: string, paramDef: any): any {
    // Logica per fornire valori di default in base al tipo e al contesto
    if (paramName === 'timeOfDay') return getTimeOfDay();
    if (paramName === 'category') return 'all';
    if (paramName === 'type') return 'all';
    
    // Default in base al tipo
    switch (paramDef.type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'array': return [];
      case 'object': return {};
      default: return null;
    }
  }
  
}