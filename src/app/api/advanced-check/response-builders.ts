// Response builders for API routes

import { AnalysisResult } from './types';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function buildRateLimitResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({
      isFake: false,
      confidence: 0,
      summary: "Analysis failed",
      reasons: [
        "Request failed with status 429",
        "Please check your input and try again"
      ]
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        ...CORS_HEADERS,
      },
    }
  );
}

export function buildConfigErrorResponse() {
  return new Response(
    JSON.stringify({
      error: "Server configuration error",
      isFake: false,
      confidence: 0,
      summary: "API key not configured",
      reasons: ["Google API key missing from environment variables"]
    }),
    {
      status: 500,
      headers: CORS_HEADERS,
    }
  );
}

export function buildMissingInputResponse(message: string) {
  return new Response(
    JSON.stringify({
      error: "Missing input",
      isFake: false,
      confidence: 0,
      summary: message,
      reasons: [`${message.replace('No ', '').replace(' provided', '')} input is required`]
    }),
    {
      status: 400,
      headers: CORS_HEADERS,
    }
  );
}

export function buildSuccessResponse(analysis: AnalysisResult) {
  return new Response(
    JSON.stringify(analysis),
    {
      status: 200,
      headers: CORS_HEADERS,
    }
  );
}

export function buildPartialFailureResponse(
  factCheckResults: any[],
  safetyCheck: any,
  factCheckSummary: any[],
  searchSummary: any[]
) {
  const hasNegativeFactChecks = factCheckResults.some((claim: any) =>
    claim.claimReview?.some((review: any) =>
      review.textualRating?.toLowerCase().includes('false')
    )
  );
  
  return new Response(
    JSON.stringify({
      error: "AI Analysis partially failed",
      isFake: hasNegativeFactChecks || !safetyCheck.safe,
      confidence: hasNegativeFactChecks || !safetyCheck.safe ? 70 : 60,
      summary: hasNegativeFactChecks
        ? "Fact-checking databases found similar false claims"
        : !safetyCheck.safe
          ? "URL flagged as unsafe"
          : "Basic verification completed, AI analysis unavailable",
      reasons: [
        ...(hasNegativeFactChecks ? ["Similar claims previously debunked"] : []),
        ...(!safetyCheck.safe ? ["URL security concerns"] : []),
        "AI analysis service temporarily unavailable"
      ],
      factCheckResults: factCheckSummary.slice(0, 3),
      safetyCheck: safetyCheck,
      customSearchResults: searchSummary.slice(0, 3)
    }),
    {
      status: 200,
      headers: CORS_HEADERS,
    }
  );
}

export function buildServerErrorResponse(error: any) {
  return new Response(
    JSON.stringify({
      error: "Server error",
      isFake: false,
      confidence: 0,
      summary: "Internal server error occurred",
      reasons: [
        error?.message || "Unknown server error",
        "Please try again later"
      ]
    }),
    {
      status: 500,
      headers: CORS_HEADERS,
    }
  );
}
