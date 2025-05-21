export interface IPromptProvider {
    getName(): string;
    retrieveContent(query: string, context: any): Promise<string[]>;
    initialize(): Promise<void>;
  }