const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs'); 
const multer = require('multer')
const masterRoutes = require('./routes/masterRoutes');
const mainRoutes = require('./routes/mainRoutes');
const Notification = require('./models/masterModels/Notifications');
const CallLogController=require('./controllers/masterControllers/callLogControllers')
const LeadController = require('./controllers/masterControllers/LeadControllers')
const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = 8001;

app.post('/api/importLeadsExcel', upload.single('file'), LeadController.importLeads);
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
    origin: ["http://localhost:3000","https://enisivr.grss.in","http://localhost:5173"], 
    credentials: true
}));
require('dotenv').config();
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.removeHeader('X-Frame-Options'); 
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' http://localhost:5173 http://localhost:3000 https://enisivr.grss.in");
    
    next();
});
const leadDocsPath = path.resolve(__dirname, 'lead_documents');
app.use('/api/lead_documents', express.static(path.join(__dirname, 'lead_documents')));
app.get('/api/calls/fetch-all', CallLogController.fetchAllCallLogs);
app.post('/api/fetchCallLogs', CallLogController.handleTelecmiWebhook);
app.use('/api', masterRoutes);
app.use('/api', mainRoutes);


app.get('/test', (req, res) => {
  res.send("Testing mongo db url", process.env.MONGODB_URI);
});

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

io.on("connection", (socket) => {
  console.log("⚡ A client connected:", socket.id);

  socket.on("joinRoom", ({ unitId }) => {
    socket.join(unitId);
    console.log(`Socket ${socket.id} joined room: ${unitId}`);
  });

  socket.on("sendMessage", async ({ toUnitId, message }) => {
    io.to(toUnitId).emit("receiveMessage", message);
try { 
    await Notification.create({
      unitId: toUnitId,
      message,
    });
  } catch (err) {
    console.error("❌ Error saving notification:", err.message);
  }
});

  socket.on("disconnect", () => {
  });
})

// MongoDB Connection
async function main() {
  try {
    await mongoose.connect('mongodb+srv://eethaldev:eethaldevteam123@goldsun.pazhgof.mongodb.net/plot-management?retryWrites=true&w=majority&appName=PlotManagement', {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    });

    console.log("✅ MongoDB successfully connected");

    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📦 Collections in database: ${dbName}`, collections.map(col => col.name));

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
  }
}

main();

module.exports = app;
