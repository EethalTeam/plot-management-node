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
    leadAltPhone: {
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
    leadAddress: { type: String, trim: true },
    leadCityId: {  type: mongoose.Schema.Types.ObjectId,ref:'City', trim: true },
    leadStateId: {  type: mongoose.Schema.Types.ObjectId,ref:'State', trim: true },
    leadCountryId: {  type: mongoose.Schema.Types.ObjectId,ref:'Country', trim: true },
    leadZipCode: { type: String, trim: true },

  leadStatusId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'LeadStatus'
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
    type: String
  },
  leadTags: [{
    type: String,
    trim: true,
  }],

  leadDocument: [{
     documentId:{
 type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'},
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
  }],
 leadAssignedId:{
 type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', 
 },
 leadSiteId:{
 type: mongoose.Schema.Types.ObjectId,
    ref: 'Site', 
 },
 leadNotes:{
type:String,
trim:true
 },
  leadHistory: [{
    timestamp: { type: Date, default: Date.now },
    eventType: { type: String },
    details: { type: String },
    employeeName: { type: String, ref: 'Employee'},
     leadStatusId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'LeadStatus'
  },
  }],
}, {
  timestamps: true 
});

const Leadmodel = mongoose.model('Lead', LeadSchema);
module.exports = Leadmodel