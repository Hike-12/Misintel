import { AnalysisResult } from './types';

interface HistoryListProps {
  history: AnalysisResult[];
  onSelectHistory: (item: AnalysisResult) => void;
}

export function HistoryList({ history, onSelectHistory }: HistoryListProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-8 max-w-5xl mx-auto">
      <h3 className="text-sm font-medium text-neutral-400 mb-3 text-center">
        Recent checks
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {history.map((item, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
              item.isFake
                ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                : item.confidence === 0
                ? "border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10"
                : "border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
            }`}
            onClick={() => onSelectHistory(item)}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-300 truncate flex-1">
                {item.inputText || item.inputUrl || "Content analysis"}
              </p>
              {item.confidence > 0 && (
                <span
                  className={`text-xs font-medium ml-2 ${
                    item.isFake ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {item.confidence}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
