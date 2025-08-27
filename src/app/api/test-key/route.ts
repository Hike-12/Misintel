// app/api/test-key/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "TruthGuard API is running!",
    status: "active",
    timestamp: new Date().toISOString(),
    features: [
      "Text verification",
      "URL verification", 
      "Image verification",
      "Multi-API analysis",
      "Real-time results"
    ]
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Simple test analysis
    const testContent = body.content || "This is a test message";
    const isTestContent = testContent.toLowerCase().includes('test');
    
    return NextResponse.json({
      isFake: isTestContent,
      confidence: isTestContent ? 85 : 75,
      summary: isTestContent 
        ? "This appears to be test content, which is common in development environments."
        : "Content analyzed successfully with test API endpoint.",
      reasons: [
        isTestContent ? "Contains test-related keywords" : "No obvious red flags detected",
        "Analysis performed by test endpoint"
      ],
      sources: ["Test API", "Development Environment"],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: "Invalid request",
      message: "Please provide a valid JSON body with 'content' field"
    }, { status: 400 });
  }
}
