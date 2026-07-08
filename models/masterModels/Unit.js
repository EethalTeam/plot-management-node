const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    // --- New Site Field ---
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site'
    },
    // ----------------------
    UnitName: {
      type: String,
  
      trim: true,
    },
    UnitCode: {
      type: String,
     
      unique: true,
      uppercase: true,
      trim: true,
    },
    unitType: {
      type: String,
      enum: ["Residential", "Commercial", "Mixed Use", "Layout"],
      default: "Residential",
    },
    UnitLocation: {
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