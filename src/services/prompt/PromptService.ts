// src/services/prompt/PromptService.ts
import { IPromptTemplate } from './interfaces/IPromptTemplate';
import { IPromptProvider } from './interfaces/IPromptProvider';

export class PromptService {
  private static instance: PromptService;
  private providers: Map<string, IPromptProvider> = new Map();
  private promptTemplates: Map<string, IPromptTemplate> = new Map();
  private defaultProvider: string | null = null;
  
  private constructor() {}
  
  public static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }
  
  async initialize(): Promise<void> {
    // Inizializza tutti i provider registrati
    for (const provider of Array.from(this.providers.values())) {
      await provider.initialize();
    }
    console.log('PromptService initialized with templates:', Array.from(this.promptTemplates.keys()));
  }
  
  registerProvider(provider: IPromptProvider): void {
    this.providers.set(provider.getName(), provider);
    
    // Se è il primo provider, impostalo come default
    if (this.defaultProvider === null) {
      this.defaultProvider = provider.getName();
    }
  }
  
  setDefaultProvider(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not found`);
    }
    this.defaultProvider = providerName;
  }
  
  registerTemplate(template: IPromptTemplate): void {
    this.promptTemplates.set(template.getId(), template);
  }
  
  async getPrompt(templateId: string, context: any): Promise<string> {
    const template = this.promptTemplates.get(templateId);
    if (!template) {
      throw new Error(`Prompt template ${templateId} not found`);
    }
    
    return template.renderPrompt(context);
  }
  
  async getRAGPrompt(templateId: string, query: string, context: any): Promise<string> {
    // Se non ci sono provider o RAG non è abilitato, usa il prompt normale
    if (!this.defaultProvider || !context.enableRAG) {
      return this.getPrompt(templateId, context);
    }
    
    try {
      // Ottieni il provider attivo
      const provider = this.providers.get(this.defaultProvider);
      if (!provider) {
        return this.getPrompt(templateId, context);
      }
      
      // Recupera contenuto contestuale
      const retrievedContent = await provider.retrieveContent(query, context);
      
      // Se non c'è contenuto, usa il prompt normale
      if (!retrievedContent || retrievedContent.length === 0) {
        return this.getPrompt(templateId, context);
      }
      
      // Aggiungi il contenuto recuperato al contesto
      const enrichedContext = {
        ...context,
        retrievedContent: retrievedContent.join('\n\n')
      };
      
      // Ottieni il template RAG (se esiste) o usa quello normale
      const ragTemplateId = `${templateId}_rag`;
      if (this.promptTemplates.has(ragTemplateId)) {
        return this.getPrompt(ragTemplateId, enrichedContext);
      } else {
        // Combina il template normale con il contesto RAG
        const basePrompt = await this.getPrompt(templateId, context);
        const ragContextTemplate = this.promptTemplates.get('rag_context');
        
        if (ragContextTemplate) {
          const ragContext = ragContextTemplate.renderPrompt(enrichedContext);
          return `${basePrompt}\n\n${ragContext}`;
        } else {
          return basePrompt;
        }
      }
    } catch (error) {
      console.error('Error generating RAG prompt:', error);
      // Fallback al prompt normale
      return this.getPrompt(templateId, context);
    }
  }
  
  getTemplate(templateId: string): IPromptTemplate | undefined {
    return this.promptTemplates.get(templateId);
  }
  
  getAllTemplates(): IPromptTemplate[] {
    return Array.from(this.promptTemplates.values());
  }
}

export const promptService = PromptService.getInstance();