// app/api/advanced-check/route.ts
import { NextRequest } from 'next/server';
import { getClientIp, checkRateLimit } from './rate-limiter';
import { 
  getFactCheckResults, 
  getCustomSearchResults, 
  checkUrlSafety, 
  getRecentNews 
} from './external-apis';
import { extractUrlContent } from './content-utils';
import { 
  analyzeWithGemini, 
  buildGeminiPrompt, 
  getFallbackAnalysis 
} from './gemini-service';
import {
  buildRateLimitResponse,
  buildConfigErrorResponse,
  buildMissingInputResponse,
  buildSuccessResponse,
  buildPartialFailureResponse,
  buildServerErrorResponse
} from './response-builders';

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


export async function POST(req: NextRequest) {
  // RATE LIMIT CHECK
  const clientIp = getClientIp(req);
  const rl = checkRateLimit(clientIp);
  
  if (rl.limited) {
    console.warn(`⛔ Rate limit exceeded for IP ${clientIp}`);
    return buildRateLimitResponse(rl.retryAfter);
  }

  console.log('🚀 Advanced API Request received');
  const apiKey = process.env.FACT_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return buildConfigErrorResponse();
  }

  try {
    const formData = await req.formData();
    const type = formData.get('type') as string;
    const input = formData.get('input') as string;
    console.log('📝 Request type:', type, 'Input length:', input?.length || 0);

    let contentToAnalyze = '';
    let urlToCheck = '';

    // Handle different input types
    if (type === 'image') {
      const file = formData.get('file') as File;
      if (!file) {
        return buildMissingInputResponse('No image file provided');
      }
      contentToAnalyze = 'Image analysis - content extraction from uploaded image';
    } else if (type === 'url') {
      if (!input?.trim()) {
        return buildMissingInputResponse('No URL provided');
      }
      urlToCheck = input.trim();
      console.log('🔗 Extracting content from URL...');
      contentToAnalyze = await extractUrlContent(urlToCheck);
      if (!contentToAnalyze) {
        contentToAnalyze = `URL content analysis: ${urlToCheck}`;
      }
    } else {
      if (!input?.trim()) {
        return buildMissingInputResponse('No content provided');
      }
      contentToAnalyze = input.trim();
    }

    console.log('🔍 Content to analyze:', contentToAnalyze.substring(0, 200) + '...');

    // Step 1: Get Fact Check Results
    console.log('📊 Calling Fact Check Tools API...');
    const factCheckResults = await getFactCheckResults(contentToAnalyze.substring(0, 500));
    console.log('✅ Fact check results:', factCheckResults.length, 'claims found');

    // Step 2: Get Custom Search Results
    console.log('🔍 Calling Custom Search API...');
    const searchResults = await getCustomSearchResults(contentToAnalyze.substring(0, 200));
    console.log('✅ Search results:', searchResults.length, 'results found');

    // Step 3: Check URL Safety if applicable
    let safetyCheck: { safe: boolean; threats: any[] } = { safe: true, threats: [] };
    if (urlToCheck) {
      console.log('🛡️ Calling Safe Browsing API...');
      safetyCheck = await checkUrlSafety(urlToCheck);
      console.log('✅ Safety check:', safetyCheck.safe ? 'Safe' : 'Threats found');
    }

    // Step 4: Get Recent News
    console.log('📰 Calling NewsAPI for recent articles...');
    const newsResults = await getRecentNews(contentToAnalyze.substring(0, 200));
    console.log('✅ News results:', newsResults.length, 'articles found');

    // Step 5: Prepare data summaries
    const factCheckSummary = factCheckResults.length > 0
      ? factCheckResults.map((claim: any) => ({
        claim: claim.text,
        claimant: claim.claimant,
        reviewers: claim.claimReview?.map((review: any) => ({
          publisher: review.publisher?.name,
          rating: review.textualRating,
          url: review.url
        })) || []
      }))
      : [];

    const searchSummary = searchResults.map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      source: item.displayLink
    }));

    const newsSummary = newsResults.slice(0, 5).map((article: any) => ({
      title: article.title,
      source: article.source?.name,
      publishedAt: article.publishedAt,
      url: article.url,
      description: article.description
    }));

    // Step 6: Build prompt and call Gemini
    const prompt = buildGeminiPrompt(
      contentToAnalyze,
      factCheckSummary,
      searchSummary,
      newsSummary,
      safetyCheck,
      urlToCheck
    );

    console.log('🤖 Calling Gemini API for comprehensive analysis...');
    
    try {
      const analysis = await analyzeWithGemini(
        apiKey,
        prompt,
        factCheckResults,
        searchResults,
        newsResults,
        safetyCheck,
        factCheckSummary,
        searchSummary,
        newsSummary,
        contentToAnalyze,
        type
      );
      
      return buildSuccessResponse(analysis);
      
    } catch (geminiError: any) {
      console.error('❌ Gemini API Error:', geminiError);
      
      // Try fallback analysis
      try {
        const fallbackAnalysis = getFallbackAnalysis(
          factCheckResults,
          safetyCheck,
          contentToAnalyze,
          factCheckSummary,
          searchSummary,
          type
        );
        return buildSuccessResponse(fallbackAnalysis);
      } catch {
        return buildPartialFailureResponse(
          factCheckResults,
          safetyCheck,
          factCheckSummary,
          searchSummary
        );
      }
    }

  } catch (error: any) {
    console.error('❌ Server error:', error);
    return buildServerErrorResponse(error);
  }
}