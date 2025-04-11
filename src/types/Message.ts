
  // src/types/Message.ts
  export interface Message {
    role: 'user' | 'assistant' | 'system' | 'function';
    content: string;
    functionCall?: {
      name: string;
      arguments: string;
    };
    functionResult?: {
      name: string;
      result: string;
    };
    timestamp: number;
  }
  