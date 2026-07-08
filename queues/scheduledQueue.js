// queues/scheduledQueue.js
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

const scheduledQueue = new Queue("scheduled-tasks", { connection });

module.exports = {
  scheduledQueue,
  connection,
};
