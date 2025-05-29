import { UIComponent } from "../../../../types/UI";

// Interfaccia unificata per i creatori di componenti
export interface IComponentCreator {
  // Identifica il tipo di componente gestito
  getComponentType(): string;
  
  // Crea un componente React dal componente UI
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement;
  
  // Crea un UIComponent dai dati
  createUIComponent(data: any, placement?: string): UIComponent;
  
  // Verifica se può gestire un risultato di funzione
  canHandleFunctionResult(functionName: string): boolean;
  
  // Crea un UIComponent dal risultato di una funzione
  createFromFunctionResult(functionName: string, result: any): UIComponent | null;
}