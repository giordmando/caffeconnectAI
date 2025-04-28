import { FunctionCallResult, FunctionDefinition } from "../../../types/Function";

export interface IFunctionService {
    registerFunction(functionDef: FunctionDefinition): void;
    getAllFunctions(): FunctionDefinition[];
    getFunctionsForAI(): any[];
    hasFunction(functionName: string): boolean;
    executeFunction(functionName: string, parameters: any): Promise<FunctionCallResult>;
    getFunctionUIMetadata(functionName: string): any;
  }