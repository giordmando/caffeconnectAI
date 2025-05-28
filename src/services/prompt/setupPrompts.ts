// src/services/prompt/setupPrompts.ts
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
import { AppConfig } from '../../config/interfaces/IAppConfig'; // Importa AppConfig

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

  // Ottieni la configurazione DOPO che ConfigManager è stato inizializzato
  const appConfig: AppConfig = configManager.getConfig();

  // Popola StaticProvider con la knowledgeBase
  // Assicurati che knowledgeBase sia un array prima di iterare
  if (appConfig.knowledgeBase && !Array.isArray(appConfig.knowledgeBase)) {
    appConfig.knowledgeBase = Object.values(appConfig.knowledgeBase);
  }
  if (appConfig.knowledgeBase && Array.isArray(appConfig.knowledgeBase) && appConfig.knowledgeBase.length > 0) {
    appConfig.knowledgeBase.forEach(entry => {
      if (entry && entry.key && Array.isArray(entry.facts)) { // Controllo aggiuntivo sulla struttura dell'entry
        staticProvider.addKnowledge(entry.key, entry.facts);
      } else {
        console.warn('Skipping invalid knowledgeBase entry:', entry);
      }
    });
  } else {
    console.warn("KnowledgeBase is not an array or is missing in the configuration. StaticProvider will not be populated from knowledgeBase.");
  }

  promptService.registerProvider(staticProvider);

  // Inizializza il servizio PromptService (che a sua volta inizializza i provider registrati)
  await promptService.initialize();
  console.log('PromptService and its providers initialized in setupPrompts.');
}
