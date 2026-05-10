const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

let redis;
let isRedisAvailable = false;
let hasLoggedError = false;

try {
    redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true, // Don't connect immediately
        maxRetriesPerRequest: 1, // Fail fast
        retryStrategy: (times) => {
            if (times > 3) {
                if (!hasLoggedError) {
                    console.warn('[REDIS] Connection failed after 3 attempts. Disabling Redis caching.');
                    hasLoggedError = true;
                }
                return null; // Stop retrying
            }
            return Math.min(times * 100, 1000);
        }
    });

    redis.on('connect', () => {
        isRedisAvailable = true;
        console.log('[REDIS] Connected to Redis server.');
    });

    redis.on('error', (err) => {
        if (!isRedisAvailable) {
            if (!hasLoggedError) {
                console.warn('[REDIS] Redis not available. Caching disabled. Details:', err.message);
                hasLoggedError = true;
                // Provide a dummy interface to avoid crashes
                redis.get = async () => null;
                redis.setex = async () => null;
                redis.del = async () => null;
                redis.keys = async () => [];
            }
        } else {
            console.error('[REDIS] Redis error:', err.message);
        }
    });

    // Attempt initial connection
    redis.connect().catch(err => {
        if (!hasLoggedError) {
            console.warn('[REDIS] Initial connection failed. Application will run without Redis.');
            hasLoggedError = true;
        }
    });

} catch (e) {
    console.warn('[REDIS] Failed to initialize Redis client. Using dummy cache.');
    redis = {
        get: async () => null,
        setex: async () => null,
        del: async () => null,
        keys: async () => [],
        on: () => {}
    };
}

module.exports = redis;
