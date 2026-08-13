// CronJobControllers.js
// Backward-compatible controller layer for BullMQ scheduled jobs.
// If your project previously used node-cron and exposed init*Cron methods,
// keep them as no-ops (or delegate) so server.js can start cleanly.

async function processDailySessionGeneration() {
  // TODO: Implement actual job logic or delegate to existing controllers/services.
  // For now we return a resolved promise so BullMQ worker can complete the job.
  console.log("process Daily Session Generation executed");
  return { status: "ok", job: "daily-session-generation successful using BullMq" };
}

async function processScheduledReviewGeneration() {
  return { status: "ok", job: "scheduled-review-generation" };
}

async function processReturnJourneyAllowance() {
  return { status: "ok", job: "return-journey-allowance" };
}

async function processSessionPendingCheck(io) {
  // io is passed from worker for jobs that need socket emissions.
  return { status: "ok", job: "session-pending-check", hasIO: Boolean(io) };
}

async function processMonthlyBilling() {
  return { status: "ok", job: "monthly-billing" };
}

async function processMonthlyPayroll() {
  return { status: "ok", job: "monthly-payroll" };
}

// ----- Legacy init methods (node-cron replacement) -----
// BullMQ repeat jobs are registered in queues/scheduledJobs.js,
// so these init methods are intentionally no-ops.
function initSessionCron() {}
function initMonthlyBillingGeneration() {}
function initDailySessionGeneration() {}
function initScheduledReviewGeneration() {}
function initReturnJourneyAllowanceCron() {}
function initMonthlyPayrollCron() {}

module.exports = {
  // Legacy init methods
  initSessionCron,
  initMonthlyBillingGeneration,
  initDailySessionGeneration,
  initScheduledReviewGeneration,
  initReturnJourneyAllowanceCron,
  initMonthlyPayrollCron,

  // BullMQ process methods
  processDailySessionGeneration,
  processScheduledReviewGeneration,
  processReturnJourneyAllowance,
  processSessionPendingCheck,
  processMonthlyBilling,
  processMonthlyPayroll,
};
