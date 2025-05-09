import { TopicResult } from "../../../../types/TopicResult";

export interface ITopicExtractor {
    extractTopics(text: string): Promise<TopicResult[]>;
  }