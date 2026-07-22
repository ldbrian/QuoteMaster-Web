export type DiscoveryInput = {
  icp?: {
    industries?: string[];
    regions?: string[];
    companySize?: string;
    businessModel?: string;
  };
  keywords?: string[];
  rawList?: string;
};

export type CandidateCompany = {
  companyName: string;
  website?: string;
  confidence: number;
  matchReasons: string[];
  source: string;
};

export type DiscoveryResult = {
  candidates: CandidateCompany[];
  totalFound: number;
  provider: string;
};
