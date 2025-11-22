const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // --- 1. LEAD INFORMATION ---
  contactInfo: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { 
      type: String, 
      unique: true,
      lowercase: true,
      index: true 
    },
    phone: { type: String, required: true },
    jobTitle: String,
    linkedinProfile: String,
  },

  // --- 2. BUSINESS DETAILS (B2B Context) ---
  companyDetails: {
    name: { type: String},
    website: String,
    industry: String,
    size: { 
      type: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },

  // --- 3. PIPELINE & STATUS ---
  leadStatus: {
    type: String,
    enum: ['New', 'Attempted to Contact', 'Connected', 'Warm Lead', 'Opportunity', 'Customer', 'Disqualified'],
    default: 'New',
    index: true
  },
  leadScore: {
    type: Number,
    default: 0, // e.g., +10 for email open, +50 for demo request
    min: 0
  },
  leadSource: {
    type: String,
    enum: ['Organic Search', 'Paid Ads', 'Referral', 'Social Media', 'Event', 'Outbound','Call Logs'],
    default: 'Organic Search'
  },
  potentialValue: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },

  // --- 4. ASSIGNMENT & OWNERSHIP ---
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Link to your Employee/Admin model
    index: true
  },

  // --- 5. TRACKING & META ---
  tags: [String], // e.g., "Urgent", "Black Friday Promo", "VIP"
  lastActivity: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false }, // Soft delete

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Text Index for Global Search (Search by Name, Email, or Company)
leadSchema.index({ 
  'contactInfo.firstName': 'text', 
  'contactInfo.lastName': 'text', 
  'contactInfo.email': 'text',
  'companyDetails.name': 'text' 
});

module.exports = mongoose.model('Lead', leadSchema);