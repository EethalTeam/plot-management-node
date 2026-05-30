const redisClient = require("../utils/redisClient");
const crypto = require("crypto");

const normalizePayload = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizePayload);
  }

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = normalizePayload(value[key]);
      return result;
    }, {});
};

const stableStringify = (value) => {
  return JSON.stringify(normalizePayload(value));
};

const hashPayload = (payload) => {
  return crypto.createHash("sha1").update(payload).digest("hex");
};

const cacheMiddleware = (ttlInSeconds = 36000, cacheKeyOverride = null) => {
  return async (req, res, next) => {
    const cacheKey =
      typeof cacheKeyOverride === "function"
        ? cacheKeyOverride(req)
        : cacheKeyOverride || `app:cache:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`CACHE HIT for key: ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      console.log(`CACHE MISS for key: ${cacheKey}. Proceeding to DB.`);
    } catch (redisError) {
      console.error(`Memurai cache read failed for ${cacheKey}:`, redisError.message);
    }

    const originalJson = res.json;

    res.json = function (body) {
      res.json = originalJson;

      if (res.statusCode === 200) {
        redisClient
          .set(cacheKey, JSON.stringify(body), { EX: ttlInSeconds })
          .catch((error) => {
            console.error(`Memurai cache write failed for ${cacheKey}:`, error.message);
          });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

cacheMiddleware.invalidate = (keys = []) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (body) {
      res.json = originalJson;

      if (res.statusCode >= 200 && res.statusCode < 300 && keys.length > 0) {
        const exactKeys = keys.filter((key) => !key.includes("*"));
        const patternKeys = keys.filter((key) => key.includes("*"));

        const deleteExactKeys = exactKeys.length > 0 ? redisClient.del(...exactKeys) : Promise.resolve();
        const deletePatternKeys = Promise.all(patternKeys.map((key) => redisClient.delPattern(key)));

        Promise.all([deleteExactKeys, deletePatternKeys]).catch((error) => {
          console.error("Memurai cache invalidation failed:", error.message);
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

cacheMiddleware.withBody = (baseKey) => {
  return (req) => {
    const bodyHash = hashPayload(stableStringify(req.body || {}));
    return `${baseKey}:${bodyHash}`;
  };
};

module.exports = cacheMiddleware;
