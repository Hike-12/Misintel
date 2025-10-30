'use client';

import { useEffect, useState } from 'react';

type NewsItem = { title: string; link: string; publishedAt?: string; source?: string };

const QUICK_TOPICS = ['Trending', 'India', 'World', 'Technology', 'Business', 'Science', 'Health', 'Sports'];

export default function TrendingNews() {
  const [topic, setTopic] = useState('Trending');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = q && q !== 'Trending' ? `?q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`/api/trending${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load news');
      setItems(json.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load news');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const prefillAndGo = (value: string, isUrl: boolean) => {
    try {
      // Store both the value and type
      localStorage.setItem('misintel_prefill', value);
      localStorage.setItem('misintel_prefill_type', isUrl ? 'url' : 'text');
      
      // Smooth scroll to fact checker
      const factChecker = document.getElementById('fact-checker');
      if (factChecker) {
        factChecker.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Trigger a custom event to notify FactCheckTool
        window.dispatchEvent(new CustomEvent('misintel-prefill', { 
          detail: { value, type: isUrl ? 'url' : 'text' } 
        }));
      }
    } catch (e) {
      console.error('Prefill failed:', e);
    }
  };

  return (
    <section id="trending-news" className="py-16 px-4 bg-black">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-6 text-center">
          Trending News
        </h2>
        <p className="text-neutral-400 text-sm md:text-base max-w-2xl mx-auto mb-8 text-center">
          Fresh headlines from Google News. Pick a topic and fact‑check in one click.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {QUICK_TOPICS.map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                topic === t
                  ? 'bg-gradient-to-b from-neutral-50 to-neutral-400 text-black border-transparent'
                  : 'bg-neutral-900/30 text-neutral-300 border-white/10 hover:border-white/20'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
          {loading && <div className="text-neutral-400 text-sm text-center">Loading...</div>}
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="text-neutral-400 text-sm text-center">No headlines found.</div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-white/10 bg-neutral-900/30 hover:bg-neutral-900/50 transition"
                >
                  <a href={it.link} target="_blank" rel="noopener noreferrer" className="block text-left mb-3">
                    <h3 className="text-neutral-100 text-sm font-semibold mb-2 line-clamp-2 hover:text-neutral-50 transition">
                      {it.title}
                    </h3>
                    <div className="text-neutral-400 text-xs flex items-center justify-between">
                      <span className="truncate">{it.source || 'Google News'}</span>
                      {it.publishedAt && (
                        <span className="ml-2 whitespace-nowrap">
                          {new Date(it.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </a>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => prefillAndGo(it.link, true)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs border border-white/10 transition"
                      title="Verify the URL"
                    >
                      Check URL
                    </button>
                    <button
                      onClick={() => prefillAndGo(it.title, false)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs border border-white/10 transition"
                      title="Verify the headline text"
                    >
                      Check Title
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}