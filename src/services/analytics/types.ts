// src/services/analytics/types.ts
export enum ConsentLevel {
    MINIMAL = "minimal",
    FUNCTIONAL = "functional", 
    ANALYTICS = "analytics"
  }
  
  export interface ConversationRecord {
    id: string;
    userId?: string;
    startTime: Date;
    endTime?: Date;
    messages: {
      id: string;
      role: 'user' | 'assistant';
      content?: string;
      timestamp: number;
    }[];
    intents: string[];
    topics: string[];
  }
  
  export interface BaseEvent {
    type: 'message' | 'function_call';
    conversationId: string;
    data: any;
    timestamp: number;
  }