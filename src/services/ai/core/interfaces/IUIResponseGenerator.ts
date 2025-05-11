import { Message } from "../../../../types/Message";
import { UIComponent } from "../../../../types/UI";
import { UserContext } from "../../../../types/UserContext";


export interface IUIResponseGenerator {
  generateUIComponents(
    message: Message, 
    userContext: UserContext, 
    history: Message[],
    functionContext?: {
      functionName?: string;
      functionResult?: any;
    }
  ): Promise<UIComponent[]>;
  
  generateSuggestions(message: Message, userContext: UserContext): Promise<string[]>;
  generateActions(message: Message, userContext: UserContext): Promise<any[]>;
}