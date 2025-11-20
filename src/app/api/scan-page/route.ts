import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// CORS headers for extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { text, url, title } = await request.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text content too short for analysis' },
        { status: 400 }
      );
    }

    // Use GROQ to analyze the page content for misinformation
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a highly trained fact-checker. ONLY flag content if you have strong evidence it's misleading or false. Be conservative - it's better to miss something than to over-flag.

STRICT CRITERIA:
- HIGH: Demonstrably false claims, conspiracy theories, clear misinformation (rare - only use for obvious falsehoods)
- MEDIUM: Unverified claims that contradict established facts or use manipulative framing (use sparingly)
- LOW: Clickbait headlines or sensationalized language without clear falsehoods (minimal use)

DO NOT FLAG:
- Opinion pieces, analysis, or commentary
- Statistical claims with sources
- Future predictions or speculation
- Satirical content
- Emotional language that doesn't make false claims
- Personal stories or anecdotes

Return ONLY valid JSON:
{
  "suspiciousContent": [
    {
      "text": "exact snippet (max 150 chars)",
      "severity": "high" | "medium" | "low",
      "reason": "specific fact-check reason (max 80 chars)"
    }
  ],
  "overallAssessment": "brief summary",
  "isSatire": true/false
}

IMPORTANT: Return 0-3 items maximum unless dealing with heavy misinformation. Quality over quantity.`,
        },
        {
          role: 'user',
          content: `Page Title: ${title}\nURL: ${url}\n\nContent:\n${text.slice(0, 8000)}`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from GROQ');
    }

    const analysis = JSON.parse(result);

    // Validate response structure
    if (!analysis.suspiciousContent || !Array.isArray(analysis.suspiciousContent)) {
      throw new Error('Invalid response structure');
    }

    return NextResponse.json({
      success: true,
      analysis,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Scan page error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze page content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
