import { ExternalLink, Share2 } from "lucide-react";
import { AnalysisResult } from './types';
import AuthorDisplay from '@/components/AuthorDisplay';

interface ResultDisplayProps {
  result: AnalysisResult;
  translatedContent: {
    summary: string;
    reasons: string[];
  };
  onShare: () => void;
  onToggleDiagram: () => void;
  showDiagram: boolean;
}

// ✅ ADD THIS HELPER FUNCTION
const formatAnalysis = (text: string): string[] => {
  // Split by numbered lists (1., 2., etc.) or section breaks
  const sections = text
    .split(/(?=\d+\.\s+\*\*|\n\n)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sections;
};

// ✅ ADD THIS HELPER TO RENDER TEXT WITH BOLD
const renderTextWithBold = (text: string) => {
  return text.split('**').map((part, i) => 
    i % 2 === 1 ? (
      <strong key={i} className="text-neutral-100 font-semibold">{part}</strong>
    ) : (
      part
    )
  );
};

export function ResultDisplay({ 
  result, 
  translatedContent, 
  onShare, 
  onToggleDiagram,
  showDiagram 
}: ResultDisplayProps) {
  // ✅ CHECK IF IT'S A FORMATTED ANALYSIS (video analysis)
  const isFormattedAnalysis = translatedContent.summary.includes('**') || 
                              translatedContent.summary.includes('1.') ||
                              translatedContent.summary.includes('\n\n');

  return (
    <div className="flex items-start space-x-4">
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
          result.isFake
            ? "bg-red-500/20 text-red-400"
            : result.confidence === 0
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-green-500/20 text-green-400"
        }`}
      >
        {result.confidence === 0 ? "⚠️" : result.isFake ? "✕" : "✓"}
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className={`text-lg font-semibold mb-3 ${
            result.isFake
              ? "text-red-400"
              : result.confidence === 0
              ? "text-yellow-500/20 text-yellow-400"
              : "text-green-400"
          }`}
        >
          {result.confidence === 0
            ? "Analysis Failed"
            : result.isFake
            ? "Likely False"
            : "Likely True"}
          {result.confidence > 0 &&
            ` (${result.confidence}% confidence)`}
        </h3>

        {result.confidence > 0 && (
          <div className="mb-4">
            <div className="w-full bg-neutral-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                  result.isFake ? "bg-red-500" : "bg-green-500"
                }`}
                style={{ width: `${result.confidence}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* ✅ UPDATED SUMMARY SECTION */}
        <div className="mb-4">
          {isFormattedAnalysis ? (
            <div className="space-y-3">
              {formatAnalysis(translatedContent.summary).map((section, idx) => (
                <p key={idx} className="text-neutral-300 text-sm leading-relaxed">
                  {renderTextWithBold(section)}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-neutral-300 text-sm leading-relaxed">
              {translatedContent.summary}
            </p>
          )}
        </div>

        {translatedContent.reasons &&
          translatedContent.reasons.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-neutral-100 mb-2">
                {result.confidence === 0
                  ? "Issues:"
                  : result.isFake
                  ? "Red Flags:"
                  : "Indicators:"}
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
            <h4 className="text-sm font-medium text-neutral-100 mb-2">
              Sources:
            </h4>
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

        <div className="flex gap-2 mb-6">
          {result.confidence > 0 && (
            <button
              onClick={onShare}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-all duration-200 text-xs font-medium flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Results
            </button>
          )}

          {result.verificationFlow && (
            <button
              onClick={onToggleDiagram}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-xs font-medium"
            >
              {showDiagram ? "Hide" : "Show"} Verification Flow
            </button>
          )}
        </div>

        {result.author && <AuthorDisplay author={result.author} />}
      </div>
    </div>
  );
}