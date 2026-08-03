const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Non-employee attendees (e.g. the lead/client themselves) have no
  // Employee record, so this stays optional.
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  rsvpStatus: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
});

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    leadName: { type: String, trim: true },
    siteName: { type: String, trim: true },
    startAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },
    locationType: { type: String, enum: ["online", "in-person"], default: "online" },
    address: { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    reminderEnabled: { type: Boolean, default: true },
    reminderMinutesBefore: { type: Number, default: 30 },
    attendees: [attendeeSchema],
    status: { type: String, enum: ["scheduled", "cancelled"], default: "scheduled" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Meeting", meetingSchema);
