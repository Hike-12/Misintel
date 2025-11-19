// External API services for fact-checking

import { SafetyCheckResult } from './types';

/**
 * Call Google Fact Check Tools API
 */
export async function getFactCheckResults(query: string) {
  const apiKey = process.env.FACT_CHECK_API_KEY;
  try {
    const response = await fetch(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&key=${apiKey}`
    );
    if (!response.ok) {
      console.log('❌ Fact Check API failed:', response.status);
      return [];
    }
    const data = await response.json();
    console.log("-------------------------------------------")
    console.log(data)
    console.log("-------------------------------------------")
    return data.claims || [];
  } catch (error) {
    console.error('❌ Fact Check API error:', error);
    return [];
  }
}

/**
 * Call Google Custom Search API
 */
export async function getCustomSearchResults(query: string) {
  const apiKey = process.env.CUSTOM_SEARCH_API_KEY;
  const cx = process.env.CUSTOM_SEARCH_ENGINE_ID;
  
  if (!cx) {
    console.log('⚠️ Custom Search Engine ID not configured');
    return [];
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`
    );
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

/**
 * Call Google Safe Browsing API
 */
export async function checkUrlSafety(url: string): Promise<SafetyCheckResult> {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  
  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client: {
            clientId: "misintel",
            clientVersion: "1.0.0"
          },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "POTENTIALLY_HARMFUL_APPLICATION",
              "UNWANTED_SOFTWARE"
            ],
            platformTypes: ["ALL_PLATFORMS"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: url }]
          }
        })
      }
    );
    
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

/**
 * Fetch recent news from NewsAPI
 */
export async function getRecentNews(query: string) {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ NewsAPI key not configured');
    return [];
  }
  
  try {
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]; // Last 7 days
    
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${apiKey}`
    );
    
    if (!response.ok) {
      console.log('❌ NewsAPI failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('❌ NewsAPI error:', error);
    return [];
  }
}
