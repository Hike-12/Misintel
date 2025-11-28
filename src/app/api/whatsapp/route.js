import twilio from "twilio";
import axios from "axios";
import { NextResponse } from "next/server";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper function to download media from Twilio
async function downloadTwilioMedia(mediaUrl, authToken) {
  try {
    const response = await axios.get(mediaUrl, {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: authToken,
      },
      responseType: 'arraybuffer',
    });
    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'],
    };
  } catch (error) {
    console.error('❌ Error downloading media:', error);
    throw error;
  }
}

// Helper function to convert buffer to base64
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

// Process image with advanced-check API
async function processImage(buffer, mimeType) {
  try {
    const base64Data = bufferToBase64(buffer);
    
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiBase}/api/advanced-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image',
        imageData: base64Data,
        mimeType: mimeType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error response:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Image processing error:', error);
    throw error;
  }
}

// Process audio with speech-to-text API
async function processAudio(buffer, mimeType) {
  try {
    const base64Data = bufferToBase64(buffer);
    
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    console.log('🎤 Calling speech-to-text API...');
    
    const response = await fetch(`${apiBase}/api/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: base64Data,
        mimeType: mimeType,
      }),
    });

    const data = await response.json();
    console.log('📡 Speech API response:', data);

    // Check if response was successful
    if (!response.ok) {
      console.error('❌ Speech-to-text HTTP error:', response.status, data);
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    // Check if the API returned success: false
    if (data.success === false) {
      console.error('❌ Speech-to-text returned error:', data.error);
      throw new Error(data.error || 'No speech detected in audio');
    }

    // Extract transcript (try both fields for compatibility)
    const transcript = data.transcript || data.transcription;
    
    if (!transcript || transcript.trim() === '') {
      throw new Error('Empty transcription received');
    }
    
    console.log('✅ Transcript:', transcript);
    return transcript;
    
  } catch (error) {
    console.error('❌ Audio processing error:', error);
    throw error;
  }
}

// Process video with video-check API
async function processVideo(buffer, mimeType) {
  try {
    const base64Data = bufferToBase64(buffer);
    const prompt = `Analyze this video for misinformation, misleading content, or false claims. 
    Identify any suspicious statements, verify facts, and provide a detailed analysis with confidence score.`;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiBase}/api/video-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data,
        mimeType,
        prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Video check error:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Video processing error:', error);
    throw error;
  }
}

// Format analysis result for WhatsApp
function formatAnalysisForWhatsApp(analysis) {
  const isFake = analysis.isFake;
  const confidence = analysis.confidence || 0;
  const summary = analysis.summary || 'Analysis complete';
  const reasons = analysis.reasons || [];

  let message = isFake 
    ? `🚨 *Likely FALSE* (${confidence}% confidence)\n\n`
    : `✅ *Likely TRUE* (${confidence}% confidence)\n\n`;

  message += `📝 *Summary:*\n${summary}\n\n`;

  if (reasons.length > 0) {
    message += `🔍 *Key Points:*\n`;
    reasons.slice(0, 3).forEach((reason, index) => {
      message += `${index + 1}. ${reason}\n`;
    });
  }

  if (analysis.sources && analysis.sources.length > 0) {
    message += `\n📚 *Sources:*\n`;
    analysis.sources.slice(0, 2).forEach(source => {
      message += `• ${source}\n`;
    });
  }

  message += `\n_Always verify from multiple sources._`;

  return message;
}

export async function POST(request) {
  console.log("🚀 WhatsApp webhook received!");

  let from = null;
  
  try {
    const formData = await request.formData();
    from = formData.get("From");
    const messageBody = formData.get("Body");
    const numMedia = parseInt(formData.get("NumMedia") || "0");
    
    console.log(`📱 Message from ${from}`);
    console.log(`📎 Media count: ${numMedia}`);
    console.log(`💬 Text: ${messageBody || '(no text)'}`);

    let replyMessage;

    // Handle media messages (image, audio, video)
    if (numMedia > 0) {
      const mediaUrl = formData.get("MediaUrl0");
      const mediaContentType = formData.get("MediaContentType0");
      
      console.log(`📎 Media URL: ${mediaUrl}`);
      console.log(`📎 Media Type: ${mediaContentType}`);

      // Send processing message
      await twilioClient.messages.create({
        body: "🔄 Processing your media, please wait...",
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: from,
      });

      try {
        // Download media from Twilio
        const { buffer, contentType } = await downloadTwilioMedia(
          mediaUrl, 
          process.env.TWILIO_AUTH_TOKEN
        );

        // Process based on media type
        if (contentType.startsWith('image/')) {
          console.log('🖼️ Processing image...');
          const analysis = await processImage(buffer, contentType);
          replyMessage = `📸 *Image Analysis*\n\n${formatAnalysisForWhatsApp(analysis)}`;

        } else if (contentType.startsWith('audio/')) {
          console.log('🎤 Processing audio...');
          
          try {
            const transcription = await processAudio(buffer, contentType);
            
            if (transcription && transcription.trim()) {
              // Now fact-check the transcription
              console.log('🔍 Fact-checking transcription...');
              
              const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
              const response = await fetch(`${apiBase}/api/advanced-check`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'text',
                  input: transcription,
                }),
              });

              if (response.ok) {
                const analysis = await response.json();
                replyMessage = `🎤 *Audio Transcription:*\n"${transcription.substring(0, 200)}${transcription.length > 200 ? '...' : ''}"\n\n${formatAnalysisForWhatsApp(analysis)}`;
              } else {
                replyMessage = `🎤 *Audio Transcription:*\n"${transcription}"\n\n_Fact-check temporarily unavailable, but transcription successful._`;
              }
            } else {
              throw new Error('No speech detected');
            }
          } catch (audioError) {
            console.error('❌ Audio error:', audioError);
            replyMessage = `❌ Audio processing failed: ${audioError.message}\n\nPlease try:\n• Speaking more clearly\n• Recording in a quieter environment\n• Sending a longer audio clip`;
          }

        } else if (contentType.startsWith('video/')) {
          console.log('🎬 Processing video...');
          const analysis = await processVideo(buffer, contentType);
          replyMessage = `🎬 *Video Analysis*\n\n${analysis.analysis || formatAnalysisForWhatsApp(analysis)}`;

        } else {
          replyMessage = `❌ Unsupported media type: ${contentType}\n\nPlease send:\n• 📸 Images\n• 🎤 Voice notes\n• 🎬 Videos\n• 💬 Text messages`;
        }

      } catch (mediaError) {
        console.error('❌ Media processing error:', mediaError);
        replyMessage = `❌ Failed to process media: ${mediaError.message}\n\nPlease try again or send as text.`;
      }

    } else if (messageBody && messageBody.trim()) {
      // Handle text message with existing fact-check logic
      await twilioClient.messages.create({
        body: "🔍 Checking the fact...",
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: from,
      });

      console.log("🔍 Calling fact check API...");
      
      // Use advanced-check API
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        console.log('🌐 API Base:', apiBase);
        
        const response = await fetch(`${apiBase}/api/advanced-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'text',
            input: messageBody,
          }),
        });

        console.log('📡 Response status:', response.status);

        if (response.ok) {
          const analysis = await response.json();
          console.log('✅ Analysis received:', analysis);
          replyMessage = formatAnalysisForWhatsApp(analysis);
        } else {
          const errorText = await response.text();
          console.error('❌ API error:', response.status, errorText);
          
          // Fallback to Google Fact Check API
          console.log('🔄 Trying fallback Google Fact Check API...');
          const factCheckResponse = await axios.get(
            "https://factchecktools.googleapis.com/v1alpha1/claims:search",
            {
              params: {
                key: process.env.GOOGLE_FACT_CHECK_API_KEY,
                query: messageBody,
                languageCode: "en",
              },
            }
          );

          if (factCheckResponse.data.claims && factCheckResponse.data.claims.length > 0) {
            replyMessage = "🔍 *Fact Check Results:*\n\n";

            factCheckResponse.data.claims.slice(0, 3).forEach((claim, index) => {
              const review = claim.claimReview[0];
              replyMessage += `*${index + 1}.* "${claim.text}"\n`;
              replyMessage += `📊 *Rating:* ${review.textualRating}\n`;
              replyMessage += `✅ *Checked by:* ${review.publisher.name}\n`;
              replyMessage += `🔗 ${review.url}\n\n`;
            });

            replyMessage += "_Always verify information from multiple sources._";
          } else {
            replyMessage =
              "❌ No fact-check results found for this message.\n\n" +
              "💡 *Tips:*\n" +
              "• Try rephrasing your query\n" +
              "• Send specific claims to check\n" +
              '• Example: "COVID vaccines are safe"';
          }
        }
      } catch (apiError) {
        console.error('❌ API error:', apiError);
        replyMessage = `❌ Fact-check service error: ${apiError.message}\n\nPlease try again later.`;
      }

    } else {
      replyMessage = 
        "👋 *Welcome to MisIntel Fact Checker!*\n\n" +
        "Send me:\n" +
        "• 💬 Text messages to fact-check\n" +
        "• 📸 Images with text or claims\n" +
        "• 🎤 Voice notes to transcribe & verify\n" +
        "• 🎬 Videos to analyze for misinformation\n\n" +
        "_I'll verify the content and let you know if it's true or false._";
    }

    console.log("📤 Sending reply via WhatsApp...");

    await twilioClient.messages.create({
      body: replyMessage,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
    });

    console.log("✅ Reply sent successfully!");

    return new Response("Processed", { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    
    // Try to send error message to user (only if we have 'from' and it's not a Twilio limit error)
    if (from && error.code !== 63038) {
      try {
          await twilioClient.messages.create({
            body: "❌ An error occurred while processing your request. Please try again.",
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: from,
          });
        } catch (notifyError) {
          console.error("❌ Could not send error notification:", notifyError);
        }
    } else if (error.code === 63038) {
      console.log("[SPEECH-TO-TEXT] Twilio daily message limit reached, skipping error notification");
    }
    
    return new Response("Error", { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "WhatsApp webhook is ready!",
    note: "Send POST requests to this endpoint",
  });
}
