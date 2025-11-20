// app/api/advanced-check/route.ts
import { NextRequest } from "next/server";
import { getClientIp, checkRateLimit } from "./rate-limiter";
import {
  getFactCheckResults,
  getCustomSearchResults,
  checkUrlSafety,
  getRecentNews,
} from "./external-apis";
import { extractUrlContent } from "./content-utils";
import {
  analyzeWithGemini,
  buildGeminiPrompt,
  getFallbackAnalysis,
} from "./gemini-service";
import {
  buildRateLimitResponse,
  buildConfigErrorResponse,
  buildMissingInputResponse,
  buildSuccessResponse,
  buildPartialFailureResponse,
  buildServerErrorResponse,
} from "./response-builders";
import { getCachedAnalysis, cacheAnalysis, CACHE_CONFIG } from "@/lib/redis";

// --- Type Definitions ---
interface AuthorInfo {
  name: string;
  credibility_score?: number;
  previous_articles?: Array<{
    title: string;
    url: string;
    date: string;
  }>;
}

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

// ===== AUTHOR EXTRACTION FUNCTIONS =====

async function extractAuthorFromUrl(url: string): Promise<AuthorInfo | null> {
  console.log('\n🔍 ===== STARTING AUTHOR EXTRACTION =====');
  console.log('URL:', url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      console.log('❌ Fetch failed:', response.status);
      
      const domain = new URL(url).hostname;
      if ((response.status === 403 || response.status === 401) && 
          (domain.includes('pnas.org') || domain.includes('nature.com') || 
           domain.includes('science.org') || domain.includes('cell.com') ||
           domain.includes('sciencedirect.com'))) {
        console.log('📚 Academic site blocked - using fallback');
        return {
          name: 'Research Authors',
          credibility_score: 92,
          previous_articles: [{
            title: 'Peer-reviewed academic research',
            url: url,
            date: 'Published in scientific journal'
          }]
        };
      }
      
      return getSmartFallbackAuthor(url);
    }
    
    const html = await response.text();
    console.log('✅ Page fetched, size:', html.length, 'bytes');

    const authorName = extractAuthorFromHTML(html, url);

    if (!authorName) {
      console.log('\n❌ NO AUTHOR FOUND - using fallback');
      return getSmartFallbackAuthor(url);
    }

    console.log('\n✅ ===== AUTHOR FOUND:', authorName, '=====\n');
    
    const authorDetails = await getAuthorDetails(authorName, url);
    
    return {
      name: authorName,
      credibility_score: authorDetails.credibility_score,
      previous_articles: authorDetails.previous_articles
    };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    return getSmartFallbackAuthor(url);
  }
}

function extractAuthorFromHTML(html: string, url: string): string | null {
  console.log('\n🔎 TRYING ALL EXTRACTION PATTERNS...\n');
  
  const domain = new URL(url).hostname;
  
  // PATTERN 1: JSON-LD
  console.log('Pattern 1: JSON-LD structured data...');
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const jsonData = JSON.parse(jsonContent);
        
        const author = jsonData.author || 
                      (jsonData['@graph'] && jsonData['@graph'].find((item: any) => item.author)?.author);
        
        if (author) {
          const name = typeof author === 'string' ? author : 
                      author.name || 
                      (Array.isArray(author) ? author[0]?.name : null);
          
          if (name && typeof name === 'string') {
            console.log('✅ Found in JSON-LD:', name);
            return cleanAuthorName(name);
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  // PATTERN 2: META TAGS
  console.log('Pattern 2: Meta tags...');
  const metaPatterns = [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']author["']/gi,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']citation_author["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']DC\.Creator["'][^>]+content=["']([^"']+)["']/gi,
  ];

  for (const pattern of metaPatterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      if (match[1] && !match[1].startsWith('@') && match[1].length > 2) {
        console.log('✅ Found in meta tag:', match[1]);
        return cleanAuthorName(match[1]);
      }
    }
  }

  // PATTERN 3: SCIENCEDIRECT & ACADEMIC
  console.log('Pattern 3: ScienceDirect/Elsevier patterns...');
  if (domain.includes('sciencedirect.com') || domain.includes('elsevier.com')) {
    console.log('  🔬 Detected ScienceDirect...');
    
    const authorSectionPatterns = [
      /<div[^>]*class=["'][^"']*[Aa]uthor[^"']*["'][^>]*>([\s\S]{0,5000}?)<\/div>/i,
      /<section[^>]*class=["'][^"']*[Aa]uthor[^"']*["'][^>]*>([\s\S]{0,5000}?)<\/section>/i,
    ];
    
    let authorSection = '';
    for (const pattern of authorSectionPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        authorSection = match[1];
        console.log('  ✅ Found author section');
        break;
      }
    }
    
    if (!authorSection) {
      authorSection = html.substring(0, 10000);
    }
    
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+){1,2})\b/g;
    const matches = [...authorSection.matchAll(namePattern)];
    
    const foundAuthors: string[] = [];
    const seenNames = new Set<string>();
    
    for (const match of matches) {
      const name = match[1].trim();
      const normalized = name.toLowerCase();
      
      const words = name.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && 
          name.length > 5 && name.length < 50 &&
          isValidAuthorName(name) && 
          !seenNames.has(normalized)) {
        
        foundAuthors.push(name);
        seenNames.add(normalized);
        
        if (foundAuthors.length >= 5) break;
      }
    }
    
    if (foundAuthors.length > 0) {
      const filtered = foundAuthors.filter(name => {
        const lower = name.toLowerCase();
        return !lower.includes('download') && 
               !lower.includes('volume') && 
               !lower.includes('journal') &&
               !lower.includes('article') &&
               !lower.includes('natural') &&
               !lower.includes('research');
      });
      
      if (filtered.length > 0) {
        const authorList = filtered.length > 1 
          ? `${filtered[0]} et al.` 
          : filtered[0];
        console.log('✅ Found ScienceDirect authors:', authorList);
        return authorList;
      }
    }
  }

  // PATTERN 4: REL="AUTHOR"
  console.log('Pattern 4: rel="author" links...');
  const relAuthorPattern = /<a[^>]+rel=["']author["'][^>]*>([^<]+)<\/a>/gi;
  const relMatches = [...html.matchAll(relAuthorPattern)];
  for (const match of relMatches) {
    if (match[1] && match[1].trim().length > 2) {
      console.log('✅ Found in rel="author":', match[1]);
      return cleanAuthorName(match[1]);
    }
  }

  // PATTERN 5: HTML ELEMENTS
  console.log('Pattern 5: HTML elements...');
  const htmlPatterns = [
    /<[^>]+itemprop=["']author["'][^>]*>([^<]+)</gi,
    /<span[^>]+class=["'][^"']*author[^"']*["'][^>]*>(?:By\s+)?([^<]+)</gi,
    /<div[^>]+class=["'][^"']*author[^"']*["'][^>]*>(?:By\s+)?([^<]+)</gi,
    /<p[^>]+class=["'][^"']*author[^"']*["'][^>]*>(?:By\s+)?([^<]+)</gi,
    /<span[^>]+class=["'][^"']*byline[^"']*["'][^>]*>(?:By\s+)?([^<]+)</gi,
  ];

  for (const pattern of htmlPatterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        const cleaned = cleanAuthorName(match[1]);
        if (isValidAuthorName(cleaned)) {
          console.log('✅ Found in HTML element:', cleaned);
          return cleaned;
        }
      }
    }
  }

  // PATTERN 6: BBC/NEWS
  console.log('Pattern 6: News site patterns...');
  if (domain.includes('bbc')) {
    const bbcPattern = /<span[^>]*>By\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)<\/span>/gi;
    const bbcMatches = [...html.matchAll(bbcPattern)];
    for (const match of bbcMatches) {
      if (match[1]) {
        console.log('✅ Found with BBC pattern:', match[1]);
        return cleanAuthorName(match[1]);
      }
    }
  }

  // PATTERN 7: PLAIN TEXT
  console.log('Pattern 7: Plain text patterns...');
  const textPatterns = [
    /By\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\s|,|<|$)/g,
    /Written by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\s|,|<|$)/gi,
  ];

  const textSnippet = html.substring(0, 5000);
  for (const pattern of textPatterns) {
    const matches = [...textSnippet.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        const cleaned = cleanAuthorName(match[1]);
        if (isValidAuthorName(cleaned)) {
          console.log('✅ Found with text pattern:', cleaned);
          return cleaned;
        }
      }
    }
  }

  console.log('❌ No patterns matched');
  return null;
}

function cleanAuthorName(name: string): string {
  return name
    .replace(/^by\s+/i, '')
    .replace(/^written by\s+/i, '')
    .replace(/^author:\s*/i, '')
    .replace(/^@/, '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim();
}

function isValidAuthorName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 60) return false;
  if (!/[A-Za-z]/.test(name)) return false;
  
  const blacklist = [
    'login', 'sign', 'subscribe', 'read', 'more', 'news', 
    'home', 'about', 'menu', 'search', 'share', 'email',
    'show more', 'view', 'open access', 'corresponding author'
  ];
  
  const lowerName = name.toLowerCase();
  if (blacklist.some(word => lowerName.includes(word))) return false;
  
  return true;
}

async function getAuthorDetails(authorName: string, originalUrl: string) {
  try {
    const domain = new URL(originalUrl).hostname;
    let credibility_score = calculateDomainCredibility(domain);
    let previous_articles: any[] = [];

    const API_KEY = process.env.CUSTOM_SEARCH_API_KEY;
    const CX = process.env.CUSTOM_SEARCH_ENGINE_ID;
    
    if (API_KEY && CX) {
      try {
        console.log(`🔍 Searching for previous articles by: ${authorName}`);
        
        const query = `"${authorName}" site:${domain}`;
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}&num=8`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          previous_articles = data.items
            .filter((item: any) => item.link !== originalUrl)
            .map((item: any) => ({
              title: item.title || 'Article',
              url: item.link,
              date: extractDateFromSnippet(item.snippet) || 'Recent'
            }))
            .slice(0, 5);
          
          console.log(`✅ Found ${previous_articles.length} previous articles`);
          
          if (previous_articles.length >= 5) credibility_score += 15;
          else if (previous_articles.length >= 3) credibility_score += 10;
          else if (previous_articles.length >= 1) credibility_score += 5;
        }
      } catch (searchError) {
        console.log('⚠️ Search failed');
      }
    }

    if (previous_articles.length === 0) {
      previous_articles = getDomainBasedArticles(domain);
    }

    return {
      credibility_score: Math.min(Math.max(credibility_score, 0), 100),
      previous_articles
    };
    
  } catch (error) {
    return {
      credibility_score: 70,
      previous_articles: []
    };
  }
}

function extractDateFromSnippet(snippet: string): string {
  if (!snippet) return '';
  
  const patterns = [
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    /(\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match) return match[1];
  }

  return '';
}

function getDomainBasedArticles(domain: string) {
  const cleanDomain = domain.replace('www.', '');
  return [{
    title: `More from ${cleanDomain}`,
    url: `https://${cleanDomain}`,
    date: 'Various'
  }];
}

function calculateDomainCredibility(domain: string): number {
  const trustedDomains = [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'nytimes.com', 'washingtonpost.com', 'theguardian.com',
    'npr.org', 'pbs.org', 'wsj.com', 'ft.com',
    'nature.com', 'science.org', 'pnas.org', 'cell.com',
    'sciencedirect.com', 'elsevier.com',
    'indianexpress.com', 'thehindu.com', 'ndtv.com',
  ];
  
  const moderateDomains = [
    'cnn.com', 'nbcnews.com', 'cbsnews.com',
    'forbes.com', 'bloomberg.com',
    'hindustantimes.com', 'timesofindia.com',
  ];

  const lowerDomain = domain.toLowerCase().replace('www.', '');
  
  if (trustedDomains.some(d => lowerDomain.includes(d))) return 88;
  if (moderateDomains.some(d => lowerDomain.includes(d))) return 75;
  
  return 65;
}

function getSmartFallbackAuthor(url: string): AuthorInfo {
  const domain = new URL(url).hostname.replace('www.', '');
  const domainName = domain.split('.')[0];
  const capitalizedName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
  
  return {
    name: `${capitalizedName} Editorial Team`,
    credibility_score: calculateDomainCredibility(domain),
    previous_articles: getDomainBasedArticles(domain)
  };
}

// ===== MAIN POST HANDLER =====

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rl = checkRateLimit(clientIp);

  if (rl.limited) {
    console.warn(`⛔ Rate limit exceeded for IP ${clientIp}`);
    return buildRateLimitResponse(rl.retryAfter);
  }

  console.log("🚀 Advanced API Request received");
  const apiKey = process.env.FACT_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ No API key found");
    return buildConfigErrorResponse();
  }

  try {
    const formData = await req.formData();
    const type = (formData.get("type") as string) || "";
    const input = (formData.get("input") as string) || "";
    const forceFresh = formData.get("forceFresh") === "true";

    let contentToAnalyze = "";
    let urlToCheck = "";

    // Handle different input types
    if (type === "image") {
      const file = formData.get("image") as File;
      if (!file) {
        return buildMissingInputResponse("No image file provided");
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");

        console.log("🔍 Starting OCR processing...");

        const ocrFormData = new FormData();
        ocrFormData.append("base64Image", `data:${file.type};base64,${base64}`);
        ocrFormData.append("apikey", "helloworld");
        ocrFormData.append("language", "eng");
        ocrFormData.append("isOverlayRequired", "false");

        const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          body: ocrFormData,
        });

        const ocrResult = await ocrResponse.json();

        if (ocrResult.IsErroredOnProcessing) {
          console.error("OCR Error:", ocrResult.ErrorMessage);
          return buildMissingInputResponse(
            "Failed to process image: " +
              (ocrResult.ErrorMessage?.[0] || "Unknown error")
          );
        }

        contentToAnalyze =
          ocrResult.ParsedResults?.[0]?.ParsedText?.trim() || "";

        if (!contentToAnalyze) {
          return buildMissingInputResponse("No text found in the image");
        }
      } catch (ocrError) {
        console.error("❌ OCR Error:", ocrError);
        return buildServerErrorResponse(ocrError);
      }
    } else if (type === "url") {
      if (!input?.trim()) {
        return buildMissingInputResponse("No URL provided");
      }
      urlToCheck = input.trim();

      // Check cache
      if (!forceFresh) {
        console.log("🔍 Checking cache...");
        const cachedResult = await getCachedAnalysis(urlToCheck);

        if (cachedResult) {
          console.log("✅ Cache HIT");
          const parsedCache =
            typeof cachedResult === "string"
              ? JSON.parse(cachedResult)
              : cachedResult;

          return buildSuccessResponse({
            ...parsedCache,
            inputUrl: urlToCheck,
            fromCache: true,
          });
        }
      }

      contentToAnalyze = await extractUrlContent(urlToCheck);
      if (!contentToAnalyze) {
        contentToAnalyze = `URL: ${urlToCheck}`;
      }
    } else {
      if (!input?.trim()) {
        return buildMissingInputResponse("No content provided");
      }
      contentToAnalyze = input.trim();
    }

    // ===== EXTRACT AUTHOR IF URL =====
    let authorInfo: AuthorInfo | null = null;
    if (type === "url" && urlToCheck) {
      authorInfo = await extractAuthorFromUrl(urlToCheck);
    }

    // Continue with analysis
    const factCheckResults = await getFactCheckResults(
      contentToAnalyze.substring(0, 500)
    );
    const searchResults = await getCustomSearchResults(
      contentToAnalyze.substring(0, 200)
    );

    let safetyCheck: { safe: boolean; threats: any[] } = {
      safe: true,
      threats: [],
    };
    if (urlToCheck) {
      safetyCheck = await checkUrlSafety(urlToCheck);
    }

    const newsResults = await getRecentNews(contentToAnalyze.substring(0, 200));

    const factCheckSummary = factCheckResults.map((claim: any) => ({
      claim: claim.text,
      claimant: claim.claimant,
      reviewers:
        claim.claimReview?.map((review: any) => ({
          publisher: review.publisher?.name,
          rating: review.textualRating,
          url: review.url,
        })) || [],
    }));

    const searchSummary = searchResults.map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      source: item.displayLink,
    }));

    const newsSummary = newsResults.slice(0, 5).map((article: any) => ({
      title: article.title,
      source: article.source?.name,
      publishedAt: article.publishedAt,
      url: article.url,
      description: article.description,
    }));

    const prompt = buildGeminiPrompt(
      contentToAnalyze,
      factCheckSummary,
      searchSummary,
      newsSummary,
      safetyCheck,
      urlToCheck
    );

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

      // Cache for URL queries
      if (type === "url" && urlToCheck) {
        const resultToCache = {
          ...analysis,
          author: authorInfo,
          timestamp: new Date().toISOString(),
        };

        let customTTL = CACHE_CONFIG.URL_CACHE_TTL;
        if (analysis.confidence < 70) {
          customTTL = 60 * 60 * 12;
        } else if (analysis.confidence >= 90) {
          customTTL = 60 * 60 * 24 * 14;
        }

        if (!analysis.safetyCheck?.safe) {
          customTTL = 60 * 60 * 6;
        }

        console.log(`💾 Caching result (TTL: ${customTTL}s)`);
        await cacheAnalysis(urlToCheck, resultToCache, customTTL);
      }

      return buildSuccessResponse({
        ...(analysis as any),
        author: authorInfo,
        extractedText: type === "image" ? contentToAnalyze : undefined,
        fromCache: false,
      });
    } catch (geminiError: any) {
      console.error("❌ Gemini API Error:", geminiError);

      try {
        const fallbackAnalysis = getFallbackAnalysis(
          factCheckResults,
          safetyCheck,
          contentToAnalyze,
          factCheckSummary,
          searchSummary,
          type
        );

        return buildSuccessResponse({
          ...fallbackAnalysis,
          author: authorInfo,
          fromCache: false,
        });
      } catch {
        const partialResponse = buildPartialFailureResponse(
          factCheckResults,
          safetyCheck,
          factCheckSummary,
          searchSummary
        );

        const partialJson = await partialResponse.json();

        return new Response(
          JSON.stringify({
            ...partialJson,
            author: authorInfo,
          }),
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          }
        );
      }
    }
  } catch (error: any) {
    console.error("❌ Server error:", error);
    return buildServerErrorResponse(error);
  }
}