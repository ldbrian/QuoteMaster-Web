import { ResearchResult } from "../models/research-result";

export type ResearchInput = {
  companyName: string;
  website?: string;
  description?: string;
  additionalInfo?: string;
};

export interface ResearchProvider {
  readonly name: string;
  research(input: ResearchInput): Promise<ResearchResult>;
}
