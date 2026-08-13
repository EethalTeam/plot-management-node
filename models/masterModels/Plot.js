const mongoose = require("mongoose");

const plotSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Site",
    required: true, 
  },
  // ----------------------
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit"
  },
  plotCode: {
    type: String,
    unique: true,
    trim: true,
  },
  plotNumber: {
    type: String,
    required: true,
    trim: true,
  },
  dimension: {
    type: String, // E.g., "30x40"
  },
  areaInSqFt: {
    type: Number,
  },
  cents: {
    type: Number,
  },
   SquareFeet: {
    type: Number,
  },
  facing: {
    type: String,
    enum: ["East", "West", "North", "South", "NE", "NW", "SE", "SW"],
  },

  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Status",
    default: new mongoose.Types.ObjectId('6889bcf6080f330c24ba0521')
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

  visitDetails: [
    {
      visitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Visitor",
        required: true,
        unique:true
      },
      visitedDate: {
        type: Date,
        default: Date.now
      }
    }
  ],

  interestDetails: [
    {
      interestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Visitor",
        required: true
      },
      interestDate: {
        type: Date,
        default: Date.now
      }
    }
  ],
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