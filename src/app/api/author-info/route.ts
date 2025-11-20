// src/app/api/author-info/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface AuthorInfo {
  name: string;
  bio?: string;
  credibility_score?: number;
  previous_articles?: Array<{
    title: string;
    url: string;
    date: string;
    reliability?: string;
  }>;
  social_profiles?: {
    twitter?: string;
    linkedin?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const url = formData.get('url') as string;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract author from the webpage
    const authorInfo = await extractAuthorInfo(url);

    return NextResponse.json({
      success: true,
      author: authorInfo
    });

  } catch (error) {
    console.error('Author extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract author information' },
      { status: 500 }
    );
  }
}

async function extractAuthorInfo(url: string): Promise<AuthorInfo | null> {
  try {
    // Fetch the webpage content
    const response = await fetch(url);
    const html = await response.text();

    // Extract author name using multiple patterns
    const authorPatterns = [
      /<meta\s+name="author"\s+content="([^"]+)"/i,
      /<span\s+class="[^"]*author[^"]*">([^<]+)</i,
      /<div\s+class="[^"]*byline[^"]*">.*?by\s+([^<]+)</i,
      /"author":\s*{\s*"name":\s*"([^"]+)"/i,
    ];

    let authorName = '';
    for (const pattern of authorPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        authorName = match[1].trim();
        break;
      }
    }

    if (!authorName) {
      return null;
    }

    // Use Google Custom Search to find more articles by this author
    const previousArticles = await searchAuthorArticles(authorName, url);

    // Calculate credibility score based on various factors
    const credibilityScore = calculateCredibilityScore(previousArticles, html);

    return {
      name: authorName,
      credibility_score: credibilityScore,
      previous_articles: previousArticles.slice(0, 5), // Show top 5
    };

  } catch (error) {
    console.error('Error extracting author:', error);
    return null;
  }
}

async function searchAuthorArticles(authorName: string, currentUrl: string) {
  const API_KEY = process.env.CUSTOM_SEARCH_API_KEY;
  const CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!API_KEY || !CX) {
    return [];
  }

  try {
    const domain = new URL(currentUrl).hostname;
    const query = `"${authorName}" site:${domain}`;
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}&num=10`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      date: item.snippet.match(/\d{1,2}\s+\w+\s+\d{4}/)?.[0] || 'Unknown date',
      snippet: item.snippet
    }));

  } catch (error) {
    console.error('Error searching author articles:', error);
    return [];
  }
}

function calculateCredibilityScore(articles: any[], html: string): number {
  let score = 50; // Start at neutral

  // Factor 1: Number of previous articles (more = more established)
  if (articles.length > 10) score += 15;
  else if (articles.length > 5) score += 10;
  else if (articles.length > 2) score += 5;

  // Factor 2: Check if author has verification badges
  if (html.includes('verified') || html.includes('staff writer')) {
    score += 20;
  }

  // Factor 3: Domain credibility (basic check)
  const trustedDomains = ['bbc.com', 'reuters.com', 'apnews.com', 'nytimes.com', 'theguardian.com'];
  if (articles.some(a => trustedDomains.some(d => a.url.includes(d)))) {
    score += 15;
  }

  return Math.min(Math.max(score, 0), 100);
}