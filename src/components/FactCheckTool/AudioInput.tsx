// src/components/FactCheckTool/AudioInput.tsx
import { Mic, Square, Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/utils/cn';

interface AudioInputProps {
  onAudioCapture: (audioBlob: Blob, isRecorded: boolean) => void;
}

export function AudioInput({ onAudioCapture }: AudioInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onAudioCapture(audioBlob, true);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioURL(url);
      onAudioCapture(file, false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="flex gap-4 justify-center">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
              "bg-gradient-to-b from-neutral-50 to-neutral-400 text-black",
              "hover:from-neutral-100 hover:to-neutral-500"
            )}
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
              "bg-gradient-to-b from-neutral-50 to-neutral-400 text-black",
              "hover:from-neutral-100 hover:to-neutral-500",
              "animate-pulse"
            )}
          >
            <Square className="w-5 h-5" />
            Stop Recording ({formatTime(recordingTime)})
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-700"></div>
        <span className="text-neutral-500 text-sm">OR</span>
        <div className="flex-1 h-px bg-neutral-700"></div>
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center hover:border-neutral-500 transition-colors cursor-pointer">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
          id="audio-upload"
          disabled={isRecording}
        />
        <label 
          htmlFor="audio-upload" 
          className={cn(
            "cursor-pointer",
            isRecording && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="text-neutral-300">Upload Audio File</p>
            <p className="text-neutral-500 text-xs">
              Supports MP3, WAV, WEBM, OGG
            </p>
          </div>
        </label>
      </div>

      {/* Audio Preview */}
      {audioURL && (
        <div className="mt-4">
          <p className="text-neutral-400 text-sm mb-2">Preview:</p>
          <audio 
            controls 
            src={audioURL} 
            className="w-full rounded-lg"
            style={{
              filter: 'invert(0.9) hue-rotate(180deg)',
            }}
          />
        </div>
      )}
    </div>
  );
}