const mongoose = require("mongoose");

const breakSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, default: null },
    reason: { type: String, trim: true, default: "Break" },
  },
  { timestamps: false },
);

// One document per employee per calendar day (IST) — see AttendanceControllers.js
// for how "today" is resolved and why date is a plain "YYYY-MM-DD" string
// rather than a Date (avoids timezone-boundary ambiguity when querying "today").
const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "on-leave", "weekend"],
      default: "present",
    },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    breaks: [breakSchema],
  },
  { timestamps: true },
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
