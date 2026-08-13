const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: [{ type: String, required: true, trim: true }],
    cc: [{ type: String, trim: true }],
    subject: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },
    errorMessage: { type: String, trim: true },
    // Whichever of these the email was sent from is set; the others stay
    // undefined — same "one of several optional context refs" pattern as
    // PlotControllers' visitor-assignment fields.
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor" },
    sentById: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EmailLog", emailLogSchema);
