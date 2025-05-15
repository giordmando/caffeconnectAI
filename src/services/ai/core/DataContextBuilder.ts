export interface DataItem {
    source: string;
    data: any;
  }
  
  export class DataContextBuilder {
    private dataItems: DataItem[] = [];
    
    addFunctionResult(functionName: string, result: any): this {
      this.dataItems.push({
        source: `function:${functionName}`,
        data: result.success ? result.data : { error: result.error }
      });
      return this;
    }
    
    addCatalogData(catalogType: string, data: any[]): this {
      this.dataItems.push({
        source: `catalog:${catalogType}`,
        data
      });
      return this;
    }
    
    addUserContext(context: any): this {
      this.dataItems.push({
        source: 'user:context',
        data: context
      });
      return this;
    }
    
    addCustomData(source: string, data: any): this {
      this.dataItems.push({ source, data });
      return this;
    }
    
    build(): any {
      // Raggruppa i dati per fonte
      const result: Record<string, any> = {};
      
      for (const item of this.dataItems) {
        const [category, type] = item.source.split(':');
        
        if (!result[category]) {
          result[category] = {};
        }
        
        if (type) {
          result[category][type] = item.data;
        } else {
          // Se non c'è un tipo specifico, usa direttamente la categoria
          result[category] = item.data;
        }
      }
      
      return result;
    }
    
    buildPrompt(): string {
      const data = this.build();
      return `
  Informazioni disponibili:
  ${JSON.stringify(data, null, 2)}
  
  Basa la tua risposta SOLO su queste informazioni verificate. 
  Se non hai dati sufficienti, spiega cosa non è disponibile.
  NON inventare informazioni non presenti in questi dati.
  `;
    }
  }