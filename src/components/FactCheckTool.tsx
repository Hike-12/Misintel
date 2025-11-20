'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from "@/utils/cn";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
// @ts-ignore: Allow importing CSS side-effects without type declarations
import 'reactflow/dist/style.css';
import { Download, Share2, ExternalLink, Languages } from 'lucide-react';
import html2canvas from 'html2canvas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/app/api/translate/route';

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
  verificationFlow?: VerificationStep[];
};

type VerificationStep = {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'success' | 'warning' | 'error';
  details: string;
  sources?: Array<{ url: string; title: string }>;
  timestamp?: number;
};

type TranslationCache = {
  [key in LanguageCode]?: {
    summary: string;
    reasons: string[];
    verificationFlow?: Array<{
      label: string;
      details: string;
    }>;
  };
};

function FactCheckTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [showDiagram, setShowDiagram] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Translation states
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [translations, setTranslations] = useState<TranslationCache>({});
  const [translating, setTranslating] = useState(false);

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

  // Extension polling logic
  useEffect(() => {
    if (!isExtension) return;

    console.log('🔌 Extension mode detected!');
    
    let foundText = false;
    let pollCount = 0;
    const MAX_POLLS = 30;
    const POLL_INTERVAL = 100;

    const checkForText = () => {
      pollCount++;
      console.log(`🔄 Poll attempt ${pollCount}/${MAX_POLLS}`);

      chrome.storage.local.get(['selectedText', 'fromContextMenu'], (result: { selectedText?: string; fromContextMenu?: boolean }) => {
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

          chrome.storage.local.remove(['selectedText', 'fromContextMenu', 'timestamp'], () => {
            console.log('🧹 Storage cleared after successful fill');
          });
        } else if (pollCount < MAX_POLLS && !foundText) {
          setTimeout(checkForText, POLL_INTERVAL);
        } else if (pollCount >= MAX_POLLS && !foundText) {
          console.log('⏱️ Polling timeout - no text found after 3 seconds');
        }
      });
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

  /**
   * Fetch translations when result changes
   */
  const fetchTranslations = useCallback(async () => {
    if (!result || result.confidence === 0) return;
    
    // Check if we already have translations
    if (Object.keys(translations).length > 1) {
      console.log('✅ Using cached translations');
      return;
    }
    
    setTranslating(true);
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: result.summary,
          reasons: result.reasons || [],
          isFake: result.isFake,
          confidence: result.confidence,
          verificationFlow: result.verificationFlow?.map(step => ({
            id: step.id,
            label: step.label,
            details: step.details,
          })),
        }),
      });
      
      if (!response.ok) throw new Error('Translation failed');
      
      const data = await response.json();
      setTranslations(data.translations || {});
      console.log('✅ Translations loaded');
      
    } catch (error) {
      console.error('❌ Translation fetch error:', error);
      // Keep English only
      setTranslations({
        en: {
          summary: result.summary,
          reasons: result.reasons || [],
          verificationFlow: result.verificationFlow?.map(step => ({
            label: step.label,
            details: step.details,
          })),
        },
      });
    } finally {
      setTranslating(false);
    }
  }, [result, translations]);

  /**
   * Handle language change
   */
  const handleLanguageChange = async (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    
    // Fetch translations if not already loaded
    if (Object.keys(translations).length <= 1 && result) {
      await fetchTranslations();
    }
    
    // Wait a bit for state to update, then regenerate flow nodes with new language
    setTimeout(() => {
      if (result?.verificationFlow && showDiagram) {
        const currentTranslations = translations[lang] ?? translations['en'] ?? undefined;
        const translatedFlow = (currentTranslations && currentTranslations.verificationFlow && currentTranslations.verificationFlow.length > 0)
          ? currentTranslations.verificationFlow
          : result.verificationFlow.map(step => ({
            label: step.label,
            details: step.details,
          }));
        
        const { nodes: flowNodes, edges: flowEdges } = generateFlowNodes(result.verificationFlow, translatedFlow);
        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    }, 100);
  };

  /**
   * Get translated content for current language
   */
  const getTranslatedContent = useCallback(() => {
    if (!result) return { summary: '', reasons: [], verificationFlow: [] };
    
    const translation = translations[selectedLanguage];
    
    if (translation) {
      return translation;
    }
    
    // Fallback to English
    return {
      summary: result.summary,
      reasons: result.reasons || [],
      verificationFlow: result.verificationFlow?.map(step => ({
        label: step.label,
        details: step.details,
      })) || [],
    };
  }, [result, translations, selectedLanguage]);

  const buildVerificationFlow = useCallback((data: any, inputContent: string): VerificationStep[] => {
    const steps: VerificationStep[] = [];

    // Step 1: Input received
    steps.push({
      id: '1',
      label: 'Input Received',
      status: 'success',
      details: inputContent.substring(0, 100) + (inputContent.length > 100 ? '...' : ''),
      timestamp: Date.now(),
    });

    // Step 2: News API Check
    if (data.newsResults && data.newsResults.length > 0) {
      steps.push({
        id: '2',
        label: 'Recent News Check',
        status: 'success',
        details: `Found ${data.newsResults.length} recent articles from trusted sources`,
        sources: data.newsResults.slice(0, 3).map((article: any) => ({
          url: article.url,
          title: article.title || article.source?.name || 'News Article'
        })),
        timestamp: Date.now() + 100,
      });
    } else {
      steps.push({
        id: '2',
        label: 'Recent News Check',
        status: 'warning',
        details: 'No recent news articles found',
        timestamp: Date.now() + 100,
      });
    }

    // Step 3: Fact Check Database (improved)
    const parseClaimRating = (claim: any) => {
      const review = (claim.claimReview && claim.claimReview[0]) || (claim.reviewers && claim.reviewers[0]) || null;
      let ratingText = '';

      if (review) {
        ratingText =
          (review.textualRating || '') ||
          (review.reviewRating && review.reviewRating.alternateName) ||
          (review.title || '') ||
          (review.description || '') ||
          '';
      }

      ratingText = ratingText || (claim.textualRating || claim.rating || '');
      return ratingText.toString().trim().toLowerCase();
    };

    const extractClaimUrls = (claim: any) => {
      const review = (claim.claimReview && claim.claimReview[0]) || (claim.reviewers && claim.reviewers[0]) || null;
      const urls: string[] = [];
      if (review) {
        if (review.url) urls.push(review.url);
        if (review.publisher && review.publisher.url) urls.push(review.publisher.url);
        if (review.publisher && review.publisher.site) urls.push(review.publisher.site);
      }
      if (claim.url) urls.push(claim.url);
      return urls.filter(Boolean);
    };

    const NEGATIVE_RE = /\b(false|misleading|pants on fire|fabricated|hoax|incorrect|not true|debunked|falsehood|misrepresen|untrue)\b/i;
    const POSITIVE_RE = /\b(true|accurate|correct|verified|substantiated|true claim|confirmed|supported)\b/i;

    if (data.factCheckResults && data.factCheckResults.length > 0) {
      let hasNegative = false;
      let hasPositive = false;

      data.factCheckResults.forEach((claim: any) => {
        const rt = parseClaimRating(claim);
        if (!rt) {
          // useful debug when classification is unclear
          console.debug('FactCheck claim (no rating found):', claim);
        } else {
          if (NEGATIVE_RE.test(rt)) hasNegative = true;
          if (POSITIVE_RE.test(rt)) hasPositive = true;
        }
      });

      let status: VerificationStep['status'] = 'warning';
      if (hasNegative && !hasPositive) status = 'error';
      else if (hasPositive && !hasNegative) status = 'success';
      else status = 'warning';

      steps.push({
        id: '3',
        label: 'Fact Check Database',
        status,
        details: `Found ${data.factCheckResults.length} related fact-check(s)`,
        sources: data.factCheckResults
          .flatMap((c: any) => extractClaimUrls(c))
          .slice(0, 3)
          .map((u: string) => ({ url: u, title: u })),
        timestamp: Date.now() + 200,
      });
    } else {
      steps.push({
        id: '3',
        label: 'Fact Check Database',
        status: 'warning',
        details: 'No existing fact-checks found',
        timestamp: Date.now() + 200,
      });
    }

    // Step 4: Custom Search Verification
    if (data.customSearchResults && data.customSearchResults.length > 0) {
      steps.push({
        id: '4',
        label: 'Search Verification',
        status: 'success',
        details: `Analyzed ${data.customSearchResults.length} search results`,
        sources: data.customSearchResults.slice(0, 3).map((item: any) => ({
          url: item.link,
          title: item.title || item.source || 'Search Result'
        })),
        timestamp: Date.now() + 300,
      });
    } else {
      steps.push({
        id: '4',
        label: 'Search Verification',
        status: 'warning',
        details: 'Limited search results available',
        timestamp: Date.now() + 300,
      });
    }

    // Step 5: URL Safety Check
    if (data.safetyCheck) {
      steps.push({
        id: '5',
        label: 'URL Safety Check',
        status: data.safetyCheck.safe ? 'success' : 'error',
        details: data.safetyCheck.safe 
          ? 'No security threats detected'
          : `${data.safetyCheck.threats?.length || 0} security threats found`,
        timestamp: Date.now() + 400,
      });
    }

    // Step 6: AI Analysis
    steps.push({
      id: '6',
      label: 'AI Analysis',
      status: data.confidence >= 80 ? 'success' : data.confidence >= 60 ? 'warning' : 'error',
      details: `Confidence: ${data.confidence}% - ${data.isFake ? 'Likely False' : 'Likely True'}`,
      timestamp: Date.now() + 500,
    });

    // Step 7: Final Verdict
    steps.push({
      id: '7',
      label: 'Final Verdict',
      status: data.isFake ? 'error' : 'success',
      details: data.summary,
      sources: data.sources?.map((url: string) => ({
        url,
        title: new URL(url).hostname
      })) || [],
      timestamp: Date.now() + 600,
    });

    return steps;
  }, []);

  // Update generateFlowNodes to accept translatedFlow as a parameter
  const generateFlowNodes = useCallback((steps: VerificationStep[], translatedFlow?: Array<{ label: string; details: string }>): { nodes: Node[], edges: Edge[] } => {
    const nodeWidth = 280;
    const nodeHeight = 120;
    const horizontalSpacing = 350;
    const verticalSpacing = 200;
    
    // Use provided translatedFlow or empty array
    const flowTranslations = translatedFlow || [];
    
    const nodes: Node[] = steps.map((step, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      
      // Find matching translated step
      const translatedStep = flowTranslations[index] || { label: step.label, details: step.details };
      
      return {
        id: step.id,
        type: 'default',
        position: { 
          x: col * horizontalSpacing, 
          y: row * verticalSpacing 
        },
        data: { 
          label: (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{translatedStep.label}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  step.status === 'success' ? 'bg-green-500/20 text-green-400' :
                  step.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                  step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {step.status === 'success' ? '✓' :
                   step.status === 'warning' ? '⚠' :
                   step.status === 'error' ? '✕' : '⋯'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mb-2">{translatedStep.details}</p>
              {step.sources && step.sources.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {step.sources.slice(0, 2).map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{source.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        },
        style: {
          background: 'rgba(0, 0, 0, 0.6)',
          border: `1px solid ${
            step.status === 'success' ? 'rgba(34, 197, 94, 0.3)' :
            step.status === 'warning' ? 'rgba(234, 179, 8, 0.3)' :
            step.status === 'error' ? 'rgba(239, 68, 68, 0.3)' :
            'rgba(59, 130, 246, 0.3)'
          }`,
          borderRadius: '12px',
          color: '#fff',
          width: nodeWidth,
          minHeight: nodeHeight,
        },
      };
    });

    const edges: Edge[] = steps.slice(0, -1).map((step, index) => ({
      id: `e${step.id}-${steps[index + 1].id}`,
      source: step.id,
      target: steps[index + 1].id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#666', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#666',
      },
    }));

    return { nodes, edges };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setResult(null);
    setLoading(true);
    setShowDiagram(false);
    setTranslations({});
    setSelectedLanguage('en');

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
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      const verificationFlow = buildVerificationFlow(data, input.trim());
      
      // Generate initial English flow nodes
      const englishFlow = verificationFlow.map(step => ({
        label: step.label,
        details: step.details,
      }));
      const { nodes: flowNodes, edges: flowEdges } = generateFlowNodes(verificationFlow, englishFlow);
      
      setNodes(flowNodes);
      setEdges(flowEdges);
      
      const newResult: AnalysisResult = {
        isFake: Boolean(data.isFake),
        confidence: Number(data.confidence) || 0,
        summary: String(data.summary || 'Analysis complete'),
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
        factCheckResults: data.factCheckResults || [],
        safetyCheck: data.safetyCheck || null,
        inputText: inputType === 'text' ? input.trim() : data.inputText,
        inputUrl: inputType === 'url' ? input.trim() : data.inputUrl,
        verificationFlow,
      };
      
      setResult(newResult);
      setHistory(prev => [newResult, ...prev.slice(0, 4)]);
      
      // Auto-fetch translations after successful analysis
      if (newResult.confidence > 0) {
        setTimeout(() => fetchTranslations(), 500);
      }

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
    setShowDiagram(false);
    setTranslations({});
    setSelectedLanguage('en');
  };

  const shareResults = async () => {
    if (!result) return;

    const { summary, reasons } = getTranslatedContent();
    const shareText = `${input || 'Content'}\n\nVerified: ${result.isFake ? 'Likely False' : 'Likely True'} (${result.confidence}% confidence)\n\nSummary: ${summary}`;

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

  const downloadDiagram = async () => {
    const element = document.getElementById('verification-flow-diagram');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#000',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `misintel-verification-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Failed to download diagram:', error);
      alert('Failed to download diagram');
    }
  };

  const translatedContent = getTranslatedContent();

  return (
    <div id="fact-checker" className="relative min-h-screen flex items-center justify-center px-4 py-20 bg-muted/50 dark:bg-background">
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
            Enter text or URL to verify its authenticity using multiple AI models and fact-checking sources.
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 max-w-5xl mx-auto">
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

        {result && (
          <div className="mt-8 max-w-5xl mx-auto">
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
              {/* Language Selector */}
              {result.confidence > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs text-neutral-400">Language:</span>
                  </div>
                  <Select
                    value={selectedLanguage}
                    onValueChange={handleLanguageChange}
                    disabled={translating}
                  >
                    <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {translating && (
                <div className="mb-4 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading translations...</span>
                  </div>
                </div>
              )}

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
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {translatedContent.summary}
                    </p>
                  </div>
                  
                  {translatedContent.reasons && translatedContent.reasons.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-neutral-100 mb-2">
                        {result.confidence === 0 ? 'Issues:' : result.isFake ? 'Red Flags:' : 'Indicators:'}
                      </h4>
                      <ul className="text-neutral-400 text-sm space-y-1">
                        {translatedContent.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start">
                            <span className="mr-2 mt-1">•</span>
                            <span className="flex-1">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.sources && result.sources.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-neutral-100 mb-2">Sources:</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.sources.map((source, i) => (
                          <a
                            key={i}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/20"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {new URL(source).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {result.confidence > 0 && (
                      <button
                        onClick={shareResults}
                        className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-all duration-200 text-xs font-medium flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share Results
                      </button>
                    )}
                    
                    {result.verificationFlow && (
                      <button
                        onClick={() => setShowDiagram(!showDiagram)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-xs font-medium"
                      >
                        {showDiagram ? 'Hide' : 'Show'} Verification Flow
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {showDiagram && result.verificationFlow && (
              <div className="mt-6 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-neutral-100">Verification Process</h3>
                  <button
                    onClick={downloadDiagram}
                    className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-all duration-200 text-xs font-medium flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Diagram
                  </button>
                </div>
                
                <div id="verification-flow-diagram" className="w-full h-[600px] bg-black/60 rounded-lg">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    minZoom={0.5}
                    maxZoom={1.5}
                  >
                    <Background color="#333" gap={16} />
                    <Controls className="bg-neutral-800 border border-neutral-700" />
                    <MiniMap 
                      className="bg-neutral-900 border border-neutral-700"
                      nodeColor={(node) => {
                        const status = result.verificationFlow?.find(s => s.id === node.id)?.status;
                        return status === 'success' ? '#22c55e' :
                               status === 'warning' ? '#eab308' :
                               status === 'error' ? '#ef4444' : '#3b82f6';
                      }}
                    />
                  </ReactFlow>
                </div>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8 max-w-5xl mx-auto">
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
                  onClick={() => {
                    setResult(item);
                    setTranslations({});
                    setSelectedLanguage('en');
                    if (item.verificationFlow) {
                      const englishFlow = item.verificationFlow.map(step => ({
                        label: step.label,
                        details: step.details,
                      }));
                      const { nodes: flowNodes, edges: flowEdges } = generateFlowNodes(item.verificationFlow, englishFlow);
                      setNodes(flowNodes);
                      setEdges(flowEdges);
                    }
                  }}
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