// Gemini AI analysis service

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalysisResult, SafetyCheckResult } from './types';

/**
 * Build comprehensive prompt for Gemini AI
 */
export function buildGeminiPrompt(
  contentToAnalyze: string,
  factCheckSummary: any[],
  searchSummary: any[],
  newsSummary: any[],
  safetyCheck: SafetyCheckResult,
  urlToCheck: string
): string {
  const now = new Date();
  const todayFormatted = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timestamp = now.toISOString();
  
  return `You are an expert fact-checker analyzing content for misinformation. 

⏰ CRITICAL: TODAY'S DATE AND TIME
Current Date: ${todayFormatted}
ISO Timestamp: ${timestamp}
**IMPORTANT: Any article dated AFTER this timestamp is from the FUTURE and is speculative/prediction, NOT a confirmed fact. Any article dated BEFORE this timestamp is from the PAST and may be confirmed news.**

CONTENT TO ANALYZE:
"${contentToAnalyze.substring(0, 1500)}"

RECENT NEWS ARTICLES (Last 7 days):
${newsSummary.length > 0 ? JSON.stringify(newsSummary, null, 2) : "No recent news articles found"}

FACT-CHECK DATABASE RESULTS:
${factCheckSummary.length > 0 ? JSON.stringify(factCheckSummary, null, 2) : "No direct fact-check matches found"}

SEARCH VERIFICATION RESULTS:
${searchSummary.length > 0 ? JSON.stringify(searchSummary.slice(0, 5), null, 2) : "No verification sources found"}

URL SAFETY CHECK:
${urlToCheck ? `URL: ${urlToCheck} - Safety Status: ${safetyCheck.safe ? 'Safe' : 'Potentially Unsafe'}` : "No URL provided"}

ANALYSIS INSTRUCTIONS:
1. **ALWAYS compare article dates with today's date (${todayFormatted}) to determine if they are past events or future predictions**
2. Prioritize recent news articles from reputable sources (within last 48 hours)
3. Cross-reference with fact-check database results
4. Evaluate source credibility from search results
5. Consider URL safety if applicable
6. Look for common misinformation patterns
7. If recent news from 2+ trusted sources confirms a claim, increase confidence
8. **If articles are dated in the future (after ${todayFormatted}), they are SPECULATIVE, not factual**
9. Provide reasoning based on evidence from all sources

Return ONLY a valid JSON response with no additional text:

{
  "isFake": boolean (true if likely misinformation),
  "confidence": number (60-95, based on evidence strength),
  "summary": "Comprehensive analysis summary in 2-3 sentences",
  "reasons": ["Specific reason 1", "Specific reason 2", "Specific reason 3"],
  "sources": ["Source URL 1", "Source URL 2"] (from fact-check, news, or search results)
}`;
}

/**
 * Call Gemini AI for analysis
 */
export async function analyzeWithGemini(
  apiKey: string,
  prompt: string,
  factCheckResults: any[],
  searchResults: any[],
  newsResults: any[],
  safetyCheck: SafetyCheckResult,
  factCheckSummary: any[],
  searchSummary: any[],
  newsSummary: any[],
  contentToAnalyze: string,
  type: string
): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let model;
  
  try {
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  } catch {
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log('📥 Gemini response received, length:', text.length);

  // Parse the JSON response
  let jsonString = text.trim();
  if (jsonString.includes('```')) {
    const jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }
  }
  
  const jsonStart = jsonString.indexOf('{');
  const jsonEnd = jsonString.lastIndexOf('}') + 1;
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    jsonString = jsonString.slice(jsonStart, jsonEnd);
  }
  
  const parsed = JSON.parse(jsonString);
  
  const analysis: AnalysisResult = {
    isFake: Boolean(parsed.isFake),
    confidence: Math.min(95, Math.max(60, Number(parsed.confidence) || 75)),
    summary: String(parsed.summary || "Multi-source analysis completed"),
    reasons: Array.isArray(parsed.reasons)
      ? parsed.reasons
      : ["Analysis completed using multiple verification sources"],
    sources: Array.isArray(parsed.sources) && parsed.sources.length > 0
      ? parsed.sources
      : [...new Set([
          ...newsResults.slice(0, 2).map((article: any) => article.url).filter(Boolean),
          ...factCheckResults.slice(0, 2).map((claim: any) =>
            claim.claimReview?.[0]?.url
          ).filter(Boolean),
          ...searchResults.slice(0, 2).map((item: any) => item.link).filter(Boolean),
          "https://www.factcheck.org",
          "https://www.snopes.com"
        ])].slice(0, 6),
    factCheckResults: factCheckSummary.slice(0, 3),
    safetyCheck: safetyCheck,
    customSearchResults: searchSummary.slice(0, 3),
    newsResults: newsSummary.slice(0, 3),
    inputText: type === 'text' ? contentToAnalyze : undefined,
    inputUrl: type === 'url' ? contentToAnalyze : undefined
  };
  
  if (!safetyCheck.safe && safetyCheck.threats.length > 0) {
    analysis.reasons.unshift('URL flagged as potentially unsafe by security systems');
    analysis.isFake = true;
    analysis.confidence = Math.max(analysis.confidence, 85);
  }
  
  console.log('✅ Comprehensive analysis successful');
  return analysis;
}

/**
 * Fallback analysis when Gemini fails or JSON parsing fails
 */
export function getFallbackAnalysis(
  factCheckResults: any[],
  safetyCheck: SafetyCheckResult,
  contentToAnalyze: string,
  factCheckSummary: any[],
  searchSummary: any[],
  type: string
): AnalysisResult {
  const hasNegativeFactChecks = factCheckResults.some((claim: any) =>
    claim.claimReview?.some((review: any) =>
      review.textualRating?.toLowerCase().includes('false') ||
      review.textualRating?.toLowerCase().includes('misleading')
    )
  );
  
  const looksSpammy = /shocking|unbelievable|doctors hate|miracle|secret|breaking|urgent|click here|you won't believe|this will amaze/i.test(contentToAnalyze);
  const isFakeContent = hasNegativeFactChecks || looksSpammy || !safetyCheck.safe;
  
  return {
    isFake: isFakeContent,
    confidence: 75,
    summary: isFakeContent
      ? "Content flagged by multiple verification systems as potentially misleading"
      : "Content passed basic verification checks across multiple sources",
    reasons: [
      ...(hasNegativeFactChecks ? ["Similar claims fact-checked as false or misleading"] : []),
      ...(looksSpammy ? ["Contains typical misinformation language patterns"] : []),
      ...(!safetyCheck.safe ? ["URL flagged by security systems"] : []),
      ...(isFakeContent ? [] : ["No obvious red flags detected", "Multiple verification sources consulted"])
    ],
    sources: [
      ...factCheckResults.slice(0, 2).map((claim: any) => claim.claimReview?.[0]?.url).filter(Boolean),
      "https://www.factcheck.org"
    ].slice(0, 3),
    factCheckResults: factCheckSummary.slice(0, 3),
    safetyCheck: safetyCheck,
    customSearchResults: searchSummary.slice(0, 3),
    inputText: type === 'text' ? contentToAnalyze : undefined,
    inputUrl: type === 'url' ? contentToAnalyze : undefined
  };
}
