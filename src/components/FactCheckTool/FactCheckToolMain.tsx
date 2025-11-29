// src/components/FactCheckTool/FactCheckToolMain.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/utils/cn";
import { useNodesState, useEdgesState } from "reactflow";
import html2canvas from "html2canvas";
import { type LanguageCode } from '@/lib/translation-types';
import { toast } from "sonner";

import { 
  AnalysisResult, 
  TranslationCache, 
  InputType 
} from './types';
import { InputTypeSelector } from './InputTypeSelector';
import { ImageUpload } from './ImageUpload';
import { VideoUpload } from './VideoUpload';
import { TextInput } from './TextInput';
import { ExtensionControls } from './ExtensionControls';
import { LanguageSelector } from './LanguageSelector';
import { ResultDisplay } from './ResultDisplay';
import { VerificationFlowDiagram } from './VerificationFlowDiagram';
import { HistoryList } from './HistoryList';
import { AudioInput } from './AudioInput';
import { isValidUrl, buildVerificationFlow } from './utils';
import { generateFlowNodes } from './flowNodeGenerator';

// @ts-ignore
const chrome =
  typeof window !== "undefined" && (window as any).chrome
    ? (window as any).chrome
    : undefined;

const HISTORY_STORAGE_KEY = 'misintel_history';

const saveToLocalStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`💾 Saved ${key} to localStorage:`, value.length, 'items');
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

const loadFromLocalStorage = (key: string, defaultValue: any = null) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    console.log(`✅ Loaded ${key} from localStorage:`, parsed.length || 0, 'items');
    return parsed;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
};

function FactCheckTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [inputType, setInputType] = useState<InputType>("text");
  const [showDiagram, setShowDiagram] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Translation states
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [translations, setTranslations] = useState<TranslationCache>({});
  const [translating, setTranslating] = useState(false);

  // Video states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");

  // Audio states
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string>("");

  // Alert dialog state
  const [showClearDialog, setShowClearDialog] = useState(false);

  const isExtension =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

  // Load history from localStorage on mount
  useEffect(() => {
    if (historyLoaded) return;
    
    const loadedHistory = loadFromLocalStorage(HISTORY_STORAGE_KEY, []);
    if (Array.isArray(loadedHistory)) {
      setHistory(loadedHistory);
      console.log('📚 History restored:', loadedHistory.length, 'items');
    }
    setHistoryLoaded(true);
  }, [historyLoaded]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!historyLoaded) return;
    saveToLocalStorage(HISTORY_STORAGE_KEY, history);
  }, [history, historyLoaded]);

  const clearHistoryItem = (index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
    console.log(`🗑️ Cleared history item at index ${index}`);
  };

  const clearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      console.log('🗑️ All history cleared');
    }
  };

  // Load from localStorage on mount (for web app)
  useEffect(() => {
    if (isExtension) return;

    try {
      const prefill = localStorage.getItem("misintel_prefill");
      const prefillType = localStorage.getItem("misintel_prefill_type");

      if (prefill && prefillType) {
        console.log("🌐 Web app: Loading from localStorage");
        setInput(prefill);
        setInputType(prefillType as InputType);
        localStorage.removeItem("misintel_prefill");
        localStorage.removeItem("misintel_prefill_type");
      }
    } catch (e) {
      console.error("Failed to load prefill:", e);
    }
  }, [isExtension]);

  // Extension polling logic
  useEffect(() => {
    if (!isExtension) return;

    console.log("🔌 Extension mode detected!");

    let foundText = false;
    let pollCount = 0;
    const MAX_POLLS = 30;
    const POLL_INTERVAL = 100;

    const checkForText = () => {
      pollCount++;
      console.log(`🔄 Poll attempt ${pollCount}/${MAX_POLLS}`);

      chrome.storage.local.get(
        ["selectedText", "fromContextMenu"],
        (result: { selectedText?: string; fromContextMenu?: boolean }) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Storage read error:", chrome.runtime.lastError);
            return;
          }

          console.log(`📦 Storage check ${pollCount}:`, result);

          if (result.selectedText && result.fromContextMenu && !foundText) {
            foundText = true;
            console.log("✅✅✅ FOUND TEXT! Filling input now!");

            setInput(result.selectedText);
            setInputType("text");
            setResult(null);

            chrome.storage.local.remove(
              ["selectedText", "fromContextMenu", "timestamp"],
              () => {
                console.log("✅ Storage cleaned");
              }
            );
          } else if (pollCount < MAX_POLLS && !foundText) {
            setTimeout(checkForText, POLL_INTERVAL);
          } else if (pollCount >= MAX_POLLS && !foundText) {
            console.log("⏱️ Polling timeout - no text found after 3 seconds");
          }
        }
      );
    };

    checkForText();

    return () => {
      foundText = true;
    };
  }, [isExtension]);

  // Listen for custom event from TrendingNews
  useEffect(() => {
    if (isExtension) return;

    const handlePrefill = (e: CustomEvent) => {
      const { value, type } = e.detail;
      console.log("📰 TrendingNews prefill event");
      setInput(value);
      setInputType(type);
      setResult(null);
    };

    window.addEventListener("misintel-prefill", handlePrefill as EventListener);
    return () => {
      window.removeEventListener(
        "misintel-prefill",
        handlePrefill as EventListener
      );
    };
  }, [isExtension]);

  const fetchTranslations = useCallback(async () => {
    if (!result || result.confidence === 0) return;

    if (Object.keys(translations).length > 1) {
      console.log("✅ Using cached translations");
      return;
    }

    setTranslating(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: result.summary,
          reasons: result.reasons || [],
          isFake: result.isFake,
          confidence: result.confidence,
          verificationFlow: result.verificationFlow?.map((step) => ({
            id: step.id,
            label: step.label,
            details: step.details,
          })),
        }),
      });

      if (!response.ok) throw new Error("Translation failed");

      const data = await response.json();
      setTranslations(data.translations || {});
      console.log("✅ Translations loaded");
    } catch (error) {
      console.error("❌ Translation fetch error:", error);
      setTranslations({
        en: {
          summary: result.summary,
          reasons: result.reasons || [],
          verificationFlow: result.verificationFlow?.map((step) => ({
            label: step.label,
            details: step.details,
          })),
        },
      });
    } finally {
      setTranslating(false);
    }
  }, [result, translations]);

  const handleLanguageChange = async (lang: LanguageCode) => {
    setSelectedLanguage(lang);

    if (Object.keys(translations).length <= 1 && result) {
      await fetchTranslations();
    }

    setTimeout(() => {
      if (result?.verificationFlow && showDiagram) {
        const currentTranslations =
          translations[lang] ?? translations["en"] ?? undefined;
        const translatedFlow =
          currentTranslations &&
          currentTranslations.verificationFlow &&
          currentTranslations.verificationFlow.length > 0
            ? currentTranslations.verificationFlow
            : result.verificationFlow.map((step) => ({
                label: step.label,
                details: step.details,
              }));

        const { nodes: flowNodes, edges: flowEdges } = generateFlowNodes(
          result.verificationFlow,
          translatedFlow
        );
        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    }, 100);
  };

  const getTranslatedContent = useCallback(() => {
    if (!result) return { summary: "", reasons: [], verificationFlow: [] };

    const translation = translations[selectedLanguage];

    if (translation) {
      return translation;
    }

    return {
      summary: result.summary,
      reasons: result.reasons || [],
      verificationFlow:
        result.verificationFlow?.map((step) => ({
          label: step.label,
          details: step.details,
        })) || [],
    };
  }, [result, translations, selectedLanguage]);

  const handleScanPage = async () => {
    if (!isExtension || !chrome.tabs) return;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        alert('No active tab found');
        return;
      }

      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        alert('Cannot scan Chrome system pages. Please visit a regular website.');
        return;
      }

      console.log('Sending scanPage message to tab:', tab.id);
      
      chrome.tabs.sendMessage(tab.id, { action: 'scanPage' }, (response: any) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError);
          alert('Failed to scan page. Please refresh the page and try again.');
        } else {
          console.log('Message sent successfully:', response);
          setTimeout(() => window.close(), 100);
        }
      });
    } catch (error) {
      console.error('Failed to scan page:', error);
      alert('Failed to scan page. Make sure you are on a valid webpage.');
    }
  };

  const handleClearHighlights = async () => {
    if (!isExtension || !chrome.tabs) return;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
      }
    } catch (error) {
      console.error('Failed to clear highlights:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileChange = (file: File) => {
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setInput("");
  };

  const handleAudioCapture = (blob: Blob, isRecorded: boolean) => {
    setAudioBlob(blob);
    setAudioPreview(URL.createObjectURL(blob));
    console.log(isRecorded ? '🎤 Audio recorded' : '📁 Audio file uploaded');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setResult(null);
    setLoading(true);
    setShowDiagram(false);
    setTranslations({});
    setSelectedLanguage("en");

    try {
      // ===== AUDIO HANDLING =====
      if (inputType === "audio") {
        if (!audioBlob) {
          throw new Error("Please record or upload audio");
        }

        console.log('🎤 Step 1: Converting audio to text...');

        // Step 1: Convert audio to text
        const audioFormData = new FormData();
        audioFormData.append('audio', audioBlob, 'recording.webm');

        const speechResponse = await fetch('/api/speech-to-text', {
          method: 'POST',
          body: audioFormData
        });

        const speechData = await speechResponse.json();

        if (!speechData.success || !speechData.transcript) {
          throw new Error(speechData.error || 'Failed to transcribe audio. Please try again.');
        }

        console.log('✅ Transcript:', speechData.transcript);
        console.log('🔍 Step 2: Fact-checking transcript...');

        // Step 2: Fact-check the transcript
        const factCheckFormData = new FormData();
        factCheckFormData.append('type', 'text');
        factCheckFormData.append('input', speechData.transcript);

        const apiBase = isExtension
          ? "http://localhost:3000"
          : process.env.NEXT_PUBLIC_API_URL || "";

        const response = await fetch(`${apiBase}/api/advanced-check`, {
          method: 'POST',
          body: factCheckFormData
        });

        if (!response.ok) {
          if (response.status === 429) {
            setResult({
              isFake: false,
              confidence: 0,
              summary: "Too many requests. Please wait a minute before trying again.",
              reasons: [
                "You have hit the rate limit for analysis.",
                "This helps prevent spam and keeps the service fast for everyone."
              ]
            });
            setLoading(false);
            return;
          }
          throw new Error(`Fact-check failed with status ${response.status}`);
        }

        const data = await response.json();

        // Step 3: Build verification flow
        const verificationFlow = buildVerificationFlow(data, speechData.transcript);
        const englishFlow = verificationFlow.map((step) => ({
          label: step.label,
          details: step.details,
        }));
        const { nodes: flowNodes, edges: flowEdges } = generateFlowNodes(
          verificationFlow,
          englishFlow
        );

        setNodes(flowNodes);
        setEdges(flowEdges);

        // Step 4: Set result
        const newResult: AnalysisResult = {
          isFake: Boolean(data.isFake),
          confidence: Number(data.confidence) || 0,
          summary: String(data.summary || 'Analysis complete'),
          reasons: Array.isArray(data.reasons) ? data.reasons : [],
          sources: Array.isArray(data.sources) ? data.sources : [],
          factCheckResults: data.factCheckResults || [],
          safetyCheck: data.safetyCheck || null,
          inputText: `🎤 Transcribed: "${speechData.transcript}"`,
          inputUrl: undefined,
          verificationFlow,
          author: data.author || null
        };

        setResult(newResult);
        setHistory((prev) => [newResult, ...prev.slice(0, 9)]);

        if (newResult.confidence > 0) {
          setTimeout(() => fetchTranslations(), 500);
        }

        setLoading(false);
        return;
      }

      // ===== VIDEO HANDLING =====
      if (inputType === "video") {
        if (!input.trim() && !videoFile) {
          throw new Error("Please provide a video URL or upload a video file.");
        }

        let payload: any = { prompt: "Analyze this video for misinformation." };

        if (videoFile) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            payload.base64Data = base64Data;
            payload.mimeType = videoFile.type;

            const response = await fetch("/api/video-check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.error) {
              throw new Error(data.error);
            }

            setResult({
              isFake: false,
              confidence: 85,
              summary: data.analysis || "No analysis generated.",
              reasons: data.groundingMetadata ? ["Analysis includes web search verification"] : ["AI-powered video content analysis"],
              sources: data.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [],
              inputText: videoFile.name,
              inputUrl: "",
              verificationFlow: [],
              author: undefined,
            });
            setLoading(false);
          };
          reader.readAsDataURL(videoFile);
          return;
        } else if (input.trim()) {
          payload.videoUrl = input.trim();

          const response = await fetch("/api/video-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          setResult({
            isFake: false,
            confidence: 0,
            summary: data.analysis || "No analysis generated.",
            reasons: [],
            sources: [],
            inputText: input.trim(),
            inputUrl: input.trim(),
            verificationFlow: [],
            author: undefined,
          });
          setLoading(false);
          return;
        }
      }

      // ===== IMAGE HANDLING =====
      if (inputType === "image") {
        if (!imageFile) {
          throw new Error("Please select an image");
        }
      } else if (inputType === "text" || inputType === "url") {
        if (!input.trim()) {
          throw new Error(
            inputType === "url"
              ? "Please enter a URL"
              : "Please enter some text"
          );
        }
      }

      if (inputType === "url" && !isValidUrl(input.trim())) {
        throw new Error(
          "Please enter a valid URL starting with http:// or https://"
        );
      }

      const formData = new FormData();
      if (inputType === 'image') {
        formData.append('type', 'image');
        if (imageFile) {
          formData.append('image', imageFile);
        }
      } else {
        formData.append('type', inputType);
        formData.append('input', input.trim());
      }

      const apiBase = isExtension
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_API_URL || "";

      const response = await fetch(`${apiBase}/api/advanced-check`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 429) {
          setResult({
            isFake: false,
            confidence: 0,
            summary:
              "Too many requests. Please wait a minute before trying again.",
            reasons: [
              "You have hit the rate limit for analysis.",
              "This helps prevent spam and keeps the service fast for everyone.",
            ],
          });
          setLoading(false);
          return;
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      const inputContent =
        inputType === "image"
          ? data.extractedText || "Image content"
          : input.trim();

      const verificationFlow = buildVerificationFlow(data, inputContent);

      const englishFlow = verificationFlow.map((step) => ({
        label: step.label,
        details: step.details,
      }));
      const { nodes: flowNodes, edges: flowEdges } = generateFlowNodes(
        verificationFlow,
        englishFlow
      );

      setNodes(flowNodes);
      setEdges(flowEdges);

      const newResult: AnalysisResult = {
        isFake: Boolean(data.isFake),
        confidence: Number(data.confidence) || 0,
        summary: String(data.summary || "Analysis complete"),
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
        factCheckResults: data.factCheckResults || [],
        safetyCheck: data.safetyCheck || null,
        inputText:
          inputType === "text"
            ? input.trim()
            : inputType === "image"
            ? data.extractedText || "Image analyzed"
            : data.inputText,
        inputUrl: inputType === "url" ? input.trim() : data.inputUrl,
        verificationFlow,
        author: data.author || null
      };

      setResult(newResult);
      setHistory((prev) => [newResult, ...prev.slice(0, 9)]);

      if (newResult.confidence > 0) {
        setTimeout(() => fetchTranslations(), 500);
      }
    } catch (error) {
      setResult({
        isFake: false,
        confidence: 0,
        summary: "Analysis failed",
        reasons: [
          error instanceof Error ? error.message : "An unknown error occurred",
          "Please check your input and try again",
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputTypeChange = (newType: InputType) => {
    setInputType(newType);
    setInput("");
    setResult(null);
    setShowDiagram(false);
    setTranslations({});
    setSelectedLanguage("en");
    setImageFile(null);
    setImagePreview("");
    setVideoFile(null);
    setVideoPreview("");
    setAudioBlob(null);
    setAudioPreview("");
  };

  const shareResults = async () => {
    if (!result) return;

    const { summary } = getTranslatedContent();
    const shareText = `${input || "Content"}\n\nVerified: ${
      result.isFake ? "Likely False" : "Likely True"
    } (${result.confidence}% confidence)\n\nSummary: ${summary}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fact Check Result",
          text: shareText,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Results copied to clipboard!");
      } catch (error) {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const downloadDiagram = async () => {
    const element = document.getElementById("verification-flow-diagram");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#000",
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `misintel-verification-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error("Failed to download diagram:", error);
      alert("Failed to download diagram");
    }
  };

  const handleSelectHistory = (item: AnalysisResult) => {
    setResult(item);
    setTranslations({});
    setSelectedLanguage("en");
    if (item.verificationFlow) {
      const englishFlow = item.verificationFlow.map((step) => ({
        label: step.label,
        details: step.details,
      }));
      const { nodes: flowNodes, edges: flowEdges } =
        generateFlowNodes(item.verificationFlow, englishFlow);
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  };

  const translatedContent = getTranslatedContent();

  return (
    <div
      id="fact-checker"
      className="relative min-h-screen flex items-center justify-center px-4 py-20 bg-muted/50 dark:bg-background"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 [background-size:40px_40px] select-none opacity-10",
          "[background-image:linear-gradient(to_right,#171717_1px,transparent_1px),linear-gradient(to_bottom,#171717_1px,transparent_1px)]"
        )}
      />

      <div className="relative z-10 text-left max-w-5xl mx-auto w-full">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-8">
            AI-Powered Fact Checker
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Enter text, URL, image, video, or audio to verify its authenticity using multiple AI
            models and fact-checking sources.
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 max-w-5xl mx-auto">
          {isExtension && (
            <ExtensionControls 
              onScanPage={handleScanPage}
              onClearHighlights={handleClearHighlights}
            />
          )}
          
          <InputTypeSelector 
            inputType={inputType}
            onInputTypeChange={handleInputTypeChange}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            {inputType === "image" ? (
              <ImageUpload 
                imagePreview={imagePreview}
                onImageChange={handleImageChange}
              />
            ) : inputType === "video" ? (
              <VideoUpload
                videoPreview={videoPreview}
                onVideoChange={handleVideoFileChange}
              />
            ) : inputType === "audio" ? (
              <AudioInput onAudioCapture={handleAudioCapture} />
            ) : (
              <TextInput 
                inputType={inputType}
                value={input}
                onChange={setInput}
              />
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (inputType === "image" ? !imageFile : 
                 inputType === "video" ? (!input.trim() && !videoFile) :
                 inputType === "audio" ? !audioBlob :
                 !input.trim())
              }
              className={cn(
                "w-full py-3 px-6 rounded-lg font-medium transition-all duration-200",
                "bg-gradient-to-b from-neutral-50 to-neutral-400 text-black",
                "hover:from-neutral-100 hover:to-neutral-500",
                "disabled:from-neutral-700 disabled:to-neutral-800",
                "disabled:text-neutral-400",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                loading && "animate-pulse"
              )}
            >
              {loading ? "Analyzing..." : "Verify Content"}
            </button>
          </form>
        </div>

        {result && (
          <div className="mt-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 max-w-5xl mx-auto">
            {result.confidence > 0 && (
              <LanguageSelector 
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
                translating={translating}
              />
            )}

            <ResultDisplay 
              result={result}
              translatedContent={translatedContent}
              onShare={shareResults}
              onToggleDiagram={() => setShowDiagram(!showDiagram)}
              showDiagram={showDiagram}
            />

            {showDiagram && result.verificationFlow && (
              <VerificationFlowDiagram 
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                verificationFlow={result.verificationFlow}
                onDownload={downloadDiagram}
              />
            )}
          </div>
        )}

        <HistoryList 
          history={history}
          onSelectHistory={handleSelectHistory}
          onClearHistory={clearHistoryItem}
          onClearAllHistory={clearAllHistory}
        />
      </div>
    </div>
  );
}

export default FactCheckTool;