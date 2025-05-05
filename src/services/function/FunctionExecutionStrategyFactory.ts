import { IAIProvider } from "../ai/interfaces/IAIProvider";
import { IFunctionExecutionStrategy } from "./interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "./interfaces/IFunctionService";
import { MockFunctionExecutionStrategy } from "./MockFunctionExecutionStrategy";
import { RealFunctionExecutionStrategy } from "./RealFunctionExecutionStrategy";

export class FunctionExecutionStrategyFactory {
    static createStrategy(provider: IAIProvider, functionService: IFunctionService): IFunctionExecutionStrategy {
      // La configurazione può decidere quale strategia usare
      // Non basarti sul nome del provider, ma su una proprietà di configurazione
      const config = provider.getConfig?.() || {};
      
      if (config.useMockFunctions) {
        return new MockFunctionExecutionStrategy();
      }
      
      return new RealFunctionExecutionStrategy(functionService);
    }
  }