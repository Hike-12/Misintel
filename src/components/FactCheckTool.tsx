'use client';

import { useState, useEffect } from 'react';
import { cn } from "@/utils/cn";

// @ts-ignore
const chrome = (typeof window !== "undefined" && (window as any).chrome) ? (window as any).chrome : undefined;

type AnalysisResult = {
  isFake: boolean;
  confidence: number;
  summary: string;
  reasons?: string[];
  sources?: string[];
  factCheckResults?: any[];
  safetyCheck?: any;
  inputText?: string;
  inputUrl?: string;
};

function FactCheckTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [inputType, setInputType] = useState<'text' | 'url'>('text');

  function isValidUrl(url: string) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  // Load from localStorage on mount (for web app)
  useEffect(() => {
    if (isExtension) return;
    
    try {
      const prefill = localStorage.getItem('misintel_prefill');
      const prefillType = localStorage.getItem('misintel_prefill_type');
      
      if (prefill && prefillType) {
        console.log('🌐 Web app: Loading from localStorage');
        setInput(prefill);
        setInputType(prefillType as 'text' | 'url');
        localStorage.removeItem('misintel_prefill');
        localStorage.removeItem('misintel_prefill_type');
      }
    } catch (e) {
      console.error('Failed to load prefill:', e);
    }
  }, [isExtension]);

  // EXTENSION: Aggressive polling with immediate check
  useEffect(() => {
    if (!isExtension) return;

    console.log('🔌 Extension mode detected!');
    
    let foundText = false;
    let pollCount = 0;
    const MAX_POLLS = 30; // 3 seconds total
    const POLL_INTERVAL = 100; // Check every 100ms

    const checkForText = () => {
      pollCount++;
      console.log(`🔄 Poll attempt ${pollCount}/${MAX_POLLS}`);

      chrome.storage.local.get(['selectedText', 'fromContextMenu'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Storage read error:', chrome.runtime.lastError);
          return;
        }

        console.log(`📦 Storage check ${pollCount}:`, result);

        if (result.selectedText && result.fromContextMenu && !foundText) {
          foundText = true;
          console.log('✅✅✅ FOUND TEXT! Filling input now!');
          
          setInput(result.selectedText);
          setInputType('text');
          setResult(null);

          // Clear storage
          chrome.storage.local.remove(['selectedText', 'fromContextMenu', 'timestamp'], () => {
            console.log('🧹 Storage cleared after successful fill');
          });
        } else if (pollCount < MAX_POLLS && !foundText) {
          // Keep polling
          setTimeout(checkForText, POLL_INTERVAL);
        } else if (pollCount >= MAX_POLLS && !foundText) {
          console.log('⏱️ Polling timeout - no text found after 3 seconds');
        }
      });
    };

    // Start immediately
    checkForText();

    // Cleanup
    return () => {
      foundText = true; // Stop polling if component unmounts
    };
  }, [isExtension]);

  // Listen for custom event from TrendingNews (for web app)
  useEffect(() => {
    if (isExtension) return;
    
    const handlePrefill = (e: CustomEvent) => {
      const { value, type } = e.detail;
      console.log('📰 TrendingNews prefill event');
      setInput(value);
      setInputType(type);
      setResult(null);
    };

    window.addEventListener('misintel-prefill', handlePrefill as EventListener);
    return () => {
      window.removeEventListener('misintel-prefill', handlePrefill as EventListener);
    };
  }, [isExtension]);

  // Listen for custom event from TrendingNews (for web app)
  useEffect(() => {
    if (isExtension) return;
    
    const handlePrefill = (e: CustomEvent) => {
      const { value, type } = e.detail;
      setInput(value);
      setInputType(type);
      setResult(null);
    };

    window.addEventListener('misintel-prefill', handlePrefill as EventListener);
    return () => {
      window.removeEventListener('misintel-prefill', handlePrefill as EventListener);
    };
  }, [isExtension]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setResult(null);
    setLoading(true);

    try {
      if (!input.trim()) {
        throw new Error(inputType === 'url' ? 'Please enter a URL' : 'Please enter some text');
      }

      if (inputType === 'url' && !isValidUrl(input.trim())) {
        throw new Error('Please enter a valid URL starting with http:// or https://');
      }

      const formData = new FormData();
      formData.append('type', inputType);
      formData.append('input', input.trim());

      const apiBase = isExtension
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_API_URL || "";
      
      const response = await fetch(`${apiBase}/api/advanced-check`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      const newResult: AnalysisResult = {
        isFake: Boolean(data.isFake),
        confidence: Number(data.confidence) || 0,
        summary: String(data.summary || 'Analysis complete'),
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
        factCheckResults: data.factCheckResults || [],
        safetyCheck: data.safetyCheck || null,
        inputText: inputType === 'text' ? input.trim() : data.inputText,
        inputUrl: inputType === 'url' ? input.trim() : data.inputUrl
      };
      
      setResult(newResult);
      setHistory(prev => [newResult, ...prev.slice(0, 4)]);

    } catch (error) {
      setResult({
        isFake: false,
        confidence: 0,
        summary: 'Analysis failed',
        reasons: [
          error instanceof Error ? error.message : 'An unknown error occurred',
          'Please check your input and try again'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputTypeChange = (newType: 'text' | 'url') => {
    setInputType(newType);
    setInput('');
    setResult(null);
  };

  const shareResults = async () => {
    if (!result) return;

    const shareText = `${input || 'Content'}\n\nVerified: ${result.isFake ? 'Likely False' : 'Likely True'} (${result.confidence}% confidence)\n\nSummary: ${result.summary}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Fact Check Result',
          text: shareText,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Results copied to clipboard!');
      } catch (error) {
        alert('Failed to copy to clipboard');
      }
    }
  };

  return (
    <div id="fact-checker" className="relative min-h-screen flex items-center justify-center px-4 py-20 bg-black">
      {/* ...rest of the component stays the same... */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 [background-size:40px_40px] select-none opacity-10",
          "[background-image:linear-gradient(to_right,#171717_1px,transparent_1px),linear-gradient(to_bottom,#171717_1px,transparent_1px)]"
        )}
      />

      <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-4">
            AI-Powered Fact Checker
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Enter text or URL to verify its authenticity using multiple AI models and fact-checking sources.
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <div className="flex gap-3 mb-6 justify-center">
            {(['text', 'url'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleInputTypeChange(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm border ${
                  inputType === type 
                    ? 'bg-gradient-to-b from-neutral-50 to-neutral-400 text-black border-transparent' 
                    : 'bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <textarea
              className="w-full p-4 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 transition-all duration-200 bg-neutral-900/30 text-neutral-100 placeholder-neutral-500 text-sm resize-none"
              rows={inputType === 'text' ? 4 : 2}
              placeholder={inputType === 'text' ? "Paste text to verify..." : "Enter URL to verify..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full bg-gradient-to-b from-neutral-50 to-neutral-400 hover:from-neutral-100 hover:to-neutral-300 disabled:from-neutral-700 disabled:to-neutral-800 text-black font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : 'Verify Content'}
            </button>
          </form>
        </div>

        {/* Results and History sections remain the same */}
        {result && (
          <div className="mt-8">
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  result.isFake ? 'bg-red-500/20 text-red-400' : 
                  result.confidence === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                  'bg-green-500/20 text-green-400'
                }`}>
                  {result.confidence === 0 ? '⚠️' : result.isFake ? '✕' : '✓'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold mb-3 ${
                    result.isFake ? 'text-red-400' : 
                    result.confidence === 0 ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {result.confidence === 0 ? 'Analysis Failed' : result.isFake ? 'Likely False' : 'Likely True'} 
                    {result.confidence > 0 && ` (${result.confidence}% confidence)`}
                  </h3>
                  
                  {result.confidence > 0 && (
                    <div className="mb-4">
                      <div className="w-full bg-neutral-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                            result.isFake ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${result.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <p className="text-neutral-300 text-sm leading-relaxed">{result.summary}</p>
                  </div>
                  
                  {result.reasons && result.reasons.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-neutral-100 mb-2">
                        {result.confidence === 0 ? 'Issues:' : result.isFake ? 'Red Flags:' : 'Indicators:'}
                      </h4>
                      <ul className="text-neutral-400 text-sm space-y-1">
                        {result.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start">
                            <span className="mr-2 mt-1">•</span>
                            <span className="flex-1">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.confidence > 0 && (
                    <button
                      onClick={shareResults}
                      className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-all duration-200 text-xs font-medium"
                    >
                      Share Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-neutral-400 mb-3 text-center">Recent checks</h3>
            <div className="grid grid-cols-1 gap-2">
              {history.map((item, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                    item.isFake ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : 
                    item.confidence === 0 ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10' : 
                    'border-green-500/20 bg-green-500/5 hover:bg-green-500/10'
                  }`}
                  onClick={() => setResult(item)}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-300 truncate flex-1">
                      {item.inputText || item.inputUrl || 'Content analysis'}
                    </p>
                    {item.confidence > 0 && (
                      <span className={`text-xs font-medium ml-2 ${
                        item.isFake ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {item.confidence}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FactCheckTool;