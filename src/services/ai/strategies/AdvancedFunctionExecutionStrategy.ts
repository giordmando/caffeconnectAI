import { IFunctionExecutionStrategy } from "../../function/interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "../../function/interfaces/IFunctionService";

export class AdvancedFunctionExecutionStrategy implements IFunctionExecutionStrategy {
    private maxFunctionCalls: number = 5;
    private currentCalls: number = 0;
    
    constructor(private functionService: IFunctionService) {}
    
    async executeFunction(functionName: string, args: any): Promise<any> {
      this.currentCalls++;
      
      try {
        return await this.functionService.executeFunction(functionName, args);
      } finally {
        if (this.currentCalls >= this.maxFunctionCalls) {
          this.currentCalls = 0;
        }
      }
    }
    
    reset(): void {
      this.currentCalls = 0;
    }
  }