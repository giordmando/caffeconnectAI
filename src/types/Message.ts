
  export interface Message {
    role: 'user' | 'assistant' | 'system' | 'function';
    content: string;
    name?: string; // Optional name for function messages
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
  