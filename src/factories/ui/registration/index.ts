import { registerStandardCreators } from './standardComponents';
import { registerNLPCreators } from './nlpComponents';

export function registerAllUIComponents(): void {
  console.log('Registering all UI components...');
  
  // Registra i creator standard con pattern Strategy
  registerStandardCreators();
  
  // Registra i componenti NLP
  registerNLPCreators();
  
  console.log('All UI components registered successfully!');
}