export interface IPromptTemplate {
    renderPrompt(context: any): string;
    getId(): string;
  }
  