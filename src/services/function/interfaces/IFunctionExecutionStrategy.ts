import { UserContext } from "../../../types/UserContext";

export interface IFunctionExecutionStrategy {
    executeFunction(functionName: string, args: any): Promise<any>;

    // Nuovi metodi
    determineFunctions?(userMessage: string, context: UserContext): Promise<string[]>;
    executeForMessage?(userMessage: string, context: UserContext): Promise<any[]>;
}