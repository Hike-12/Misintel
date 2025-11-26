import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const { text, url, title } = await request.json()

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text content too short for analysis' },
        { status: 400 }
      )
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a highly trained fact-checker...`
        },
        {
          role: 'user',
          content: `Page Title: ${title}\nURL: ${url}\n\nContent:\n${text.slice(0, 8000)}`
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })

    const result = completion.choices[0]?.message?.content
    if (!result) throw new Error('No response from GROQ')

    const analysis = JSON.parse(result)

    if (!analysis.suspiciousContent || !Array.isArray(analysis.suspiciousContent)) {
      throw new Error('Invalid response structure')
    }

    return NextResponse.json(
      { success: true, analysis },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Scan page error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze page content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
