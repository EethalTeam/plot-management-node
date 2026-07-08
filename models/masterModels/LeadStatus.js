const mongoose = require("mongoose");

const LeadStatusSchema = new mongoose.Schema(
  {
    leadStatusCode: {
      type: String,
      trim: true
      
    },

    leadStatustName: {
      type: String,
      trim: true
    
    },

    leadStatusColor :{
     type : String
    },
    leadStatusTextColor : {
    type : String
    },

    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

const leadStatusModel =  mongoose.model("LeadStatus", LeadStatusSchema);
module.exports =leadStatusModel
