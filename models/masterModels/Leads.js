const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  leadFirstName: {
    type: String,
    
    trim: true,
  },
  leadLastName: {
    type: String,
    
    trim: true,
  },
  leadEmail: {
    type: String,
    
    unique: true,
    lowercase: true,
    trim: true,
  },
  leadPhone: {
    type: String,
    trim: true,
  },
  leadJobTitle: {
    type: String,
    trim: true,
  },
  leadLinkedIn: {
    type: String,
    trim: true,
  },

  leadAddress: {
    address: { type: String, trim: true },
    cityId: {  type: mongoose.Schema.Types.ObjectId,ref:'City', trim: true },
    stateId: {  type: mongoose.Schema.Types.ObjectId,ref:'State', trim: true },
    countryId: {  type: mongoose.Schema.Types.ObjectId,ref:'Country', trim: true },
    zipCode: { type: String, trim: true },
  },

  leadStatusId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'LeadStatus',
    
  },
  leadSourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource', 
  },
  leadPotentialValue: {
    type: Number,
    default: 0,
  },
  leadScore: {
    type: Number,
    default: 0,
  },
  leadTags: [{
    type: String,
    trim: true,
  }],

  leadDocument: [{
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
  }],

  leadHistory: [{
    timestamp: { type: Date, default: Date.now },
    eventType: { type: String, required: true },
    details: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, {
  timestamps: true 
});

module.exports = mongoose.model('Lead', LeadSchema);