import { UIComponent } from "../../../../types/UI";
import { IComponentCreator } from "../interfaces/IComponentCreator";

export abstract class BaseComponentCreator implements IComponentCreator {
    abstract componentType: string;
    abstract functionNames: string[];
    protected isUniqueComponent: boolean = false;
    getComponentType(): string {
      return this.componentType;
    }
    
    canHandleFunctionResult(functionName: string): boolean {
      return this.functionNames.includes(functionName);
    }
    
    createFromFunctionResult(functionName: string, result: any): UIComponent | null {
      if (!this.canHandleFunctionResult(functionName)) return null;
      
      const data = this.extractDataFromResult(result);
      return this.createUIComponent(data);
    }
    
    protected extractDataFromResult(result: any): any {
      return result?.data?.data || result?.data || result;
    }
    
    protected generateComponentId(prefix: string, data: any): string {

      if (this.isUniqueComponent) {
        return `${this.componentType}-singleton`;
      }
      
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 5);
      const dataId = data.id || data.name || 'default';
      return `${prefix}-${dataId}-${timestamp}-${random}`;
    }
    
    abstract createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement;
    abstract createUIComponent(data: any, placement?: string): UIComponent;
  }