const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    documentCode: {
      type: String,
      trim: true
      // examples: Aadhaar, PAN, Photo, Agreement
    },

    documentName: {
      type: String,
      trim: true
      // examples: Aadhaar Front, PAN Card, Profile Photo
    },

    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

const DocumentModel =  mongoose.model("Document", DocumentSchema);
module.exports =DocumentModel
