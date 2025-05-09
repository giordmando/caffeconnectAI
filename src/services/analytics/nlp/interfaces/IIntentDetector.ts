import { IntentResult } from "../../../../types/IntentResult";

export interface IIntentDetector {
    detectIntents(text: string): Promise<IntentResult[]>;
  }