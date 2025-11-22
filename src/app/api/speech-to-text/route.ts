// src/app/api/speech-to-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('🎤 Processing audio file:', audioFile.name, audioFile.type);

    // Convert file to buffer
    const bytes = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(bytes);

    // Initialize Speech client
    const client = new SpeechClient({
        apiKey: process.env.GOOGLE_CLOUD_API_KEY || process.env.FACT_GEMINI_API_KEY
    });

    // Determine encoding from file type
    const encoding = getAudioEncoding(audioFile.type);
    
    console.log('🔊 Audio encoding:', encoding);

    // Configure speech recognition
    const audio = {
      content: audioBuffer.toString('base64'),
    };

    const config = {
  encoding: encoding,
  // Don't specify sampleRateHertz - let API auto-detect from audio file
  languageCode: 'en-US',
  alternativeLanguageCodes: ['hi-IN', 'ta-IN', 'te-IN', 'mr-IN'],
  enableAutomaticPunctuation: true,
  enableWordTimeOffsets: true,
  model: 'default',
  useEnhanced: true,
};

    const request = {
      audio: audio,
      config: config,
    };

    console.log('🔄 Sending to Speech-to-Text API...');

    // Recognize speech
    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No speech detected in audio',
        transcript: ''
      });
    }

    // Extract transcript
    const transcription = response.results
      .map(result => result.alternatives?.[0]?.transcript || '')
      .filter(Boolean)
      .join(' ');

    console.log('✅ Transcription complete:', transcription.substring(0, 100) + '...');

    // Extract word-level timestamps (useful for verification)
    const words = response.results
      .flatMap(result => result.alternatives?.[0]?.words || [])
      .map(word => ({
        word: word.word,
        startTime: word.startTime?.seconds || 0,
        endTime: word.endTime?.seconds || 0,
        confidence: word.confidence || 0
      }));

    return NextResponse.json({
      success: true,
      transcript: transcription,
      confidence: response.results[0]?.alternatives?.[0]?.confidence || 0,
      language: response.results[0]?.languageCode || 'en-US',
      words: words,
      audioLength: audioFile.size
    });

  } catch (error: any) {
    console.error('❌ Speech-to-Text error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to transcribe audio',
        transcript: ''
      },
      { status: 500 }
    );
  }
}

function getAudioEncoding(mimeType: string): any {
  const encodingMap: { [key: string]: string } = {
    'audio/wav': 'LINEAR16',
    'audio/wave': 'LINEAR16',
    'audio/x-wav': 'LINEAR16',
    'audio/webm': 'WEBM_OPUS',
    'audio/ogg': 'OGG_OPUS',
    'audio/mp3': 'MP3',
    'audio/mpeg': 'MP3',
    'audio/mp4': 'MP3',
    'audio/flac': 'FLAC',
    'audio/x-flac': 'FLAC',
  };

  return encodingMap[mimeType] || 'LINEAR16';
}