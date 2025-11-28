// src/components/FactCheckTool/AudioInput.tsx
import { Mic, Square } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { FileUpload } from '@/components/ui/file-upload';

interface AudioInputProps {
  onAudioCapture: (audioBlob: Blob, isRecorded: boolean) => void;
}

export function AudioInput({ onAudioCapture }: AudioInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

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

  const handleFileUpload = (files: File[]) => {
    const file = files[0];
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
      {/* Mode Toggle */}
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={() => setMode('record')}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm border",
            mode === 'record'
              ? "bg-gradient-to-b from-neutral-50 to-neutral-400 text-black border-transparent"
              : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
          )}
        >
          Record
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm border",
            mode === 'upload'
              ? "bg-gradient-to-b from-neutral-50 to-neutral-400 text-black border-transparent"
              : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
          )}
        >
          Upload
        </button>
      </div>

      {mode === 'record' ? (
        /* Recording Controls */
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4 justify-center">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
                  "bg-red-500/20 text-red-400 border border-red-500/30",
                  "hover:bg-red-500/30 hover:border-red-500/50"
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
                  "bg-neutral-800 text-neutral-200 border border-neutral-600",
                  "hover:bg-neutral-700 animate-pulse"
                )}
              >
                <Square className="w-5 h-5" />
                Stop ({formatTime(recordingTime)})
              </button>
            )}
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-neutral-400 text-sm">Recording...</span>
            </div>
          )}

          {/* Audio Preview for Record Mode */}
          {audioURL && !isRecording && (
            <div className="w-full mt-4">
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
      ) : (
        /* File Upload using FileUpload component */
        <FileUpload
          type="audio"
          accept="audio/*"
          onChange={handleFileUpload}
          preview={audioURL}
        />
      )}
    </div>
  );
}