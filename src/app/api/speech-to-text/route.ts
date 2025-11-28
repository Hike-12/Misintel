import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    console.log('[SPEECH-TO-TEXT] Request content-type:', contentType);
    
    let audioBuffer: Buffer;
    let mimeType: string;

    // Handle JSON requests (from WhatsApp)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      
      if (!body.audioData) {
        console.error('[SPEECH-TO-TEXT] No audio data in request body');
        return NextResponse.json(
          { success: false, error: 'No audio data provided', transcript: '' },
          { status: 400 }
        );
      }

      // Decode base64 audio
      audioBuffer = Buffer.from(body.audioData, 'base64');
      mimeType = body.mimeType || 'audio/ogg';
      
      console.log('[SPEECH-TO-TEXT] Received from WhatsApp:');
      console.log('  - MIME type:', mimeType);
      console.log('  - Buffer size:', audioBuffer.length, 'bytes');
      console.log('  - First 20 bytes (hex):', audioBuffer.slice(0, 20).toString('hex'));
    } 
    // Handle FormData requests (from web UI)
    else {
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;

      if (!audioFile) {
        console.error('[SPEECH-TO-TEXT] No audio file in FormData');
        return NextResponse.json(
          { success: false, error: 'No audio file provided', transcript: '' },
          { status: 400 }
        );
      }

      const bytes = await audioFile.arrayBuffer();
      audioBuffer = Buffer.from(bytes);
      mimeType = audioFile.type;
      
      console.log('[SPEECH-TO-TEXT] Received from Web UI:');
      console.log('  - File name:', audioFile.name);
      console.log('  - MIME type:', mimeType);
      console.log('  - Buffer size:', audioBuffer.length, 'bytes');
      console.log('  - First 20 bytes (hex):', audioBuffer.slice(0, 20).toString('hex'));
    }

    // Get API key
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!apiKey) {
      console.error('[SPEECH-TO-TEXT] No Google API key found');
      return NextResponse.json({
        success: false,
        error: 'API key not configured',
        transcript: ''
      }, { status: 500 });
    }

    // Determine encoding and sample rate
    const audioConfig = getAudioConfig(mimeType);
    const base64Audio = audioBuffer.toString('base64');

    console.log('[SPEECH-TO-TEXT] Audio configuration:');
    console.log('  - Encoding:', audioConfig.encoding);
    console.log('  - Sample rate:', audioConfig.sampleRate);
    console.log('  - Base64 length:', base64Audio.length);

    // Call Google Speech-to-Text REST API
    console.log('[SPEECH-TO-TEXT] Calling Google Speech-to-Text API...');
    
    // For WhatsApp audio (OGG), try multiple encoding strategies
    const isWhatsAppAudio = contentType.includes('application/json') && mimeType.includes('ogg');
    
    let data: any = null;
    let lastError: string = '';
    
    if (isWhatsAppAudio) {
      // Try different configurations for WhatsApp OGG audio
      const encodingAttempts = [
        { encoding: 'OGG_OPUS', sampleRateHertz: 16000 },
        { encoding: 'OGG_OPUS', sampleRateHertz: 48000 },
        { encoding: 'MULAW', sampleRateHertz: 8000 },
      ];
      
      for (const attempt of encodingAttempts) {
        console.log('[SPEECH-TO-TEXT] Trying config:', JSON.stringify(attempt, null, 2));
        
        const response = await fetch(
          `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              config: {
                ...attempt,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                model: 'default',
              },
              audio: {
                content: base64Audio,
              },
            }),
          }
        );
        
        console.log('[SPEECH-TO-TEXT] Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('[SPEECH-TO-TEXT] Response:', JSON.stringify(result, null, 2));
          
          // Check if we got actual transcript
          if (result.results && result.results.length > 0) {
            const transcript = result.results
              .map((r: any) => r.alternatives?.[0]?.transcript)
              .filter(Boolean)
              .join(' ');
            
            if (transcript && transcript.trim()) {
              console.log('[SPEECH-TO-TEXT] SUCCESS with config:', JSON.stringify(attempt, null, 2));
              data = result;
              break;
            } else {
              console.log('[SPEECH-TO-TEXT] Empty transcript with this config, trying next...');
            }
          } else {
            console.log('[SPEECH-TO-TEXT] No results with this config, trying next...');
          }
        } else {
          const errorData = await response.json();
          lastError = errorData.error?.message || 'Unknown error';
          console.log('[SPEECH-TO-TEXT] Failed with this config:', lastError);
        }
      }
      
      if (!data) {
        console.error('[SPEECH-TO-TEXT] All encoding attempts failed. Last error:', lastError);
        return NextResponse.json({
          success: false,
          error: `Could not process audio. Last error: ${lastError}`,
          transcript: ''
        }, { status: 500 });
      }
    } else {
      // For web UI (WebM), use standard config
      const config = {
        encoding: audioConfig.encoding,
        sampleRateHertz: audioConfig.sampleRate,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'default',
        useEnhanced: true,
      };
      
      console.log('[SPEECH-TO-TEXT] Request config:', JSON.stringify(config, null, 2));
      
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: config,
            audio: {
              content: base64Audio,
            },
          }),
        }
      );

      console.log('[SPEECH-TO-TEXT] Google API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SPEECH-TO-TEXT] Google API error:', JSON.stringify(errorData, null, 2));
        
        return NextResponse.json({
          success: false,
          error: `Google Speech API error: ${errorData.error?.message || 'Unknown error'}`,
          transcript: ''
        }, { status: 500 });
      }

      data = await response.json();
      console.log('[SPEECH-TO-TEXT] Google API response:', JSON.stringify(data, null, 2));
    }

    if (!data.results || data.results.length === 0) {
      console.log('[SPEECH-TO-TEXT] No speech detected in audio');
      return NextResponse.json({
        success: false,
        error: 'No speech detected in audio',
        transcript: ''
      });
    }

    const transcription = data.results
      .map((result: any) => result.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(' ');

    if (!transcription || transcription.trim() === '') {
      console.log('[SPEECH-TO-TEXT] Empty transcription after processing');
      return NextResponse.json({
        success: false,
        error: 'No speech detected in audio',
        transcript: ''
      });
    }

    console.log('[SPEECH-TO-TEXT] Transcription successful:', transcription);

    return NextResponse.json({
      success: true,
      transcript: transcription,
      transcription: transcription
    });

  } catch (error: any) {
    console.error('[SPEECH-TO-TEXT] Exception:', error.message);
    console.error('[SPEECH-TO-TEXT] Stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message || 'Transcription failed',
      transcript: ''
    }, { status: 500 });
  }
}

function getAudioConfig(mimeType: string): { encoding: string; sampleRate: number } {
  console.log('[SPEECH-TO-TEXT] Detecting encoding for MIME type:', mimeType);
  
  const lowerMime = mimeType.toLowerCase();
  
  if (lowerMime.includes('ogg') || lowerMime.includes('opus')) {
    return { encoding: 'OGG_OPUS', sampleRate: 48000 };
  }
  
  if (lowerMime.includes('webm')) {
    return { encoding: 'WEBM_OPUS', sampleRate: 48000 };
  }
  
  if (lowerMime.includes('mp3') || lowerMime.includes('mpeg')) {
    return { encoding: 'MP3', sampleRate: 44100 };
  }
  
  if (lowerMime.includes('wav')) {
    return { encoding: 'LINEAR16', sampleRate: 16000 };
  }
  
  if (lowerMime.includes('flac')) {
    return { encoding: 'FLAC', sampleRate: 44100 };
  }
  
  if (lowerMime.includes('m4a') || lowerMime.includes('mp4') || lowerMime.includes('aac')) {
    return { encoding: 'MP3', sampleRate: 44100 };
  }
  
  console.log('[SPEECH-TO-TEXT] Unknown format, defaulting to OGG_OPUS');
  return { encoding: 'OGG_OPUS', sampleRate: 48000 };
}