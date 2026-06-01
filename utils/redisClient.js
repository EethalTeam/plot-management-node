const { createClient } = require("redis");

let client = null;
let clientPromise = null;

const env = {
  host: process.env.REDIS_HOST ,
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: (process.env.REDIS_TLS || "").toLowerCase() === "true",
  connectTimeout: process.env.REDIS_CONNECT_TIMEOUT
    ? Number(process.env.REDIS_CONNECT_TIMEOUT)
    : 1000,
  // Optional key namespace prefix (e.g. "dev1"); lets you isolate keys per env/app
  namespace: process.env.REDIS_NAMESPACE || "",
};

const normalizeKey = (key) => {
  if (!env.namespace) return key;
  // Prevent double prefixing
  if (typeof key === "string" && key.startsWith(`${env.namespace}:`)) {
    return key;
  }
  return `${env.namespace}:${key}`;
};

const getClient = async () => {
  if (clientPromise) {
    return clientPromise;
  }

  client = createClient({
    username: env.username,
    password: env.password,
    socket: {
      host: env.host,
      port: env.port,
      tls: env.tls,
      connectTimeout: env.connectTimeout,
      reconnectStrategy: false,
    },
  });

  client.on("error", (error) => {
    console.error("Redis cache error:", error.message);
  });

  clientPromise = client
    .connect()
    .then(() => client)
    .catch((error) => {
      console.error("Redis cache connection failed:", error.message);
      client = null;
      clientPromise = null;
      return null;
    });

  return clientPromise;
};

module.exports = {
  normalizeKey,
  get: async (key) => {
    const redisClient = await getClient();
    if (!redisClient) return null;

    return redisClient.get(normalizeKey(key));
  },

  set: async (key, value, options) => {
    const redisClient = await getClient();
    if (!redisClient) return null;

    return redisClient.set(normalizeKey(key), value, options);
  },

  del: async (...keys) => {
    const redisClient = await getClient();
    if (!redisClient || keys.length === 0) return null;

    return redisClient.del(keys.map(normalizeKey));
  },

  delPattern: async (pattern) => {
    const redisClient = await getClient();
    if (!redisClient) return null;

    const namespacedPattern = normalizeKey(pattern);

    const keys = [];
    for await (const key of redisClient.scanIterator({
      MATCH: namespacedPattern,
      COUNT: 100,
    })) {
      keys.push(key);
    }

    if (keys.length === 0) return 0;

    return redisClient.del(keys);
  },
};
