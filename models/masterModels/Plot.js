const mongoose = require("mongoose");

const plotSchema = new mongoose.Schema({
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
    required: true,
  },
  plotNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  dimension: {
    type: String, // E.g., "30x40"
  },
  areaInSqFt: {
    type: Number,
  },
  cents: {
    type: Number, // 1 cent = 435.6 sq ft (approx.)
  },
  facing: {
    type: String,
    enum: ["East", "West", "North", "South", "NE", "NW", "SE", "SW"],
  },

  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Status",
  },

  soldDate: {
    type: Date,
  },
  soldToVisitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visitor",
  },

  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visitor",
  },
  bookedDate: {
    type: Date,
  },

  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visitor",
  },
  reservedDate: {
    type: Date,
  },

  holdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visitor",
  },
  holdDate: {
    type: Date,
  },

  gateway: {
    type: String,
  },
  road: {
    type: String,
  },
  landmark: {
    type: String,
  },
  remarks: {
    type: String,
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

module.exports = mongoose.model("Plot", plotSchema);
