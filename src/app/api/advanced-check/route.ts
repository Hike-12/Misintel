// app/api/advanced-check/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from 'next/server';

type AnalysisResult = {
  isFake: boolean;
  confidence: number;
  summary: string;
  reasons: string[];
  sources?: string[];
  factCheckResults?: any[];
  safetyCheck?: any;
  customSearchResults?: any[];
  inputText?: string;
  inputUrl?: string;
};

// --- CORS handler ---
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// --- Rate limiter (in-memory, per-client IP) ---
type RLMap = Map<string, number[]>;

// Adjustable limits
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 6; // max requests per window

// Use globalThis to persist across module reloads in dev
const rlStoreKey = '__misintel_rate_limiter_v1__';
if (!(globalThis as any)[rlStoreKey]) {
  (globalThis as any)[rlStoreKey] = new Map() as RLMap;
}
const rateLimitMap = (globalThis as any)[rlStoreKey] as RLMap;

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('fastly-client-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = rateLimitMap.get(ip) || [];
  const recent = hits.filter(ts => ts > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter: retryAfterSec };
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return { limited: false, retryAfter: 0 };
}

// Helper function to call Fact Check Tools API
async function getFactCheckResults(query: string) {
  const apiKey = process.env.FACT_GEMINI_API_KEY;
  try {
    const response = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&key=${apiKey}`);
    if (!response.ok) {
      console.log('❌ Fact Check API failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.claims || [];
  } catch (error) {
    console.error('❌ Fact Check API error:', error);
    return [];
  }
}

// Helper function to call Google Custom Search API
async function getCustomSearchResults(query: string) {
  const apiKey = process.env.CUSTOM_SEARCH_API_KEY;
  const cx = process.env.CUSTOM_SEARCH_ENGINE_ID;
  if (!cx) {
    console.log('⚠️ Custom Search Engine ID not configured');
    return [];
  }
  try {
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`);
    if (!response.ok) {
      console.log('❌ Custom Search API failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('❌ Custom Search API error:', error);
    return [];
  }
}

// Helper function to call Safe Browsing API
async function checkUrlSafety(url: string) {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  try {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client: {
          clientId: "truthguard",
          clientVersion: "1.0.0"
        },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "POTENTIALLY_HARMFUL_APPLICATION", "UNWANTED_SOFTWARE"],
          platformTypes: ["ALL_PLATFORMS"],
          threatEntryTypes: ["URL"],
          threatEntries: [
            { url: url }
          ]
        }
      })
    });
    if (!response.ok) {
      console.log('❌ Safe Browsing API failed:', response.status);
      return { safe: true, threats: [] };
    }
    const data = await response.json();
    return {
      safe: !data.matches || data.matches.length === 0,
      threats: data.matches || []
    };
  } catch (error) {
    console.error('❌ Safe Browsing API error:', error);
    return { safe: true, threats: [] };
  }
}

// Helper function to extract content from URL
async function extractUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TruthGuard-Bot/1.0'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const html = await response.text();
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);
    return textContent;
  } catch (error) {
    console.error('Error extracting URL content:', error);
    return '';
  }
}

export async function POST(req: NextRequest) {
  // RATE LIMIT CHECK
  const clientIp = getClientIp(req);
  const rl = checkRateLimit(clientIp);
if (rl.limited) {
  console.warn(`⛔ Rate limit exceeded for IP ${clientIp}`);
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
        "Retry-After": String(rl.retryAfter),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

  console.log('🚀 Advanced API Request received');
  const apiKey = process.env.FACT_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key found');
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
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }

  try {
    const formData = await req.formData();
    const type = formData.get('type') as string;
    const input = formData.get('input') as string;
    console.log('📝 Request type:', type, 'Input length:', input?.length || 0);

    let contentToAnalyze = '';
    let urlToCheck = '';

    if (type === 'image') {
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(
          JSON.stringify({
            error: "Missing input",
            isFake: false,
            confidence: 0,
            summary: "No image file provided",
            reasons: ["Image upload required for image analysis"]
          }),
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      }
      contentToAnalyze = 'Image analysis - content extraction from uploaded image';
    } else if (type === 'url') {
      if (!input?.trim()) {
        return new Response(
          JSON.stringify({
            error: "Missing input",
            isFake: false,
            confidence: 0,
            summary: "No URL provided",
            reasons: ["URL input is required"]
          }),
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      }
      urlToCheck = input.trim();
      console.log('🔗 Extracting content from URL...');
      contentToAnalyze = await extractUrlContent(urlToCheck);
      if (!contentToAnalyze) {
        contentToAnalyze = `URL content analysis: ${urlToCheck}`;
      }
    } else {
      if (!input?.trim()) {
        return new Response(
          JSON.stringify({
            error: "Missing input",
            isFake: false,
            confidence: 0,
            summary: "No content provided",
            reasons: ["Text input is required"]
          }),
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      }
      contentToAnalyze = input.trim();
    }

    console.log('🔍 Content to analyze:', contentToAnalyze.substring(0, 200) + '...');

    // Step 1: Get Fact Check Results (API 1)
    console.log('📊 Calling Fact Check Tools API...');
    const factCheckResults = await getFactCheckResults(contentToAnalyze.substring(0, 500));
    console.log('✅ Fact check results:', factCheckResults.length, 'claims found');

    // Step 2: Get Custom Search Results (API 2)
    console.log('🔍 Calling Custom Search API...');
    const searchResults = await getCustomSearchResults(contentToAnalyze.substring(0, 200));
    console.log('✅ Search results:', searchResults.length, 'results found');

    // Step 3: Check URL Safety if applicable (API 3)
    let safetyCheck = { safe: true, threats: [] };
    if (urlToCheck) {
      console.log('🛡️ Calling Safe Browsing API...');
      safetyCheck = await checkUrlSafety(urlToCheck);
      console.log('✅ Safety check:', safetyCheck.safe ? 'Safe' : 'Threats found');
    }

    // Step 4: Prepare comprehensive prompt for Gemini (API 4)
    const factCheckSummary = factCheckResults.length > 0
      ? factCheckResults.map((claim: { text: any; claimant: any; claimReview: any[]; }) => ({
        claim: claim.text,
        claimant: claim.claimant,
        reviewers: claim.claimReview?.map((review: any) => ({
          publisher: review.publisher?.name,
          rating: review.textualRating,
          url: review.url
        })) || []
      }))
      : [];

    const searchSummary = searchResults.map((item: { title: any; snippet: any; link: any; displayLink: any; }) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      source: item.displayLink
    }));

    const comprehensivePrompt = `You are an expert fact-checker analyzing content for misinformation. 

CONTENT TO ANALYZE:
"${contentToAnalyze.substring(0, 1500)}"

FACT-CHECK DATABASE RESULTS:
${factCheckSummary.length > 0 ? JSON.stringify(factCheckSummary, null, 2) : "No direct fact-check matches found"}

SEARCH VERIFICATION RESULTS:
${searchSummary.length > 0 ? JSON.stringify(searchSummary.slice(0, 5), null, 2) : "No verification sources found"}

URL SAFETY CHECK:
${urlToCheck ? `URL: ${urlToCheck} - Safety Status: ${safetyCheck.safe ? 'Safe' : 'Potentially Unsafe'}` : "No URL provided"}

ANALYSIS INSTRUCTIONS:
1. Analyze the content for misinformation indicators
2. Cross-reference with fact-check database results
3. Evaluate source credibility from search results
4. Consider URL safety if applicable
5. Look for common misinformation patterns: sensational headlines, lack of sources, emotional manipulation, conspiracy theories
6. Provide reasoning based on the evidence gathered from all sources

Return ONLY a valid JSON response with no additional text:

{
  "isFake": boolean (true if likely misinformation),
  "confidence": number (60-95, based on evidence strength),
  "summary": "Comprehensive analysis summary in 2-3 sentences",
  "reasons": ["Specific reason 1", "Specific reason 2", "Specific reason 3"],
  "sources": ["Source URL 1", "Source URL 2"] (from fact-check or search results)
}`;

    // Step 5: Call Gemini API with comprehensive analysis
    console.log('🤖 Calling Gemini API for comprehensive analysis...');
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      let model;
      try {
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      } catch {
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      }
      const result = await model.generateContent(comprehensivePrompt);
      const response = await result.response;
      const text = response.text();
      console.log('📥 Gemini response received, length:', text.length);

      // Parse the JSON response
      let analysis: AnalysisResult;
      try {
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
        analysis = {
          isFake: Boolean(parsed.isFake),
          confidence: Math.min(95, Math.max(60, Number(parsed.confidence) || 75)),
          summary: String(parsed.summary || "Multi-source analysis completed"),
          reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ["Analysis completed using multiple verification sources"],
          sources: Array.isArray(parsed.sources) && parsed.sources.length > 0
            ? parsed.sources
            : [...new Set([
              ...factCheckResults.slice(0, 2).map((claim: any) =>
                claim.claimReview?.[0]?.url
              ).filter(Boolean),
              ...searchResults.slice(0, 2).map((item: string) => item.link).filter(Boolean),
              "https://www.factcheck.org",
              "https://www.snopes.com"
            ])].slice(0, 4),
          factCheckResults: factCheckSummary.slice(0, 3),
          safetyCheck: safetyCheck,
          customSearchResults: searchSummary.slice(0, 3),
          inputText: type === 'text' ? contentToAnalyze : undefined,
          inputUrl: type === 'url' ? urlToCheck : undefined
        };
        if (!safetyCheck.safe && safetyCheck.threats.length > 0) {
          analysis.reasons.unshift('URL flagged as potentially unsafe by security systems');
          analysis.isFake = true;
          analysis.confidence = Math.max(analysis.confidence, 85);
        }
        console.log('✅ Comprehensive analysis successful');
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        const hasNegativeFactChecks = factCheckResults.some((claim: any) =>
          claim.claimReview?.some((review: any) =>
            review.textualRating?.toLowerCase().includes('false') ||
            review.textualRating?.toLowerCase().includes('misleading')
          )
        );
        const looksSpammy = /shocking|unbelievable|doctors hate|miracle|secret|breaking|urgent|click here|you won't believe|this will amaze/i.test(contentToAnalyze);
        const isFakeContent = hasNegativeFactChecks || looksSpammy || !safetyCheck.safe;
        analysis = {
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
          inputUrl: type === 'url' ? urlToCheck : undefined
        };
      }

      return new Response(
        JSON.stringify(analysis),
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );

    } catch (geminiError: any) {
      console.error('❌ Gemini API Error:', geminiError);
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
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

  } catch (error: any) {
    console.error('❌ Server error:', error);
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
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}