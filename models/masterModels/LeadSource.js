const mongoose = require("mongoose");

const LeadSourceSchema = new mongoose.Schema(
  {
    leadSourceCode: {
      type: String,
      trim: true
      
    },

    leadSourceName: {
      type: String,
      trim: true
    
    },

    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

const leadSourceModel =  mongoose.model("LeadSource", LeadSourceSchema);
module.exports =leadSourceModel
