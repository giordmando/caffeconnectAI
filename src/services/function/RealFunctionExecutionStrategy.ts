import { IFunctionExecutionStrategy } from "./interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "./interfaces/IFunctionService";

// Implementazione reale
export class RealFunctionExecutionStrategy implements IFunctionExecutionStrategy {
    constructor(private functionService: IFunctionService) {}
    
    async executeFunction(functionName: string, args: any): Promise<any> {
      return this.functionService.executeFunction(functionName, args);
    }
  }