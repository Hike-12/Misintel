import { GoogleGenAI, Part } from '@google/genai';
import { NextResponse } from 'next/server';

// Initialize the GoogleGenAI instance.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

// ==============================================================================
// 1. UTILITY FUNCTIONS
// ==============================================================================

/**
 * Retries an asynchronous function with exponential backoff.
 */
async function withBackoff<T>(fn: () => Promise<T>, retries: number = 5): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      // console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Exceeded maximum retries."); 
}

/**
 * Polls the Gemini File API until the file state is 'ACTIVE'.
 * Video processing takes time; generating content before this state results in errors.
 */
async function waitForFileActive(fileName: string): Promise<void> {
  console.log(`Waiting for file ${fileName} to process...`);
  
  const maxRetries = 60; // Wait up to ~2 minutes roughly
  
  for (let i = 0; i < maxRetries; i++) {
    const fileStatus = await ai.files.get({ name: fileName });
    
    if (fileStatus.state === "ACTIVE") {
      console.log(`File ${fileName} is active and ready.`);
      return;
    }
    
    if (fileStatus.state === "FAILED") {
      throw new Error(`File processing failed.`);
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error("File processing timed out.");
}

// ==============================================================================
// 2. MAIN API HANDLER
// ==============================================================================

export async function POST(request: Request) {
  let videoFileName: string | null = null;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: "GEMINI_API_KEY is not configured." 
      }, { status: 500 });
    }

    const { videoUrl, base64Data, mimeType, prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing required field: prompt" }, { status: 400 });
    }

    const contentParts: Part[] = [];

    // --- Scenario 1: YouTube URL ---
    if (videoUrl) {
      contentParts.push({
        fileData: {
          mimeType: "video/mp4",
          fileUri: videoUrl, 
        }
      });
      console.log(`Processing YouTube URL: ${videoUrl}`);

    // --- Scenario 2: Manual Upload (Base64) ---
    } else if (base64Data && mimeType) {
      if (!mimeType.startsWith("video/")) {
        return NextResponse.json({ error: "Invalid MIME type. Must be a video." }, { status: 400 });
      }

      console.log(`Uploading manual video (${mimeType})...`);

      // 1. Upload to Gemini
const buffer = Buffer.from(base64Data, 'base64');
const blob = new Blob([buffer], { type: mimeType });

// 2. Create a File object from the Blob
const file = new File([blob], `video.${mimeType.split('/')[1]}`, { type: mimeType });

// 3. Upload to Gemini
const uploadResult = await withBackoff(() => 
  ai.files.upload({
    file: file,
    config: {
      mimeType: mimeType,
    }
  })
);

videoFileName = uploadResult.name;
console.log(`File uploaded: ${uploadResult.uri}`);
      
      videoFileName = uploadResult.name;
      console.log(`File uploaded: ${uploadResult.uri}`);

      // 2. CRITICAL: Wait for processing to complete
      await waitForFileActive(uploadResult.name);

      // 3. Prepare content part
      contentParts.push({
        fileData: {
          mimeType: uploadResult.mimeType,
          fileUri: uploadResult.uri
        }
      });

    } else {
      return NextResponse.json({ 
        error: "Provide either 'videoUrl' or 'base64Data' + 'mimeType'." 
      }, { status: 400 });
    }

    // --- Generate Content ---
    contentParts.push({ text: prompt });

    // Enable Google Search Grounding
    const tools = [{ googleSearch: {} }];

    const response = await withBackoff(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: contentParts }],
      tools: tools
    }));

    const textResult = response.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.";

    const formattedAnalysis = textResult
    .replace(/(\d+\.\s+\*\*)/g, '\n\n$1') // Add breaks before numbered sections
    .replace(/(\*\*[A-Z][^:]+:\*\*)/g, '\n\n$1') // Add breaks before bold headers
    .trim();
    
    // The new SDK often structures grounding metadata differently; safely access it
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    
    // --- Cleanup ---
    if (videoFileName) {
      try {
        await ai.files.delete({ name: videoFileName });
        console.log(`Deleted temporary file: ${videoFileName}`);
      } catch (e) {
        console.error("Cleanup warning:", e);
      }
    }

    return NextResponse.json({ 
      analysis: formattedAnalysis,
      groundingMetadata: groundingMetadata 
    });

  } catch (error) {
    console.error("Video processing error:", error);
    
    // Attempt cleanup if error occurred after upload but before normal cleanup
    if (videoFileName) {
        try { await ai.files.delete({ name: videoFileName }); } catch {}
    }

    return NextResponse.json({ 
      error: "An error occurred during processing.", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}