const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    leadFirstName: {
      type: String,

      trim: true,
    },
    leadLastName: {
      type: String,

      trim: true,
    },
    SiteVisitDate: {
      type: Date,
    },
    FollowDate: {
      type: Date,
    },
    // Set by LeadControllers.flagMissedFollowUps once it's notified the
    // assigned rep that this FollowDate passed unactioned — compared against
    // FollowDate itself (not just "is it set") so rescheduling the follow-up
    // naturally re-arms the sweep instead of needing this cleared elsewhere.
    // Same idempotency pattern as lead.siteVisitReminders below.
    followUpMissedNotifiedAt: {
      type: Date,
      default: null,
    },
    leadEmail: {
      type: String,
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

    // IndiaMART / other incoming messages (append in order)
    leadMessages: [
      {
        text: { type: String, required: true, trim: true },
        source: { type: String, default: "unknown", trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Backwards-compatible: keep old fields so existing UI/code won't break
    leadDescription: {
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
    leadCityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      trim: true,
    },
    leadStateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      trim: true,
    },
    leadCountryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      trim: true,
    },
    leadZipCode: { type: String, trim: true },

    leadStatusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },
    leadSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadSource",
    },
    leadUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },
    leadPotentialValue: {
      type: Number,
      default: 0,
    },
    leadScore: {
      type: String,
    },
    leadTags: [
      {
        type: String,
        trim: true,
      },
    ],

    leadDocument: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
        },
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadDate: { type: Date, default: Date.now },
      },
    ],
    leadAssignedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    leadCreatedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    leadSiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },
    leadNotes: {
      type: String,
      trim: true,
    },
    leadHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        eventType: { type: String },
        details: { type: String },
        employeeName: { type: String, ref: "Employee" },
        leadStatusId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "LeadStatus",
        },
      },
    ],
    leadExternalSource: {
      type: String,
      trim: true,
    },
    leadExternalQueryId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    whatsapp_waid: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    opt_in_status: {
      type: String,
      enum: ["unknown", "opted_in", "opted_out"],
      default: "unknown",
    },
    // Tracks which automated site-visit WhatsApp messages have already gone
    // out for the *current* SiteVisitDate, so the reminder job never sends
    // the same message twice. Cleared automatically whenever SiteVisitDate
    // changes (see WhatsAppReminderControllers.js).
    siteVisitReminders: {
      forDate: { type: Date },
      confirmationSentAt: { type: Date },
      dayBeforeSentAt: { type: Date },
      hoursBeforeSentAt: { type: Date },
    },

    // Populated by scripts/generate_lead_briefings.py — a real Gemini call
    // (free tier) that reads the lead's actual history/WhatsApp activity and
    // writes one short, actionable note for the rep. Regenerated whenever
    // real activity happens after the last briefing (see the script).
    priorityBriefing: { type: String, trim: true, default: null },
    priorityBriefingGeneratedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

const Leadmodel = mongoose.model("Lead", LeadSchema);
module.exports = Leadmodel;
