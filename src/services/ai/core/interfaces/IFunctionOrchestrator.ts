import { Message } from "../../../../types/Message";

export interface IFunctionOrchestrator {
    processFunctionCall(call: any): Promise<Message>;
    getFunctionsForAI(): any[];
    shouldExecuteFunction(response: any): boolean;
  }