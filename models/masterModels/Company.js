 const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    companyCode: {
      type: String,
      trim: true,
    },

    companyName: {
      type: String,
      trim: true,
    },

    companyEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    companyPhone: {
      type: String,
      trim: true,
    },

    companyAlternatePhone: {
      type: String,
      trim: true,
    },

    companyAddress: {
      type: String,
      trim: true,
    },

    companyCity: {
      type: String,
      trim: true,
    },

    companyState: {
      type: String,
      trim: true,
    },

    companyCountry: {
      type: String,
      trim: true,
      default: "India",
    },

    companyPincode: {
      type: String,
      trim: true,
    },

    companyGstNumber: {
      type: String,
      trim: true,
    },

    companyWebsite: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

const companyModel = mongoose.model("Company", CompanySchema);
module.exports = companyModel
