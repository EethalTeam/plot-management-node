const mongoose = require('mongoose');

// Define the City Schema
const VisitorVerientSchema = new mongoose.Schema(
  {
    visitorVerientCode: {
      type: String,
      trim: true
    },
    visitorVerientName: {
      type: String,
      trim: true
    },
   
    isActive: {
      type: Boolean,
      default: true
    }
  }, { timestamps: true }
);

// Create the City Model
const VisitorVerient = mongoose.model('VisitorVerient', VisitorVerientSchema);

module.exports = VisitorVerient;
