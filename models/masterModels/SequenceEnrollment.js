const mongoose = require("mongoose");

// One doc per lead's run through a SequenceDefinition — the state the
// scheduled job (services/sequenceEngine.js's processDueSteps) advances.
const sequenceEnrollmentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    sequenceId: { type: mongoose.Schema.Types.ObjectId, ref: "SequenceDefinition", required: true },
    // Neither is required alone — a sequence can be email-only or
    // WhatsApp-only — but sequenceEngine.tryEnrollNewLead only creates an
    // enrollment when the lead has at least one of the two.
    waid: { type: String, trim: true, default: null },
    email: { type: String, trim: true, default: null },
    nextStepIndex: { type: Number, default: 0 },
    // null once completed — nothing left to schedule.
    nextSendAt: { type: Date, default: null },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  },
  { timestamps: true },
);

sequenceEnrollmentSchema.index({ status: 1, nextSendAt: 1 });
sequenceEnrollmentSchema.index({ sequenceId: 1, status: 1 });

module.exports = mongoose.model("SequenceEnrollment", sequenceEnrollmentSchema);
