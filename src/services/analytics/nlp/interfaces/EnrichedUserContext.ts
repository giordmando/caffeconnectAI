import { UserContext } from "../../../../types/UserContext";
import { AnalysisResult } from "./INLPService";

export interface EnrichedUserContext extends UserContext {
    nlpData: {
      recentTopics?: string[];
      recentIntents?: string[];
      lastSentiment?: AnalysisResult;
    };
}