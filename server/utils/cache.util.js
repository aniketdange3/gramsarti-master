/**
 * CACHE UTILITY - मेमरी कॅशे व्यवस्थापन (Redis Cache Management)
 * 
 * या फाईलमध्ये डेटा Redis मध्ये जतन करण्यासाठी फंक्शन्स आहेत.
 * यामुळे डेटाबेसवरील ताण कमी होतो आणि रिपोर्ट जलद लोड होतात.
 */

const redis = require('../config/redis.config');

const CACHE_TTL_DEFAULT = 120; // 2 minutes (reduced from 5min to save Redis memory)
const CACHE_TTL_LONG = 3600;   // 1 hour (reduced from 24h)

/**
 * Check if error is OOM (out of memory) — treat as cache miss, not crash
 */
const isOOMError = (err) => err && err.message && err.message.includes('OOM');

// Generic Cache Methods
const getCache = async (key) => {
    try {
        if (redis && typeof redis.get === 'function') {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        }
    } catch (e) {
        if (!isOOMError(e)) {
            console.warn(`[REDIS] Cache fetch failed for ${key}:`, e.message);
        }
    }
    return null;
};

const setCache = async (key, data, ttl = CACHE_TTL_DEFAULT) => {
    try {
        if (redis && typeof redis.setex === 'function') {
            await redis.setex(key, ttl, JSON.stringify(data));
        }
    } catch (e) {
        if (isOOMError(e)) {
            // Redis memory full — silently skip caching (app works without cache)
            // No log spam — OOM is expected on small managed Redis plans
        } else {
            console.warn(`[REDIS] Cache set failed for ${key}:`, e.message);
        }
    }
};

const clearCache = async (pattern) => {
    try {
        if (redis && typeof redis.keys === 'function') {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(keys);
                console.log(`[REDIS] Cleared ${keys.length} cache keys for pattern: ${pattern}`);
            }
        }
    } catch (e) {
        if (!isOOMError(e)) {
            console.warn(`[REDIS] Cache clear failed for pattern ${pattern}:`, e.message);
        }
    }
};

// Existing specialized methods for backwards compatibility
const PROPERTIES_CACHE_KEY = 'properties:all';
const PROPERTIES_ETAG_KEY = 'properties:etag';

/**
 * Get cached properties data
 */
const getPropertiesCache = async () => {
    return await getCache(PROPERTIES_CACHE_KEY);
};

/**
 * Get current ETag for caching
 */
const getPropertiesEtag = async () => {
    try {
        if (redis && typeof redis.get === 'function') {
            return await redis.get(PROPERTIES_ETAG_KEY);
        }
    } catch(e) {}
    return null;
};

/**
 * Set and update properties cache
 */
const setPropertiesCache = async (data) => {
    const etag = `W/"${Date.now()}-${data.length}"`;
    await setCache(PROPERTIES_CACHE_KEY, data, CACHE_TTL_DEFAULT);
    try {
        if (redis && typeof redis.setex === 'function') {
            await redis.setex(PROPERTIES_ETAG_KEY, CACHE_TTL_DEFAULT, etag);
        }
    } catch(e) {}
    return etag;
};

/**
 * Clear and invalidate the cache (properties + search)
 */
const clearPropertiesCache = async () => {
    await clearCache('properties:*');
    await clearCache('prop:search:*'); // ← search cache पण साफ (bug fix)
    console.log('[CACHE] Properties cache invalidated (Global Cleanup).');
};

module.exports = {
    getCache,
    setCache,
    clearCache,
    CACHE_TTL_DEFAULT,
    CACHE_TTL_LONG,
    getPropertiesCache,
    getPropertiesEtag,
    setPropertiesCache,
    clearPropertiesCache
};
