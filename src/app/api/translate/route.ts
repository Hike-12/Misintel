import { NextRequest, NextResponse } from 'next/server';


import Groq from 'groq-sdk';
import { redis } from '@/lib/redis';

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  bn: 'Bengali (বাংলা)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  mr: 'Marathi (मराठी)',
  gu: 'Gujarati (ગુજરાતી)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

const TRANSLATION_CACHE_TTL = 180; // 3 minutes

function getTranslationCacheKey(contentHash: string): string {
  return `misintel:translation:${contentHash}`;
}

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function getCachedTranslations(contentHash: string): Promise<Record<string, any> | null> {
  try {
    const key = getTranslationCacheKey(contentHash);
    const cached = await redis.get(key);
    
    if (cached) {
      console.log('✅ Translation cache HIT');
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
    
    console.log('❌ Translation cache MISS');
    return null;
  } catch (error) {
    console.error('Redis translation GET error:', error);
    return null;
  }
}

async function cacheTranslations(contentHash: string, translations: Record<string, any>) {
  try {
    const key = getTranslationCacheKey(contentHash);
    await redis.setex(key, TRANSLATION_CACHE_TTL, JSON.stringify(translations));
    console.log(`💾 Cached translations (TTL: ${TRANSLATION_CACHE_TTL}s)`);
  } catch (error) {
    console.error('Redis translation SET error:', error);
  }
}

export type TranslatedResult = {
  summary: string;
  reasons: string[];
  verificationFlow?: {
    label: string;
    details: string;
  }[];
};

export async function translateAnalysisResult(
  result: {
    summary: string;
    reasons: string[];
    isFake: boolean;
    confidence: number;
    verificationFlow?: Array<{
      id: string;
      label: string;
      details: string;
    }>;
  }
): Promise<Record<LanguageCode, TranslatedResult>> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY not found');
    return {
      en: {
        summary: result.summary,
        reasons: result.reasons,
        verificationFlow: result.verificationFlow?.map(step => ({
          label: step.label,
          details: step.details,
        })),
      },
    } as any;
  }

  const groq = new Groq({ apiKey });

  const contentToTranslate = JSON.stringify({
    summary: result.summary,
    reasons: result.reasons,
    verificationFlow: result.verificationFlow,
  });
  
  const contentHash = hashContent(contentToTranslate);
  
  // Check cache first
  const cached = await getCachedTranslations(contentHash);
  if (cached) {
    return cached;
  }
  
  console.log('🌐 Translating to Indian languages with GROQ...');
  
  const languageCodes = Object.keys(SUPPORTED_LANGUAGES).filter(lang => lang !== 'en') as LanguageCode[];
  
  // Build verification flow text for translation
  const flowText = result.verificationFlow
    ? result.verificationFlow.map((step, i) => 
        `Step ${i + 1}: ${step.label} - ${step.details}`
      ).join('\n')
    : '';
  
  const prompt = `Translate this fact-check analysis to Indian languages. Return ONLY valid JSON.

ORIGINAL:
Summary: ${result.summary}
Reasons: ${result.reasons.join(' | ')}
${flowText ? `\nVerification Steps:\n${flowText}` : ''}

Return this exact JSON structure with translations:
{
  "hi": {
    "summary": "...", 
    "reasons": ["...", "..."],
    "verificationFlow": [
      {"label": "...", "details": "..."},
      {"label": "...", "details": "..."}
    ]
  },
  "bn": {
    "summary": "...", 
    "reasons": ["...", "..."],
    "verificationFlow": [
      {"label": "...", "details": "..."},
      {"label": "...", "details": "..."}
    ]
  },
  "ta": { "summary": "...", "reasons": ["..."], "verificationFlow": [...] },
  "te": { "summary": "...", "reasons": ["..."], "verificationFlow": [...] },
  "mr": { "summary": "...", "reasons": ["..."], "verificationFlow": [...] },
  "gu": { "summary": "...", "reasons": ["..."], "verificationFlow": [...] },
  "pa": { "summary": "...", "reasons": ["..."], "verificationFlow": [...] }
}

Rules:
- Use native scripts (Devanagari for Hindi, Bengali script for Bengali, etc.)
- Keep numbers, URLs, names, percentages unchanged
- Preserve meaning exactly
- For verificationFlow, translate both "label" and "details" fields
- Return ONLY the JSON object`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a translation API. Return only valid JSON with no markdown or explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 8000, // Increased for flow translations
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    console.log('📥 GROQ response length:', responseText.length);
    
    let translations: Record<string, any> = {};
    
    try {
      translations = JSON.parse(responseText);
    } catch (e1) {
      console.warn('Direct parse failed, trying cleanup...');
      
      let cleaned = responseText.trim();
      if (cleaned.includes('```')) {
        const match = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (match) cleaned = match[1];
      }
      
      try {
        translations = JSON.parse(cleaned);
      } catch (e2) {
        console.warn('Markdown cleanup failed, trying regex extraction...');
        
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            translations = JSON.parse(jsonMatch[0]);
          } catch (e3) {
            console.error('All parsing strategies failed');
            console.error('Response preview:', responseText.substring(0, 500));
            throw new Error('Failed to parse translation response');
          }
        } else {
          throw new Error('No JSON object found in response');
        }
      }
    }
    
    console.log('✅ Parsed translations for languages:', Object.keys(translations));
    
    const validated: Record<LanguageCode, TranslatedResult> = {
      en: { 
        summary: result.summary, 
        reasons: result.reasons,
        verificationFlow: result.verificationFlow?.map(step => ({
          label: step.label,
          details: step.details,
        })),
      },
    } as any;

    for (const code of languageCodes) {
      const entry = translations[code];
      
      if (entry && typeof entry.summary === 'string' && Array.isArray(entry.reasons)) {
        validated[code as LanguageCode] = {
          summary: entry.summary.trim(),
          reasons: entry.reasons.map((r: string) => String(r).trim()).filter(Boolean),
          verificationFlow: Array.isArray(entry.verificationFlow)
            ? entry.verificationFlow.map((step: any) => ({
                label: String(step.label || '').trim(),
                details: String(step.details || '').trim(),
              }))
            : result.verificationFlow?.map(step => ({
                label: step.label,
                details: step.details,
              })),
        };
      } else {
        console.warn(`⚠️ Missing or invalid translation for ${code}, using English fallback`);
        validated[code as LanguageCode] = {
          summary: result.summary,
          reasons: result.reasons,
          verificationFlow: result.verificationFlow?.map(step => ({
            label: step.label,
            details: step.details,
          })),
        };
      }
    }
    
    await cacheTranslations(contentHash, validated);
    
    console.log('✅ Translations validated and cached');
    return validated;
    
  } catch (error) {
    console.error('❌ Translation error:', error);
    
    return {
      en: {
        summary: result.summary,
        reasons: result.reasons,
        verificationFlow: result.verificationFlow?.map(step => ({
          label: step.label,
          details: step.details,
        })),
      },
    } as any;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { summary, reasons, isFake, confidence, verificationFlow } = body;
    
    if (!summary || !reasons) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log('🌐 Translation API called');
    
    const translations = await translateAnalysisResult({
      summary,
      reasons,
      isFake,
      confidence,
      verificationFlow: verificationFlow?.map((step: any) => ({
        id: step.id,
        label: step.label,
        details: step.details,
      })),
    });
    
    return NextResponse.json({ 
      translations,
      success: true 
    });
    
  } catch (error) {
    console.error('❌ Translation API error:', error);
    return NextResponse.json(
      { 
        error: 'Translation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
