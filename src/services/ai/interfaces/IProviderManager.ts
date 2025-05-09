import { AIProviderConfig } from "../../../types/AIProvider";

export interface IProviderManager {
    getProviderName(): string;
    changeProvider(provider: string, config: AIProviderConfig): void;
  }