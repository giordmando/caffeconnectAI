import { IFunctionExecutionStrategy } from "../../function/interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "../../function/interfaces/IFunctionService";
import { IAIProvider } from "../interfaces/IAIProvider";
import { UserContext } from "../../../types/UserContext";
import { FunctionDefinition, FunctionCallResult } from "../../../types/Function";
import { getTimeOfDay } from "../../../utils/timeContext";
import { Message } from "../../../types/Message";
import { promptService } from "../../prompt/PromptService";

export class AIGuidedFunctionStrategy implements IFunctionExecutionStrategy {
  constructor(
    private aiProvider: IAIProvider,
    private functionService: IFunctionService // Assicurati che sia iniettato
  ) {}

  async executeFunction(functionName: string, args: any): Promise<FunctionCallResult> {
    return this.functionService.executeFunction(functionName, args);
  }

  async determineFunctions(userMessage: string, context: UserContext, conversationHistory?: Message[]): Promise<string[]> {
    const availableFunctions = this.functionService.getFunctionsForAI();

    const promptContext = {
      userMessage,
      userId: context.userId,
      preferences: context.preferences?.map(p => `${p.itemType}:${p.itemId} (rating: ${p.rating})`).join(', ') || 'Nessuna',
      dietaryRestrictions: context.dietaryRestrictions?.join(', ') || 'Nessuna',
      lastVisit: context.lastVisit,
      availableFunctions: availableFunctions.map((fn: any) => `- ${fn.name}: ${fn.description}`).join('\n')
    };

    const prompt = await promptService.getPrompt('function_selection', promptContext);

    try {
      const response = await this.aiProvider.sendMessage(prompt);
      const selectedFunctions = this.extractFunctionsFromResponse(response);
      return selectedFunctions.filter(fnName => this.functionService.hasFunction(fnName));
    } catch (error) {
      console.error('Error determining functions:', error);
      return [];
    }
  }

  async executeForMessage(userMessage: string, context: UserContext): Promise<any[]> {
    const functionsToCall = await this.determineFunctions(userMessage, context);
    if (functionsToCall.length === 0) return [];

    const results = await Promise.all(
      functionsToCall.map(async fnName => {
        try {
          const functionDef = this.functionService.getFunctionDefinition(fnName);
          if (!functionDef) {
            console.warn(`Function definition not found for ${fnName} during param building.`);
            return { functionName: fnName, success: false, error: `Definition for ${fnName} not found` };
          }
          const params = await this.buildParamsForFunction(fnName, functionDef, userMessage, context);
          const result = await this.executeFunction(fnName, params);
          return { functionName: fnName, success: result.success, result };
        } catch (error) {
          console.error(`Error executing or building params for function ${fnName}:`, error);
          return { functionName: fnName, success: false, error: String(error) };
        }
      })
    );
    return results;
  }


  private extractFunctionsFromResponse(response: string): string[] {
    try {
      const match = response.match(/\[(.[\s\S]*?)\]/); // Aggiunto 's' per multiline
      if (!match || !match[0]) {
        // Fallback se non è un array JSON, ma una lista di nomi di funzioni
        const knownFunctionNames = this.functionService.getAllFunctions().map(f => f.name);
        const foundFunctions: string[] = [];
        for (const name of knownFunctionNames) {
            // Cerca il nome esatto della funzione, magari tra virgolette o come parola a sé stante
            const regex = new RegExp(`["']?${name}["']?`, 'g');
            if (response.match(regex)) {
                foundFunctions.push(name);
            }
        }
        if (foundFunctions.length > 0) {
            console.log('Fallback function extraction found:', foundFunctions);
            return foundFunctions;
        }
        return [];
      }
      const jsonArray = JSON.parse(match[0]);
      if (!Array.isArray(jsonArray)) return [];
      return jsonArray.filter(item => typeof item === 'string');
    } catch (error) {
      console.warn('Could not parse functions from AI response, attempting direct extraction:', response, error);
      const knownFunctionNames = this.functionService.getAllFunctions().map(f => f.name);
      const foundFunctions: string[] = [];
      for (const name of knownFunctionNames) {
        if (response.includes(`"${name}"`)) {
            foundFunctions.push(name);
        }
      }
      if (foundFunctions.length > 0) {
          console.log('Fallback extraction found functions:', foundFunctions);
          return foundFunctions;
      }
      return [];
    }
  }

  private isLikelyItemId(value: string): boolean {
    if (!value) return false;
    // Un ID valido di solito non contiene spazi e può contenere trattini/numeri.
    // Esempio: "pastry-1", "coffee-bag-special"
    // Nomi di prodotti come "cornetto classico" contengono spazi.
    const idPattern = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;
    return idPattern.test(value) && !value.includes('  '); // Non ha spazi multipli
  }

  async buildParamsForFunction(
    functionName: string,
    functionDef: FunctionDefinition,
    userMessage: string,
    context: UserContext
  ): Promise<any> {
    const baseParams: any = { // Aggiunto any per flessibilità temporanea
      userId: context.userId,
    };

    if (!functionDef.parameters || !functionDef.parameters.properties || Object.keys(functionDef.parameters.properties).length === 0) {
        // Per view_item_details, l'AI potrebbe comunque provare a fornire itemId e itemType basandosi sulla conversazione.
        // Se non ci sono parametri definiti E la funzione non è view_item_details, restituisci solo baseParams.
        if (functionName !== 'view_item_details') {
             return baseParams;
        }
    }

    const paramSchema = functionDef.parameters;
    const requiredParams = paramSchema.required || [];

    const parameterDescriptions = Object.entries(paramSchema.properties)
      .map(([paramKey, paramDefValue]) => {
        const desc = paramDefValue.description || 'Nessuna descrizione';
        const enumValues = paramDefValue.enum ? ` (Valori possibili: ${paramDefValue.enum.join(', ')})` : '';
        return `- ${paramKey} (${paramDefValue.type}): ${desc}${enumValues}`;
      })
      .join('\n');

    const promptContext = {
      userMessage,
      functionName,
      functionDescription: functionDef.description,
      parameterDescriptions,
    };

    const paramPrompt = await promptService.getPrompt('function_param_extraction', promptContext);
    const aiResponseForParams = await this.aiProvider.sendMessage(paramPrompt);
    let extractedParams = this.extractJSONFromResponse(aiResponseForParams);

    // Normalizza i parametri base (timeOfDay, category) se presenti nello schema e non estratti
    // Questo è particolarmente utile per funzioni come get_menu_recommendations
    if (paramSchema.properties.timeOfDay && (extractedParams.timeOfDay === undefined || extractedParams.timeOfDay === null)) {
        extractedParams.timeOfDay = getTimeOfDay(); // Default se non estratto
    }
    if (paramSchema.properties.category && (extractedParams.category === undefined || extractedParams.category === null)) {
        if(paramSchema.properties.category.enum && paramSchema.properties.category.enum.includes('all')) {
            extractedParams.category = 'all'; // Default 'all' se non estratto e 'all' è un'opzione valida
        }
    }


    if (functionName === 'view_item_details') {
      let itemIdCandidate = extractedParams.itemId;
      // Se itemType non è specificato dall'AI, prova a dedurlo o usa un default.
      // Potrebbe essere migliorato cercando nel contesto della conversazione.
      const itemTypeCandidate = extractedParams.itemType || 'menuItem';

      if (itemIdCandidate && !this.isLikelyItemId(itemIdCandidate)) {
        const itemNameQuery = itemIdCandidate;
        console.log(`[AIGuidedFunctionStrategy] itemId "${itemNameQuery}" for view_item_details is a name. Attempting search...`);

        try {
          // Chiama search_product_by_name per risolvere l'ID
          // È importante che search_product_by_name sia registrata in FunctionRegistry
          const searchResult = await this.functionService.executeFunction('search_product_by_name', {
            query: itemNameQuery,
            type: itemTypeCandidate // Passa il tipo sospettato o 'all'
          });

          if (searchResult.success && searchResult.data?.results?.length > 0) {
            if (searchResult.data.results.length === 1) {
              extractedParams.itemId = searchResult.data.results[0].id;
              extractedParams.itemType = searchResult.data.results[0].type; // Aggiorna il tipo basato sul risultato della ricerca
              console.log(`[AIGuidedFunctionStrategy] Search successful. Resolved to ID: "${extractedParams.itemId}", Type: "${extractedParams.itemType}"`);
            } else {
              // Gestione ambiguità: per ora prendiamo il primo, ma idealmente si dovrebbe chiedere all'utente
              extractedParams.itemId = searchResult.data.results[0].id;
              extractedParams.itemType = searchResult.data.results[0].type;
              console.warn(`[AIGuidedFunctionStrategy] Multiple items found for "${itemNameQuery}". Using first result: ID "${extractedParams.itemId}". Consider prompting user for clarification.`);
              // Qui si potrebbe modificare la successiva risposta AI per chiedere una specificazione.
            }
          } else {
            console.warn(`[AIGuidedFunctionStrategy] Search for "${itemNameQuery}" returned no results or an error. view_item_details may fail.`);
            // L'AI dovrebbe essere istruita a gestire il caso in cui non trova l'item.
            // Potremmo impostare itemId a null per far fallire la chiamata a view_item_details in modo controllato.
            extractedParams.itemId = null; // O gestire nel GroundingHandler
          }
        } catch (searchError) {
          console.error(`[AIGuidedFunctionStrategy] Error during internal search for "${itemNameQuery}":`, searchError);
          extractedParams.itemId = null; // Segnala fallimento ricerca
        }
      } else if (!itemIdCandidate && functionName === 'view_item_details') {
        // Se l'AI non ha estratto un itemId per view_item_details, è un problema.
        console.warn(`[AIGuidedFunctionStrategy] No itemId extracted by AI for view_item_details from user message: "${userMessage}"`);
        extractedParams.itemId = null; // Assicura che la chiamata a view_item_details fallisca in modo prevedibile.
      }
    }

    const finalParams = { ...baseParams, ...extractedParams };

    // Verifica parametri richiesti e assegna default se necessario
    // Questo deve avvenire DOPO la possibile risoluzione dell'itemId
    for (const param of requiredParams) {
      if (finalParams[param] === undefined || finalParams[param] === null) {
        // Se il parametro è ancora mancante dopo l'estrazione e la risoluzione, applica il default.
        finalParams[param] = this.getDefaultValueForParam(param, paramSchema.properties[param]);
      }
    }
    console.log(`[AIGuidedFunctionStrategy] Final params for ${functionName}:`, JSON.stringify(finalParams, null, 2));
    return finalParams;
  }

  private extractJSONFromResponse(response: string): any {
    try {
      // Cerca la prima occorrenza di { e l'ultima di } per delimitare l'oggetto JSON.
      // Questo è più robusto di un semplice match se ci fosse testo prima/dopo il JSON.
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = response.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonString);
      }
      console.warn('No parsable JSON object found in AI response for parameters:', response);
      return {};
    } catch (error) {
      console.error('Error extracting JSON from AI response for parameters:', error, "\nResponse was:", response);
      return {}; // Restituisce un oggetto vuoto in caso di errore di parsing
    }
  }

  private getDefaultValueForParam(paramName: string, paramDef: any): any {
    // Se paramDef non esiste o non ha un tipo, restituisci null
    if (!paramDef || !paramDef.type) {
        // Eccezione per 'userId' che è sempre necessario
        if (paramName === 'userId' && !paramDef?.type) return 'default-user-id'; // o gestisci l'errore
        return null;
    }

    if (paramName === 'timeOfDay') return getTimeOfDay();
    // Per 'category' e 'type', se 'all' è un'opzione valida, usala come default
    if ((paramName === 'category' || paramName === 'type') && paramDef.enum && paramDef.enum.includes('all')) {
      return 'all';
    }

    // Usa il valore di default specificato nello schema, se presente
    if (paramDef.default !== undefined) return paramDef.default;

    // Altrimenti, default basati sul tipo
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