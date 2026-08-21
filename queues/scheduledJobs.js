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

  // Checks for leads with an upcoming SiteVisitDate and sends WhatsApp
  // confirmation/reminder templates — see WhatsAppReminderControllers.js.
  await scheduledQueue.add(
    "whatsapp-site-visit-reminders",
    {},
    {
      ...defaults,
      jobId: "whatsapp-site-visit-reminders",
      repeat: { every: 15 * 60 * 1000 },
    },
  );

  // Flips any payment installment whose due date has passed without full
  // payment to "overdue" — see PaymentControllers.markOverdueInstallments.
  await scheduledQueue.add(
    "payment-overdue-check",
    {},
    {
      ...defaults,
      jobId: "payment-overdue-check",
      repeat: { cron: "0 6 * * *", tz: "Asia/Kolkata" },
    },
  );

  // Sends any due WhatsApp nurture-sequence step — see
  // services/sequenceEngine.js's processDueSteps.
  await scheduledQueue.add(
    "whatsapp-sequence-steps",
    {},
    {
      ...defaults,
      jobId: "whatsapp-sequence-steps",
      repeat: { every: 15 * 60 * 1000 },
    },
  );

  // Notifies a lead's assigned rep once their FollowDate passes unactioned —
  // see LeadControllers.flagMissedFollowUps.
  await scheduledQueue.add(
    "follow-up-missed-check",
    {},
    {
      ...defaults,
      jobId: "follow-up-missed-check",
      repeat: { every: 30 * 60 * 1000 },
    },
  );

  console.log("[BullMQ] Scheduled jobs registered");
}

module.exports = registerScheduledJobs;
