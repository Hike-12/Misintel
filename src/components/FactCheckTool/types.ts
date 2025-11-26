export type AnalysisResult = {
  isFake: boolean;
  confidence: number;
  summary: string;
  reasons?: string[];
  sources?: string[];
  factCheckResults?: any[];
  safetyCheck?: any;
  inputText?: string;
  inputUrl?: string;
  verificationFlow?: VerificationStep[];
  extractedText?: string;
  author?: {
    name: string;
    credibility_score?: number;
    previous_articles?: Array<{
      title: string;
      url: string;
      date: string;
    }>;
  } | null;
};

export type VerificationStep = {
  id: string;
  label: string;
  status: "pending" | "processing" | "success" | "warning" | "error";
  details: string;
  sources?: Array<{ url: string; title: string }>;
  timestamp?: number;
};

export type TranslationCache = {
  [key: string]: {
    summary: string;
    reasons: string[];
    verificationFlow?: Array<{
      label: string;
      details: string;
    }>;
  };
};


export type InputType = "text" | "url" | "image" | "video" | "audio";
