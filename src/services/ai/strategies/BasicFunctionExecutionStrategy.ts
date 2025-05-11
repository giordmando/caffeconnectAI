import { IFunctionExecutionStrategy } from "../../function/interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "../../function/interfaces/IFunctionService";

export class BasicFunctionExecutionStrategy implements IFunctionExecutionStrategy {
    constructor(private functionService: IFunctionService) {}
    
    async executeFunction(functionName: string, args: any): Promise<any> {
      return this.functionService.executeFunction(functionName, args);
    }
}