  
  // src/types/Function.ts
  export interface FunctionDefinition {
    name: string;
    description: string;
    parameters: any;
    handler: (params: any) => Promise<any>;
    uiMetadata?: any;
  }
  
  export interface FunctionCallResult {
    success: boolean;
    data?: any;
    error?: string;
  }