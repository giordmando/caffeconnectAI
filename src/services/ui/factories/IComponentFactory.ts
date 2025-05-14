import { UIComponent } from '../../../types/UI';

export interface IComponentFactory {
  getComponentType(): string;
  createComponent(data: any, placement?: string): UIComponent;
  shouldHandleFunction(functionName: string): boolean;
  createFromFunctionResult(functionName: string, result: any): UIComponent | null;
}