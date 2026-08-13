const mongoose = require("mongoose");

// One doc per lead's run through a SequenceDefinition — the state the
// scheduled job (services/sequenceEngine.js's processDueSteps) advances.
const sequenceEnrollmentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    sequenceId: { type: mongoose.Schema.Types.ObjectId, ref: "SequenceDefinition", required: true },
    waid: { type: String, trim: true, required: true },
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
