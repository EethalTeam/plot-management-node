// models/MenuRegistry.js
const mongoose = require('mongoose');

const menuRegistrySchema = new mongoose.Schema({
  formId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  parentFormId: {
    type: String,
    default: null
  },
  actions: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('MenuRegistry', menuRegistrySchema);
