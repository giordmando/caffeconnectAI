import { SentimentResult } from "../../../../types/SentimentResult";

export interface ISentimentAnalyzer {
    analyzeSentiment(text: string): Promise<SentimentResult>;
  }