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
          content: `You are an expert fact-checker analyzing web page content for potential misinformation, misleading claims, or suspicious content.

Your task is to:
1. Identify specific text snippets that may contain misinformation, misleading claims, or clickbait
2. Distinguish between satire/jokes and actual misinformation
3. Provide severity levels: "high" (likely false/misleading), "medium" (questionable/needs verification), "low" (potentially misleading context)
4. Give brief reasons for flagging each snippet

Return ONLY a valid JSON object with this structure:
{
  "suspiciousContent": [
    {
      "text": "exact text snippet from page (max 200 chars)",
      "severity": "high" | "medium" | "low",
      "reason": "brief explanation (max 100 chars)"
    }
  ],
  "overallAssessment": "brief overall summary",
  "isSatire": true/false
}

If the page is satire/parody, set isSatire to true and include fewer items.
If no suspicious content found, return empty suspiciousContent array.`,
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
