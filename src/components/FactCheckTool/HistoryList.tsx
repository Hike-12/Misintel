import { AnalysisResult } from './types';
import { Trash2, X, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HistoryListProps {
  history: AnalysisResult[];
  onSelectHistory: (item: AnalysisResult) => void;
  onClearHistory: (index: number) => void;
  onClearAllHistory: () => void;
}

export function HistoryList({ 
  history, 
  onSelectHistory, 
  onClearHistory,
  onClearAllHistory 
}: HistoryListProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-8 max-w-5xl mx-auto">
      <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h3 className="text-base font-semibold text-neutral-200">
              Recent Checks ({history.length})
            </h3>
          </div>
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-neutral-900 border-neutral-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-neutral-100">Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription className="text-neutral-400">
                    This will permanently delete all {history.length} saved fact-checks from your history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border-neutral-700">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearAllHistory} className="bg-red-500 hover:bg-red-600 text-white">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {history.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl transition-all duration-200 border-2 relative group cursor-pointer ${
                item.isFake
                  ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50"
                  : item.confidence === 0
                  ? "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500/50"
                  : "border-green-500/30 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/50"
              }`}
              onClick={() => onSelectHistory(item)}
            >
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-200 line-clamp-2 mb-1">
                    {item.inputText || item.inputUrl || "Content analysis"}
                  </p>
                  {item.summary && (
                    <p className="text-xs text-neutral-400 line-clamp-1">
                      {item.summary}
                    </p>
                  )}
                </div>
                {item.confidence > 0 && (
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-sm font-bold ${
                        item.isFake ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {item.confidence}%
                    </span>
                    <span className={`text-xs font-medium ${
                      item.isFake ? "text-red-400/80" : "text-green-400/80"
                    }`}>
                      {item.isFake ? "False" : "True"}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearHistory(index);
                }}
                className="absolute right-3 top-3 p-2 rounded-lg hover:bg-black/30 text-neutral-400 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                title="Remove this item"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}