// const mongoose = require('mongoose');

// const notificationSchema = new mongoose.Schema(
//   {
//     unitId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Unit", // optional - if you have a Unit collection
//       required: true,
//     },
//     message: {
//       type: String,
//       required: true,
//     },
//     read: {
//       type: Boolean,
//       default: false,
//     },
//     createdAt: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Notification", notificationSchema);










// models/masterModels/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    fromEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    toEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      // For group messages, this can be null
    },
    // groupId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Group",
    //   default: null,
    // },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // type: {
    //   type: String,
    //   enum: [
    //     "Consultation-Reminder",
    //     "Review-Reminder",
    //     "Red-Flag-Alert",
    //     "Chat-Message",
    //     "group-chat-message",
    //     "announcement",
    //     "Session-Update",
    //     "Session-Cancellation",
    //     "Session-Extended",
    //     "Pending-Review",
    //     "Review-Completed",
    //     "general",
    //     "other"
    //   ],
    //   default: "general",
    // },

    type: {
  type: String,
  default: "general",
},
meta: {
  type: Object,
  default: {},
},
    status: {
      type: String,
      enum: ["unseen", "seen","approved","rejected"],
      default: "unseen",
    },
    // meta: {
    //   SessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    //   PhysioId: { type: mongoose.Schema.Types.ObjectId, ref: "Physio" },
    //   PatientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    //   ReviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Review"  },
    //   ConsultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation"  },
    //   LeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead"  },
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);

