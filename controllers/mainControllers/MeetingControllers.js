const Meeting = require("../../models/masterModels/Meeting");
const { recordActivity } = require("./ActivityLogControllers");
const { getActorId } = require("../../utils/getActor");

function generateMeetingLink() {
  const id = Math.random().toString(36).slice(2, 8);
  return `https://meet.plotbase.app/${id}`;
}

exports.getAllMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ status: { $ne: "cancelled" } })
      .populate("attendees.employeeId", "EmployeeName")
      .sort({ startAt: 1 });
    res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createMeeting = async (req, res) => {
  try {
    const { title, leadName, siteName, startAt, durationMinutes, locationType, address, reminderEnabled, reminderMinutesBefore, attendees } =
      req.body;

    if (!title || !startAt) {
      return res.status(400).json({ success: false, message: "title and startAt are required" });
    }

    const meeting = await Meeting.create({
      title,
      leadName: leadName || undefined,
      siteName: siteName || undefined,
      startAt,
      durationMinutes,
      locationType,
      address: locationType === "in-person" ? address : undefined,
      meetingLink: locationType === "online" ? generateMeetingLink() : undefined,
      reminderEnabled,
      reminderMinutesBefore,
      attendees: (attendees ?? []).map((a) => ({ name: a.name, employeeId: a.employeeId || undefined, rsvpStatus: "pending" })),
    });

    await meeting.populate("attendees.employeeId", "EmployeeName");

    await recordActivity({
      actorId: getActorId(req),
      module: "Meeting",
      action: "scheduled",
      entityId: meeting._id,
      entityLabel: meeting.title,
      description: `Meeting "${meeting.title}" scheduled for ${new Date(meeting.startAt).toLocaleString()}`,
    });

    res.status(201).json({ success: true, message: "Meeting scheduled", data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAttendeeRsvp = async (req, res) => {
  try {
    const { meetingId, attendeeId, status } = req.body;
    const meeting = await Meeting.findOneAndUpdate(
      { _id: meetingId, "attendees._id": attendeeId },
      { $set: { "attendees.$.rsvpStatus": status } },
      { new: true },
    ).populate("attendees.employeeId", "EmployeeName");

    if (!meeting) return res.status(404).json({ success: false, message: "Meeting or attendee not found" });
    res.status(200).json({ success: true, message: "RSVP updated", data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReminder = async (req, res) => {
  try {
    const { meetingId, reminderEnabled, reminderMinutesBefore } = req.body;
    const update = {};
    if (reminderEnabled !== undefined) update.reminderEnabled = reminderEnabled;
    if (reminderMinutesBefore !== undefined) update.reminderMinutesBefore = reminderMinutesBefore;

    const meeting = await Meeting.findByIdAndUpdate(meetingId, update, { new: true }).populate("attendees.employeeId", "EmployeeName");
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });
    res.status(200).json({ success: true, message: "Reminder updated", data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    const meeting = await Meeting.findByIdAndUpdate(meetingId, { status: "cancelled" }, { new: true });
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

    await recordActivity({
      actorId: getActorId(req),
      module: "Meeting",
      action: "cancelled",
      entityId: meeting._id,
      entityLabel: meeting.title,
      description: `Meeting "${meeting.title}" cancelled`,
    });

    res.status(200).json({ success: true, message: "Meeting cancelled" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
