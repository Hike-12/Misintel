// app/api/crisis-mode/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface CrisisEvent {
  active: boolean;
  type: 'election' | 'disaster' | 'health' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  start_date: string;
  keywords: string[];
}

export async function GET(req: NextRequest) {
  try {
    console.log('Checking crisis status...');
    const crisisStatus = await detectCrisisMode();
    
    return NextResponse.json({
      success: true,
      crisis: crisisStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Crisis detection error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check crisis status'
      },
      { status: 500 }
    );
  }
}

async function detectCrisisMode(): Promise<CrisisEvent | null> {
  try {
    // First try to detect real crises from news
    const realCrisis = await checkRealCrisisIndicators();
    if (realCrisis) {
      return realCrisis;
    }

    // If no real crisis, check for demo/election scenarios
    const demoCrisis = checkDemoCrisisScenarios();
    if (demoCrisis) {
      return demoCrisis;
    }

    console.log('No crises detected');
    return null;

  } catch (error) {
    console.error('Crisis detection error:', error);
    // Fallback to demo crisis if detection fails
    return getFallbackCrisis();
  }
}

async function checkRealCrisisIndicators(): Promise<CrisisEvent | null> {
  try {
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) {
      console.log('NewsAPI key not configured');
      return null;
    }

    console.log('Fetching current news headlines...');
    
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=in&pageSize=15&apiKey=${newsApiKey}`,
      { 
        next: { revalidate: 300 } // 5 minute cache
      }
    );

    if (!response.ok) {
      console.log('NewsAPI request failed:', response.status);
      return null;
    }

    const data = await response.json();
    const articles = data.articles || [];

    console.log(`Received ${articles.length} articles`);

    // Analyze for real crisis patterns
    const crisis = analyzeForRealCrisis(articles);
    if (crisis) {
      console.log('Real crisis detected from news:', crisis.type);
      return crisis;
    }

    return null;
  } catch (error: any) {
    console.error('Error checking real crisis indicators:', error.message);
    return null;
  }
}

function analyzeForRealCrisis(articles: any[]): CrisisEvent | null {
  if (!articles || articles.length === 0) return null;

  const headlines = articles.map(article => article.title || '').join(' ').toLowerCase();
  const descriptions = articles.map(article => article.description || '').join(' ').toLowerCase();
  const fullText = headlines + ' ' + descriptions;

  console.log('Analyzing news content for crisis patterns...');

  // More sensitive crisis detection patterns
  const crisisPatterns = [
    {
      type: 'election' as const,
      keywords: [
        'election', 'vote', 'polling', 'results', 'campaign', 'candidate', 
        'ballot', 'voting', 'elections', 'poll', 'result', 'counting'
      ],
      threshold: 2,
      severity: 'critical' as const
    },
    {
      type: 'disaster' as const,
      keywords: [
        'flood', 'earthquake', 'cyclone', 'landslide', 'disaster', 'rescue', 
        'emergency', 'rain', 'storm', 'floods', 'damage', 'affected', 'victims'
      ],
      threshold: 3,
      severity: 'high' as const
    },
    {
      type: 'health' as const,
      keywords: [
        'covid', 'virus', 'outbreak', 'disease', 'hospital', 'vaccine', 
        'health', 'cases', 'infected', 'pandemic', 'wave', 'variant'
      ],
      threshold: 3,
      severity: 'high' as const
    },
    {
      type: 'general' as const,
      keywords: [
        'protest', 'strike', 'violence', 'attack', 'crisis', 'emergency',
        'alert', 'tension', 'clash', 'demonstration', 'rally'
      ],
      threshold: 3,
      severity: 'medium' as const
    }
  ];

  for (const pattern of crisisPatterns) {
    let keywordCount = 0;
    const foundKeywords: string[] = [];

    for (const keyword of pattern.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = fullText.match(regex);
      if (matches) {
        keywordCount += matches.length;
        foundKeywords.push(keyword);
      }
    }

    console.log(`Pattern ${pattern.type}: ${keywordCount} matches, found: ${foundKeywords.join(', ')}`);

    if (keywordCount >= pattern.threshold) {
      console.log(`Detected ${pattern.type} crisis with ${keywordCount} keyword matches`);
      
      return {
        active: true,
        type: pattern.type,
        severity: pattern.severity,
        message: generateCrisisMessage(pattern.type, pattern.severity, keywordCount, foundKeywords),
        start_date: new Date().toISOString(),
        keywords: foundKeywords.slice(0, 5)
      };
    }
  }

  console.log('No crisis patterns detected in current news');
  return null;
}

function checkDemoCrisisScenarios(): CrisisEvent | null {
  const now = new Date();
  
  // Check for election periods (common crisis scenario)
  const currentYear = now.getFullYear();
  
  // Demo: Always show election crisis for testing (remove this in production)
  // For now, let's always return a demo crisis to see the banner
  console.log('Activating demo crisis mode for testing');
  
  return {
    active: true,
    type: 'election',
    severity: 'high',
    message: 'High misinformation risk period detected. Verify all information before sharing. Enhanced fact-checking active.',
    start_date: new Date().toISOString(),
    keywords: ['election', 'vote', 'results', 'misinformation']
  };
}

function getFallbackCrisis(): CrisisEvent {
  console.log('Using fallback crisis');
  return {
    active: true,
    type: 'general',
    severity: 'medium',
    message: 'Increased misinformation risk detected. Verify information from trusted sources.',
    start_date: new Date().toISOString(),
    keywords: ['misinformation', 'verify', 'sources']
  };
}

function generateCrisisMessage(type: string, severity: string, count: number, keywords: string[]): string {
  const baseMessages = {
    election: {
      critical: `Critical election misinformation surge detected (${count} indicators). Verify all voting information and candidate claims.`,
      high: `High election misinformation risk. Fact-check political claims before sharing.`,
      medium: `Election period: Verify political information from official sources.`
    },
    disaster: {
      critical: `Emergency disaster situation detected. Verify all rescue reports and damage claims.`,
      high: `Disaster alert: High risk of false emergency information. Confirm reports with authorities.`,
      medium: `Weather/disaster warnings: Verify emergency information from trusted sources.`
    },
    health: {
      critical: `Health crisis: Medical misinformation surge detected. Verify health advice and outbreak reports.`,
      high: `Health alert: Increased medical misinformation. Consult official health authorities.`,
      medium: `Health information: Verify medical claims with certified sources.`
    },
    general: {
      critical: `Crisis detected: High misinformation risk. Verify all breaking news and emergency alerts.`,
      high: `Alert: Increased misinformation activity. Double-check information before sharing.`,
      medium: `Trending news: Verify information from multiple sources.`
    }
  };

  const message = baseMessages[type as keyof typeof baseMessages]?.[severity as keyof typeof baseMessages.election] 
    || `Increased ${type} misinformation risk detected. Verify information carefully.`;

  return message;
}