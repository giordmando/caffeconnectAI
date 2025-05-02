export interface AIProviderConfig {
  apiKey: string;
  model: string;
  options?: {
    enableAdvancedFunctionSupport?: boolean;
    [key: string]: any;
  };
}