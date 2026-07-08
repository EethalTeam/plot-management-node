// queues/scheduledWorker.js
const { Worker } = require("bullmq");
const { connection } = require("./scheduledQueue");
const CronJobControllers = require("../controllers/mainControllers/CronJobControllers");

function startScheduledWorker(io) {
  const worker = new Worker(
    "scheduled-tasks",
    async (job) => {
      switch (job.name) {
        case "daily-session-generation":
          return CronJobControllers.processDailySessionGeneration();

        case "scheduled-review-generation":
          return CronJobControllers.processScheduledReviewGeneration();

        case "return-journey-allowance":
          return CronJobControllers.processReturnJourneyAllowance();

        case "session-pending-check":
          return CronJobControllers.processSessionPendingCheck(io);

        case "monthly-billing":
          return CronJobControllers.processMonthlyBilling();

        case "monthly-payroll":
          return CronJobControllers.processMonthlyPayroll();

        default:
          throw new Error(`Unknown job: ${job.name}`);
      }
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`[BullMQ] Completed: ${job.name} (id=${job.id})`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[BullMQ] Failed: ${job?.name} (id=${job?.id})`,
      err?.message || err,
    );
  });

  return worker;
}

module.exports = startScheduledWorker;
