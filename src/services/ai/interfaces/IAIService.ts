import { Message } from '../../../types/Message';
import { UIComponent } from '../../../types/UI';
import { UserContext } from '../../../types/UserContext';
import { IConversationManager } from './IConversationManager';
import { IFunctionCallSupport } from './IFunctionCallSupport';
import { IMessageSender } from './IMessageSender';
import { IProviderManager } from './IProviderManager';

export interface IAIService extends 
  IMessageSender, 
  IConversationManager,
  IProviderManager,
  IFunctionCallSupport {
  
  // Aggiungiamo questo metodo all'interfaccia
  generateUIComponents(message: Message, userContext: UserContext, conversation: Message[]): Promise<UIComponent[]>;
}