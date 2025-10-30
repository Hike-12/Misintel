import { NextRequest } from 'next/server';

function extract(tag: string, block: string) {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 'is').exec(block)?.[1];
  if (cdata) return cdata.trim();
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'is').exec(block)?.[1];
  return plain ? plain.replace(/<[^>]+>/g, '').trim() : '';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const hl = searchParams.get('hl') || 'en-IN'; // language/region
  const gl = searchParams.get('gl') || 'IN';
  const ceid = `${gl}:en`;

  const url = q
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`
    : `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${ceid}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return new Response(JSON.stringify({ items: [], error: `Upstream ${res.status}` }), {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
    const xml = await res.text();
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
      .slice(0, 10)
      .map(m => {
        const block = m[1];
        const title = extract('title', block);
        const link = extract('link', block);
        const pubDate = extract('pubDate', block);
        const source = extract('source', block);
        return { title, link, publishedAt: pubDate, source };
      })
      .filter(x => x.title && x.link);

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ items: [], error: e?.message || 'fetch_failed' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}