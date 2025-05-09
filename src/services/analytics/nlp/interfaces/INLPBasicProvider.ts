export interface INLPBasicProvider {
    getName(): string;
    isOnline(): boolean;
    requiresAPIKey(): boolean;
  }