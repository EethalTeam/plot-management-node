// queues/scheduledJobs.js
const { scheduledQueue } = require("./scheduledQueue");

async function registerScheduledJobs() {
  const defaults = {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  };

  await scheduledQueue.add(
    "daily-session-generation",
    {},
    {
      ...defaults,
      jobId: "daily-session-generation",
      repeat: { cron: "0 5 * * 1-6", tz: "Asia/Kolkata" },
    },
  );

  await scheduledQueue.add(
    "scheduled-review-generation",
    {},
    {
      ...defaults,
      jobId: "scheduled-review-generation",
      repeat: { cron: "30 5 * * 1-6", tz: "Asia/Kolkata" },
    },
  );

  await scheduledQueue.add(
    "return-journey-allowance",
    {},
    {
      ...defaults,
      jobId: "return-journey-allowance",
      repeat: { cron: "30 19 * * *", tz: "Asia/Kolkata" },
    },
  );

  await scheduledQueue.add(
    "session-pending-check",
    {},
    {
      ...defaults,
      jobId: "session-pending-check",
      repeat: { cron: "0 20 * * 1-6", tz: "Asia/Kolkata" },
    },
  );

  await scheduledQueue.add(
    "monthly-billing",
    {},
    {
      ...defaults,
      jobId: "monthly-billing",
      repeat: { cron: "0 18 28-31 * *", tz: "Asia/Kolkata" },
    },
  );

  await scheduledQueue.add(
    "monthly-payroll",
    {},
    {
      ...defaults,
      jobId: "monthly-payroll",
      repeat: { cron: "30 9 28-31 * *", tz: "Asia/Kolkata" },
    },
  );

  console.log("[BullMQ] Scheduled jobs registered");
}

module.exports = registerScheduledJobs;
