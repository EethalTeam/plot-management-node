const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema({
  statusName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
  },
  colorCode: {
    type: String, // Optional: Hex color for UI e.g. "#FF0000"
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Status", statusSchema);
