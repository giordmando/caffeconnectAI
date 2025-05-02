  
  // src/types/Function.ts
  export interface FunctionDefinition {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: {
        [key: string]: {
          type: string;
          enum?: string[]; // Add optional enum property
          description: string;
        };
      };
      required?: string[];
    };
    handler: (params: any) => Promise<any>;
    endpoint?: string;
    method?: string;
    uiMetadata?: {
      displayType?: string;
      cardTemplate?: string;
      carouselTemplate?: string;
      imageUrl?: string;
      imageAltText?: string;
      sectionTemplate?: string;
      refreshRate?: string;
    };
  }
  
  export interface FunctionCallResult {
    success: boolean;
    data?: any;
    error?: string;
  }