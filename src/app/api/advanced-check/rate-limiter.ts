// Rate limiting utilities

import { NextRequest } from 'next/server';
import { RateLimitResult } from './types';

type RLMap = Map<string, number[]>;

// Adjustable limits
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 6; // max requests per window

// Use globalThis to persist across module reloads in dev
const rlStoreKey = '__misintel_rate_limiter_v1__';
if (!(globalThis as any)[rlStoreKey]) {
  (globalThis as any)[rlStoreKey] = new Map() as RLMap;
}
const rateLimitMap = (globalThis as any)[rlStoreKey] as RLMap;

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('fastly-client-ip') ||
    'unknown'
  );
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = rateLimitMap.get(ip) || [];
  const recent = hits.filter(ts => ts > windowStart);
  
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter: retryAfterSec };
  }
  
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return { limited: false, retryAfter: 0 };
}
