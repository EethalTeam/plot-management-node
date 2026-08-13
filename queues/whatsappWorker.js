// queues/whatsappWorker.js
const { Worker } = require("bullmq");
const { connection } = require("./whatsappQueue");
const whatsappParser = require("../services/whatsappParser");

function startWhatsAppWorker() {
  const worker = new Worker(
    "whatsapp-messages",
    async (job) => {
      switch (job.name) {
        case "process-whatsapp-event":
          return whatsappParser.processWebhookEvent(job.data);

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

module.exports = startWhatsAppWorker;
