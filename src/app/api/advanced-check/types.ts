// Type definitions for the advanced-check API

export type AnalysisResult = {
  isFake: boolean;
  confidence: number;
  summary: string;
  reasons: string[];
  sources?: string[];
  factCheckResults?: any[];
  safetyCheck?: any;
  customSearchResults?: any[];
  newsResults?: any[];
  inputText?: string;
  inputUrl?: string;
  timestamp?: string;
  fromCache?: boolean;
  cachedAt?: string;
};

export type RateLimitResult = {
  limited: boolean;
  retryAfter: number;
};

export type SafetyCheckResult = {
  safe: boolean;
  threats: any[];
};
