const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    unitName: {
      type: String,
      required: true,
      trim: true,
    },
    unitCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    unitType: {
      type: String,
      enum: ["Residential", "Commercial", "Mixed Use", "Layout"],
      default: "Residential",
    },
    unitLocation: {
      type: String,
      trim: true,
    },
    addressLine: {
      type: String,
      trim: true,
    },
    geoLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Unit", unitSchema);
