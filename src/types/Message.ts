
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
    metadata?: {
      agent?: {
        id: string;
        label: string;
        confidence?: number;
      };
      trace?: Array<{
        label: string;
        value: string;
      }>;
    };
    timestamp: number;
  }
  
