import { IFunctionExecutionStrategy } from "../../function/interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "../../function/interfaces/IFunctionService";
import { IAIProvider } from "../interfaces/IAIProvider";
import { UserContext } from "../../../types/UserContext";
import { FunctionCallResult, FunctionDefinition } from "../../../types/Function"; // Importa FunctionDefinition
import { getTimeOfDay } from "../../../utils/timeContext";
import { Message } from "../../../types/Message";
import { promptService } from "../../prompt/PromptService"; // Importa il promptService

export class AIGuidedFunctionStrategy implements IFunctionExecutionStrategy {
  constructor(
    private aiProvider: IAIProvider,
    private functionService: IFunctionService
  ) {}

  async executeFunction(functionName: string, args: any): Promise<FunctionCallResult> {
    return this.functionService.executeFunction(functionName, args);
  }

  async determineFunctions(userMessage: string, context: UserContext, conversationHistory?: Message[]): Promise<string[]> {
    const availableFunctions = this.functionService.getFunctionsForAI(); // Usa getFunctionsForAI per il formato corretto

    // Costruisci prompt per la selezione delle funzioni
    const promptContext = {
      userMessage,
      userId: context.userId,
      preferences: context.preferences?.map(p => `${p.itemType}:${p.itemId} (rating: ${p.rating})`).join(', ') || 'Nessuna',
      dietaryRestrictions: context.dietaryRestrictions?.join(', ') || 'Nessuna',
      lastVisit: context.lastVisit,
      availableFunctions: availableFunctions.map((fn: any) => `- ${fn.name}: ${fn.description}`).join('\n')
      // Potresti voler passare l'intera history o un suo riassunto se il template lo supporta
    };

    const prompt = await promptService.getPrompt('function_selection', promptContext); //

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
          // Passa l'intera definizione della funzione a buildParamsForFunction
          const functionDef = this.functionService.getFunctionDefinition(fnName);
          if (!functionDef) {
            console.warn(`Function definition not found for ${fnName} during param building.`);
            return { functionName: fnName, success: false, error: `Definition for ${fnName} not found` };
          }
          const params = await this.buildParamsForFunction(fnName, functionDef, userMessage, context); // Modificato
          const result = await this.executeFunction(fnName, params);
          return { functionName: fnName, success: result.success, result }; // result qui è FunctionCallResult
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
      const match = response.match(/\[(.*?)\]/); // Aggiunto 's' per multiline
      if (!match || !match[0]) return [];
      const jsonArray = JSON.parse(match[0]);
      if (!Array.isArray(jsonArray)) return [];
      return jsonArray.filter(item => typeof item === 'string');
    } catch (error) {
      console.warn('Could not parse functions from AI response, attempting direct extraction:', response, error);
      // Fallback: prova a estrarre nomi di funzioni se non è un JSON array valido
      // Questo è un fallback grezzo, potrebbe necessitare di miglioramenti
      const knownFunctionNames = this.functionService.getAllFunctions().map(f => f.name);
      const foundFunctions: string[] = [];
      for (const name of knownFunctionNames) {
        if (response.includes(`"${name}"`)) { // Cerca il nome della funzione tra virgolette
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

  // MODIFICATO: Ora accetta FunctionDefinition e usa promptService
  async buildParamsForFunction(
    functionName: string,
    functionDef: FunctionDefinition, // Ora riceve l'intera definizione
    userMessage: string,
    context: UserContext
  ): Promise<any> {
    const baseParams = {
      userId: context.userId
      // Potresti aggiungere altri parametri di contesto comuni qui, es. timeOfDay
    };

    if (!functionDef.parameters || !functionDef.parameters.properties || Object.keys(functionDef.parameters.properties).length === 0) {
      // Se la funzione non ha parametri definiti (oltre a quelli base), restituisci solo i baseParams
      return baseParams;
    }

    try {
      const paramSchema = functionDef.parameters;
      const requiredParams = paramSchema.required || [];

      // Costruisci la descrizione dei parametri per il prompt
      const parameterDescriptions = Object.entries(paramSchema.properties)
        .map(([paramKey, paramDefValue]) => {
          // paramDefValue è l'oggetto che contiene type, description, enum etc.
          const desc = paramDefValue.description || 'Nessuna descrizione';
          const enumValues = paramDefValue.enum ? ` (Valori possibili: ${paramDefValue.enum.join(', ')})` : '';
          return `- ${paramKey} (${paramDefValue.type}): ${desc}${enumValues}`;
        })
        .join('\n');

      // Usa promptService per ottenere il prompt di estrazione parametri
      const promptContext = {
        userMessage,
        functionName,
        functionDescription: functionDef.description,
        parameterDescriptions // Questo ora contiene la lista formattata dei parametri
      };
      // Log per debug
      // console.log(`[AIGuidedFunctionStrategy] Context for FUNCTION_PARAM_EXTRACTION_TEMPLATE for ${functionName}:`, JSON.stringify(promptContext, null, 2));

      const paramPrompt = await promptService.getPrompt('function_param_extraction', promptContext); //

      const response = await this.aiProvider.sendMessage(paramPrompt);
      const extractedParams = this.extractJSONFromResponse(response); // Supponendo che l'AI restituisca JSON

      const finalParams = {
        ...baseParams,
        ...extractedParams
      };

      // Verifica i parametri richiesti e fornisci valori di default se necessario
      for (const param of requiredParams) {
        if (finalParams[param] === undefined || finalParams[param] === null) {
          // Non passare paramDef.properties[param] ma paramSchema.properties[param]
          finalParams[param] = this.getDefaultValueForParam(param, paramSchema.properties[param]);
        }
      }
       // console.log(`[AIGuidedFunctionStrategy] Final params for ${functionName}:`, JSON.stringify(finalParams, null, 2));
      return finalParams;

    } catch (error) {
      console.error(`Error building parameters for ${functionName}:`, error);
      // In caso di errore, restituisci i parametri base o gestisci diversamente
      return baseParams;
    }
  }

  private extractJSONFromResponse(response: string): any {
    try {
      // Cerca un oggetto JSON nella risposta. Potrebbe essere necessario un parsing più robusto.
      const match = response.match(/\{[\s\S]*\}/);
      if (match && match[0]) {
        return JSON.parse(match[0]);
      }
      console.warn('No JSON object found in AI response for parameters:', response);
      return {};
    } catch (error) {
      console.error('Error extracting JSON from AI response for parameters:', error, "\nResponse was:", response);
      return {}; // Restituisce un oggetto vuoto in caso di errore di parsing
    }
  }

  private getDefaultValueForParam(paramName: string, paramDef: any): any {
    if (!paramDef) return null; // Se paramDef non esiste

    if (paramName === 'timeOfDay') return getTimeOfDay(); //
    if (paramName === 'category' && paramDef.enum && paramDef.enum.includes('all')) return 'all';
    if (paramName === 'type' && paramDef.enum && paramDef.enum.includes('all')) return 'all';

    // Se c'è un valore di default nello schema, usalo
    if (paramDef.default !== undefined) return paramDef.default;

    // Altrimenti, default basato sul tipo
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