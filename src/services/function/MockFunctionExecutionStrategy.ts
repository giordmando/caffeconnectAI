import { mockFunctionExecution } from "../../api/mockFunctionService";
import { IFunctionExecutionStrategy } from "./interfaces/IFunctionExecutionStrategy";

  // Implementazione mock
  export class MockFunctionExecutionStrategy implements IFunctionExecutionStrategy {
    async executeFunction(functionName: string, args: any): Promise<any> {
      return mockFunctionExecution(functionName, args);
    }
  }