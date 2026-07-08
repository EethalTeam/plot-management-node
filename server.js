const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const registerScheduledJobs = require("./queues/scheduledJobs");
const startScheduledWorker = require("./queues/scheduledWorker");
const { scheduledQueue } = require("./queues/scheduledQueue");
const CronJobControllers = require("./controllers/mainControllers/CronJobControllers");
require("dotenv").config();
const masterRoutes = require("./routes/masterRoutes");
const mainRoutes = require("./routes/mainRoutes");
const Notification = require("./models/masterModels/Notification");
const CallLogController = require("./controllers/masterControllers/callLogControllers");
const LeadController = require("./controllers/masterControllers/LeadControllers");
const IvrController = require("./controllers/masterControllers/ivrController");
const upload = multer({ dest: "uploads/" });
const googleapis = require("googleapis");
const app = express();
const PORT = 8004;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://enisivr.grss.in",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);

app.post(
  "/api/importLeadsExcel",
  upload.single("file"),
  LeadController.importLeads,
);

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.removeHeader("X-Frame-Options");
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' http://localhost:5173 http://localhost:3000 https://enisivr.grss.in",
  );

  next();
});
const leadDocsPath = path.resolve(__dirname, "lead_documents");
app.use(
  "/api/lead_documents",
  express.static(path.join(__dirname, "lead_documents")),
);
app.get("/api/calls/fetch-all", CallLogController.fetchAllCallLogs);
// app.post('/api/fetchCallLogs', CallLogController.handleTelecmiWebhook);
app.post("/api/fetchCallLogs", IvrController.saveIvrWebhook); // Updated to use the new IVR controller
app.use("/api", masterRoutes);
app.use("/api", mainRoutes);

app.post("/api/test-bullmq-job", async (req, res) => {
  const { jobName = "daily-session-generation" } = req.body || {};
  const validJobs = [
    "daily-session-generation",
    "scheduled-review-generation",
    "return-journey-allowance",
    "session-pending-check",
    "monthly-billing",
    "monthly-payroll",
  ];

  if (!validJobs.includes(jobName)) {
    return res.status(400).json({
      error: "Invalid jobName. Use one of: " + validJobs.join(", "),
    });
  }

  try {
    await scheduledQueue.add(
      jobName,
      {},
      {
        removeOnComplete: 1,
        removeOnFail: 1,
        attempts: 1,
      },
    );

    console.log(`[BullMQ] Job enqueued via HTTP: ${jobName}`);
    res.json({ status: "job enqueued", job: jobName });
  } catch (err) {
    console.error("Error queueing test job:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/test", (req, res) => {
  res.send("Testing mongo db url", process.env.MONGODB_URI);
});

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// io.on("connection", (socket) => {
//   console.log("⚡ A client connected:", socket.id);

//   socket.on("joinRoom", ({ unitId }) => {
//     socket.join(unitId);
//     console.log(`Socket ${socket.id} joined room: ${unitId}`);
//   });

//   socket.on("sendMessage", async ({ toUnitId, message }) => {
//     io.to(toUnitId).emit("receiveMessage", message);
// try {
//     await Notification.create({
//       unitId: toUnitId,
//       message,
//     });
//   } catch (err) {
//     console.error("❌ Error saving notification:", err.message);
//   }
// });

//   socket.on("disconnect", () => {
//   });
// })

// CronJobControllers.init*Cron calls are kept as no-ops since BullMQ handles scheduling.
// (This prevents crashes if older server.js wiring still references these methods.)
CronJobControllers.initSessionCron(io);
CronJobControllers.initMonthlyBillingGeneration(io);
CronJobControllers.initDailySessionGeneration(io);
CronJobControllers.initScheduledReviewGeneration(io);
CronJobControllers.initReturnJourneyAllowanceCron(io);
CronJobControllers.initMonthlyPayrollCron();

// later near your route definitions
app.post("/api/return-journey-allowance", async (req, res) => {
  try {
    const job = await scheduledQueue.add(
      "daily-session-generation",
      {},
      {
        removeOnComplete: 1,
        removeOnFail: 1,
        attempts: 1,
      },
    );

    console.log(`[BullMQ] Job enqueued via HTTP: ${job.name} (id=${job.id})`);
    res.json({
      status: "queued",
      jobId: job.id,
      name: job.name,
      data: job.data,
    });
  } catch (err) {
    console.error("Error queueing return journey allowance job:", err);
    res.status(500).json({ error: err.message });
  }
});

const employeeSockets = new Map(); // employeeId -> Set of socketIds

io.on("connection", (socket) => {
  console.log("⚡ A client connected:", socket.id);

  // ================== Join Room for Personal Notifications ==================
  socket.on("joinRoom", ({ employeeId }) => {
    socket.employeeId = employeeId;
    socket.join(employeeId);

    if (!employeeSockets.has(employeeId)) {
      employeeSockets.set(employeeId, new Set());
    }
    employeeSockets.get(employeeId).add(socket.id);

    console.log(`Socket ${socket.id} joined personal room: ${employeeId}`);
  });

  // ================== Send Message (Notification) ==================

  socket.on(
    "sendMessage",
    async ({
      type,
      message,
      toEmployeeId = null,
      groupId = null,
      meta = {},
    }) => {
      try {
        const notification = await createNotification({
          type,
          message,
          fromEmployeeId: socket.employeeId,
          toEmployeeId,
          groupId,
          meta,
        });

        console.log("✅ Notification created:", notification._id);
      } catch (err) {
        console.error("❌ Error sending notification:", err.message);
      }
    },
  );

  // ================== Disconnect ==================
  socket.on("disconnect", () => {
    const { employeeId } = socket;
    if (employeeId && employeeSockets.has(employeeId)) {
      const sockets = employeeSockets.get(employeeId);
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        employeeSockets.delete(employeeId);
      }
    }
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// ---------------- HELPER: CREATE NOTIFICATION ----------------
const createNotification = async ({
  type,
  message,
  fromEmployeeId,
  toEmployeeId = null,
  groupId = null,
  meta = {},
}) => {
  try {
    const notificationData = {
      type,
      message,
      fromEmployeeId,
      toEmployeeId,
      groupId,
      meta,
    };

    // Specific logic for notification status
    if (["leave-request", "permission-request"].includes(type)) {
      notificationData.status = "unseen";
    } else {
      notificationData.status = "seen";
    }

    const notification = await Notification.create(notificationData);

    // Emit via socket if online
    if (toEmployeeId) {
      io.to(toEmployeeId.toString()).emit("receiveNotification", notification);
    }
    // Group chat emission remains commented out/skipped as requested

    return notification;
  } catch (err) {
    console.error("❌ Error creating notification:", err.message);
    throw err;
  }
};

// MongoDB Connection
async function main() {
  try {
    await mongoose.connect(
      "mongodb+srv://restore_admin:enisdevteam123@enistechteam.owwtldg.mongodb.net/plot-management?retryWrites=true&w=majority&appName=PlotManagement",
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
      },
    );
    await registerScheduledJobs();
    console.log("✅ MongoDB successfully connected");
    // Start BullMQ worker once at server boot (NOT per socket connection)
    startScheduledWorker(io);

    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      `📦 Collections in database: ${dbName}`,
      collections.map((col) => col.name),
    );

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
  }
}

main();

console.log("[BullMQ] HTTP enqueue endpoint loaded");
module.exports = app;
