import { Message } from "../../../../types/Message";
import { UserContext } from "../../../../types/UserContext";

export interface IFunctionOrchestrator {
    processFunctionCall(call: any): Promise<Message>;
    getFunctionsForAI(): any[];
    shouldExecuteFunction(response: any): boolean;
    
    // Nuovo metodo per eseguire funzioni basate sul messaggio
    executeForMessage(message: string, userContext: UserContext): Promise<any[]>;
}