'use client';

import React, { useState } from 'react';
import { User, ExternalLink, TrendingUp, FileText } from 'lucide-react';

interface AuthorInfo {
  name: string;
  credibility_score?: number;
  previous_articles?: Array<{
    title: string;
    url: string;
    date: string;
  }>;
}

interface AuthorDisplayProps {
  author: AuthorInfo;
}

export default function AuthorDisplay({ author }: AuthorDisplayProps) {
  const [showArticles, setShowArticles] = useState(false);

  if (!author || !author.name) return null;

  const getCredibilityColor = (score?: number) => {
    if (!score) return 'text-neutral-400';
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCredibilityLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 70) return 'High Credibility';
    if (score >= 40) return 'Moderate Credibility';
    return 'Low Credibility';
  };

  return (
    <div className="mt-6 bg-neutral-900/50 border border-neutral-700 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
          <User className="w-6 h-6 text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-neutral-100">
              {author.name}
            </h4>
            {author.credibility_score && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className={`w-4 h-4 ${getCredibilityColor(author.credibility_score)}`} />
                <span className={`text-sm font-medium ${getCredibilityColor(author.credibility_score)}`}>
                  {author.credibility_score}%
                </span>
              </div>
            )}
          </div>

          <p className={`text-sm mb-4 ${getCredibilityColor(author.credibility_score)}`}>
            {getCredibilityLabel(author.credibility_score)}
          </p>

          {author.previous_articles && author.previous_articles.length > 0 && (
            <div>
              <button
                onClick={() => setShowArticles(!showArticles)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-3"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {showArticles ? 'Hide' : 'Show'} Previous Articles ({author.previous_articles.length})
                </span>
              </button>

              {showArticles && (
                <div className="space-y-2 pl-6 border-l-2 border-neutral-700">
                  {author.previous_articles.map((article, index) => (
                    <div key={index}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-neutral-200 line-clamp-2">
                              {article.title}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">
                              {article.date}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-neutral-500" />
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}