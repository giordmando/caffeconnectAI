import { promptService } from './PromptService';
import { SystemPromptTemplate } from './templates/SystemPromptTemplate';
import { FunctionPromptTemplate } from './templates/FunctionPromptTemplate';
import { ActionPromptTemplate } from './templates/ActionPromptTemplate';
import { StaticProvider } from './providers/StaticProvider';
import { configManager } from '../../config/ConfigManager';
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
  const appConfig = configManager.getConfig();
  if (appConfig.knowledgeBase) {
    appConfig.knowledgeBase.forEach(entry => {
      staticProvider.addKnowledge(entry.key, entry.facts);
    });
  }
  
  promptService.registerProvider(staticProvider);
  
  // Inizializza il servizio
  await promptService.initialize();
}