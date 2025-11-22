const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  sitename: {
    type: String,
  },
  location: {
    type: String,
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City', // References the City collection
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State', // References the State collection
  },
  totalArea: {
    type: String, // set to String to allow units (e.g., "1200 sqft")
  },
  zipcode: {
    type: String,
  },
  address: {
    type: String,
  },
  siteType: {
    type: String,
  },
  subType: {
    type: String,
  },
  description: {
    type: String,
  },
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('Site', siteSchema);