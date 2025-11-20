import { Redis } from '@upstash/redis';

export const redis = Redis.fromEnv();

export const CACHE_CONFIG = {
  URL_CACHE_TTL: 60 * 60 * 24 * 1, 
  KEY_PREFIX: 'misintel:url:',
  ENABLED: true,
};


export function getCacheKey(url: string): string {
  try {
    const normalized = new URL(url);
    const cleanUrl = normalized.origin + normalized.pathname.replace(/\/$/, '') + normalized.search;
    return `${CACHE_CONFIG.KEY_PREFIX}${cleanUrl}`;
  } catch {
    return `${CACHE_CONFIG.KEY_PREFIX}${url}`;
  }
}

export async function getCachedAnalysis(url: string) {
  if (!CACHE_CONFIG.ENABLED) return null;
  
  try {
    const key = getCacheKey(url);
    const cached = await redis.get(key);
    
    if (cached) {
      console.log('Cache HIT for URL:', url);
      return cached;
    }
    
    console.log('Cache MISS for URL:', url);
    return null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
}

export async function cacheAnalysis(url: string, data: any, ttlSeconds?: number) {
  if (!CACHE_CONFIG.ENABLED) return;
  
  try {
    const key = getCacheKey(url);
    const ttl = ttlSeconds || CACHE_CONFIG.URL_CACHE_TTL;
    
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`Cached analysis for URL (TTL: ${ttl}s):`, url);
  } catch (error) {
    console.error('Redis SET error:', error);
  }
}

export async function invalidateCache(url: string) {
  try {
    const key = getCacheKey(url);
    await redis.del(key);
    console.log('Cache invalidated for URL:', url);
  } catch (error) {
    console.error('Redis DEL error:', error);
  }
}

export async function getCacheStats(url: string) {
  try {
    const key = getCacheKey(url);
    const ttl = await redis.ttl(key);
    const exists = await redis.exists(key);
    
    return {
      exists: exists === 1,
      ttl: ttl > 0 ? ttl : null,
      expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
    };
  } catch (error) {
    console.error('Redis TTL error:', error);
    return { exists: false, ttl: null, expiresAt: null };
  }
}