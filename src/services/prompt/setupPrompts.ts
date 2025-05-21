// src/services/prompt/setupPrompts.ts
import { promptService } from './PromptService';
import { SystemPromptTemplate } from './templates/SystemPromptTemplate';
import { FunctionPromptTemplate } from './templates/FunctionPromptTemplate';
import { ActionPromptTemplate } from './templates/ActionPromptTemplate';
import { StaticProvider } from './providers/StaticProvider';
import { 
  SYSTEM_PROMPT_TEMPLATE,
  FUNCTION_SELECTION_TEMPLATE,
  FUNCTION_PARAM_EXTRACTION_TEMPLATE,
  ACTION_GENERATION_TEMPLATE,
  SUGGESTION_GENERATION_TEMPLATE,
  RAG_CONTEXT_TEMPLATE
} from './constants/PromptTemplates';

export async function setupPrompts(): Promise<void> {
  // Registra i template
  promptService.registerTemplate(
    new SystemPromptTemplate(SYSTEM_PROMPT_TEMPLATE, 'system')
  );
  
  promptService.registerTemplate(
    new FunctionPromptTemplate(FUNCTION_SELECTION_TEMPLATE, 'function_selection')
  );
  
  promptService.registerTemplate(
    new FunctionPromptTemplate(FUNCTION_PARAM_EXTRACTION_TEMPLATE, 'function_param_extraction')
  );
  
  promptService.registerTemplate(
    new ActionPromptTemplate(ACTION_GENERATION_TEMPLATE, 'action_generation')
  );
  
  promptService.registerTemplate(
    new ActionPromptTemplate(SUGGESTION_GENERATION_TEMPLATE, 'suggestion_generation')
  );
  
  promptService.registerTemplate(
    new SystemPromptTemplate(RAG_CONTEXT_TEMPLATE, 'rag_context')
  );
  
  // Registra il provider statico come fallback
  const staticProvider = new StaticProvider();
  
  // Aggiungi alcune conoscenze statiche di base
  staticProvider.addKnowledge('caffè', [
    'Il nostro caffè viene da piantagioni sostenibili in Etiopia e Colombia.',
    'Abbiamo diverse varietà di caffè, tra cui Arabica, Robusta e miscele speciali.',
    'Il caffè più venduto è l\'Arabica Specialty Etiopia Yirgacheffe.'
  ]);
  
  staticProvider.addKnowledge('menu', [
    'Il nostro menu varia durante la giornata: colazione (6-12), pranzo (12-18), aperitivo (18-22).',
    'Offriamo prodotti da forno freschi ogni giorno.',
    'Tutti gli ingredienti sono selezionati da fornitori locali quando possibile.'
  ]);
  
  promptService.registerProvider(staticProvider);
  
  // Inizializza il servizio
  await promptService.initialize();
}