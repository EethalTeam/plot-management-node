const mongoose = require('mongoose');

const TelecmiLogSchema = new mongoose.Schema({
  cmiuuid: {
    type: String,
    required: true,
    unique: true, 
    index: true
  },
  appid: {
    type: Number
  },
  type: {
    type: String 
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: 'inbound'
  },
  status: {
    type: String, 
    required: true
  },
  // 'to' exists in both. 
  // In Inbound: Agent/Destination number. 
  // In Outbound: Customer number.
  to: {
    type: Number
  },
  time: {
    type: Number, 
    required: true
  },
  // Helper field for Date querying (populated by controller)
  callDate: {
    type: Date,
    index: true
  },
  custom: {
    type: String,
    default: ""
  },
  // Duration fields
  answeredsec: {
    type: Number,
    default: 0
  },
  // Recordings
  record: {
    type: Boolean,
    default: false
  },
  filename: {
    type: String,
    default: null
  },
  user: {
    type: String
  },

  // --- INBOUND SPECIFIC FIELDS ---
  conversation_uuid: {
    type: String
  },
  virtualnumber: {
    type: Number // Specific to Inbound
  },
  from: {
    type: Number // Customer number (Only in Inbound)
  },
  from_format: {
    type: String
  },
  team: {
    type: String
  },
  waitedsec: {
    type: Number,
    default: 0
  },

  // --- OUTBOUND SPECIFIC FIELDS ---
  callerid: {
    type: String // The virtual number used for outbound (String in JSON)
  },
  user_no: {
    type: String // The Agent's actual phone number
  },
  click_to_call: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('TelecmiLog', TelecmiLogSchema);