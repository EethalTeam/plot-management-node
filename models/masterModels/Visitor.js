const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  followUpDate: { type: Date}, // Timestamp for follow-up
  followUpStatus: {
    type: String,
    enum: ["Pending", "Completed"],
    default: "Pending"
  },
  followedUpById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },
  followUpDescription: { type: String }, 
  notes: { type: String },       
  remarks: { type: String }      
});

const visitorPlotSchema = new mongoose.Schema({
  plotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plot"
  },
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Status"
  },
  timestamp: { type: Date, default: Date.now } 
}, { _id: false });

const visitorSchema = new mongoose.Schema({
  visitorCode: { type: String, unique: true, required: true },
  visitorName: { type: String, required: true },
  visitorEmail: { type: String },
  visitorMobile: { type: String, required: true },
  visitorWhatsApp: { type: String },
  visitorPhone: { type: String },
  cityId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "City"
  },
  visitorAddress: { type: String },
  isActive: { type: Boolean, default: true },
  feedback: { type: String },
  description: { type: String },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },
  plots: [visitorPlotSchema],
  followUps: [followUpSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model("Visitor", visitorSchema);
