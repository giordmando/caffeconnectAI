import { FunctionDefinition } from "../../../types/Function";

/**
 * Interface for function management service
 */
export interface IFunctionService {

  /**
     * Inizializza il servizio di funzioni
     */
  initialize(): Promise<void>;

  /**
     * Register a new function
     */
    areCustomFunctionsLoaded(): boolean;

    /**
     * Register a new function
     * @param functionName Function definition object
     */

    getFunctionDataEndpoints(functionName: string): any;

    /**
     * Register a new function
     * @param functionDef Function definition object
     */
    registerFunction(functionDef: any): void;
    
    /**
     * Get all registered functions
     * @returns Array of function definitions
     */
    getAllFunctions(): any[];
    
    /**
     * Get functions formatted for AI service
     * @returns Array of function definitions in AI-compatible format
     */
    getFunctionsForAI(): any[];
    
    /**
     * Check if a function exists
     * @param functionName Name of the function
     * @returns Boolean indicating if function exists
     */
    hasFunction(functionName: string): boolean;
    
    /**
     * Execute a function with parameters
     * @param functionName Name of the function to execute
     * @param parameters Parameters to pass to the function
     * @returns Promise resolving to function result
     */
    executeFunction(functionName: string, parameters: any): Promise<any>;
    
    /**
     * Get UI metadata for a function
     * @param functionName Name of the function
     * @returns UI metadata object or null
     */
    getFunctionUIMetadata(functionName: string): any;

    getFunctionDefinition(functionName: string): FunctionDefinition | null;
    
  }