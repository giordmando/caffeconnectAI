  // src/types/UI.ts
  export interface UIComponent {
    type: string;
    data: any;
    placement: string;
    id: string;
    _updated?: number; // Optional property to track the last update timestamp
  }