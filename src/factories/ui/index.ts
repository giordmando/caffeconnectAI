export { UIComponentFactory, uiComponentFactory } from './UIComponentFactory';
export type { IComponentCreator } from './interfaces/IComponentCreator';
export { BaseComponentCreator } from './creators/BaseComponentCreator';
export { registerAllUIComponents } from './registration';

// Export tutti i creator per uso esterno se necessario
export * from './creators';