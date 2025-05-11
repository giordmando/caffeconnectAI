import { Message } from '../../../../types/Message';
import { UserContext } from '../../../../types/UserContext';

export interface MessageRequest {
  // Proprietà base
  message: string;
  userContext: UserContext;
  conversationHistory: Message[];
  
  // Proprietà che possono essere aggiunte durante la pipeline
  aiMessage?: Message;         // Risposta dell'AI
  functionCall?: {             // Chiamata a funzione da eseguire
    name: string;
    arguments: string;
  };
  functionResult?: {
    name: string;
    result: any; // Risultato NON stringificato
  };        // Risultato della funzione eseguita
  error?: Error;               // Eventuali errori
}