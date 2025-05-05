export interface IFunctionExecutionStrategy {
    executeFunction(functionName: string, args: any): Promise<any>;
}