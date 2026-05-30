const { createClient } = require("redis");

let client = null;
let clientPromise = null;

const getClient = async () => {
  if (clientPromise) {
    return clientPromise;
  }

  client = createClient({
    socket: {
      host: "127.0.0.1",
      port: 6379,
      connectTimeout: 1000,
      reconnectStrategy: false,
    },
  });

  client.on("error", (error) => {
    console.error("Memurai cache error:", error.message);
  });

  clientPromise = client
    .connect()
    .then(() => client)
    .catch((error) => {
      console.error("Memurai cache connection failed:", error.message);
      client = null;
      clientPromise = null;
      return null;
    });

  return clientPromise;
};

module.exports = {
  get: async (key) => {
    const redisClient = await getClient();
    if (!redisClient) {
      return null;
    }

    return redisClient.get(key);
  },

  set: async (key, value, options) => {
    const redisClient = await getClient();
    if (!redisClient) {
      return null;
    }

    return redisClient.set(key, value, options);
  },

  del: async (...keys) => {
    const redisClient = await getClient();
    if (!redisClient || keys.length === 0) {
      return null;
    }

    return redisClient.del(keys);
  },

  delPattern: async (pattern) => {
    const redisClient = await getClient();
    if (!redisClient) {
      return null;
    }

    const keys = [];
    for await (const key of redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(key);
    }

    if (keys.length === 0) {
      return 0;
    }

    return redisClient.del(keys);
  },
};
