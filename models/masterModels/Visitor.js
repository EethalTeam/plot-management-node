const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  followUpDate: { type: Date, required: true }, // Timestamp for follow-up
  followUpStatus: {
    type: String,
    enum: ["Pending", "Completed"],
    default: "Pending"
  },
  followedUpBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  description: { type: String }, 
  notes: { type: String },       
  remarks: { type: String }      
}, { _id: false });

const visitorPlotSchema = new mongoose.Schema({
  plotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plot",
    required: true
  },
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Status",
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  followUps: [followUpSchema]
}, { _id: false });

const visitorSchema = new mongoose.Schema({
  visitorCode: { type: String, unique: true, required: true },
  visitorName: { type: String, required: true },
  visitorEmail: { type: String },
  visitorMobile: { type: String, required: true },
  visitorWhatsApp: { type: String },
  visitorPhone: { type: String },
  visitorAddress: { type: String },
  isActive: { type: Boolean, default: true },
  feedback: { type: String },
  description: { type: String },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  plots: [visitorPlotSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model("Visitor", visitorSchema);
