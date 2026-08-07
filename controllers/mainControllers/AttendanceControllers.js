const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const Attendance = require("../../models/masterModels/Attendance");
const Employee = require("../../models/masterModels/Employee");

const INDIA_TZ = "Asia/Kolkata";

function todayKey() {
  return dayjs().tz(INDIA_TZ).format("YYYY-MM-DD");
}

// Upsert rather than find-then-create so two near-simultaneous first
// requests for the same employee/day (e.g. the page's own poll landing at
// the same moment as a check-in click) can't race into a duplicate-key
// error against the unique (employeeId, date) index.
async function ensureTodayRecord(employeeId) {
  const date = todayKey();
  return Attendance.findOneAndUpdate(
    { employeeId, date },
    { $setOnInsert: { employeeId, date, status: "present", checkInTime: null, checkOutTime: null, breaks: [] } },
    { new: true, upsert: true },
  );
}

exports.getTodayForEmployee = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
    const record = await ensureTodayRecord(employeeId);
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllToday = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).select("_id");
    const date = todayKey();

    await Promise.all(
      employees.map((emp) =>
        Attendance.findOneAndUpdate(
          { employeeId: emp._id, date },
          { $setOnInsert: { employeeId: emp._id, date, status: "present", checkInTime: null, checkOutTime: null, breaks: [] } },
          { upsert: true },
        ),
      ),
    );

    const records = await Attendance.find({ date, employeeId: { $in: employees.map((e) => e._id) } });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
    const record = await ensureTodayRecord(employeeId);
    if (record.checkInTime) {
      return res.status(400).json({ success: false, message: "Already checked in for today." });
    }
    record.checkInTime = new Date();
    record.checkOutTime = null;
    record.status = "present";
    await record.save();
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
    const record = await ensureTodayRecord(employeeId);
    if (!record.checkInTime) {
      return res.status(400).json({ success: false, message: "Check in before checking out." });
    }
    if (record.breaks.some((b) => !b.end)) {
      return res.status(400).json({ success: false, message: "End the active break before checking out." });
    }
    record.checkOutTime = new Date();
    await record.save();
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.startBreak = async (req, res) => {
  try {
    const { employeeId, reason } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
    const record = await ensureTodayRecord(employeeId);
    if (!record.checkInTime || record.checkOutTime) {
      return res.status(400).json({ success: false, message: "Check in before starting a break." });
    }
    if (record.breaks.some((b) => !b.end)) {
      return res.status(400).json({ success: false, message: "A break is already in progress." });
    }
    record.breaks.push({ start: new Date(), end: null, reason: reason || "Break" });
    await record.save();
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
    const record = await ensureTodayRecord(employeeId);
    const active = record.breaks.find((b) => !b.end);
    if (!active) {
      return res.status(400).json({ success: false, message: "No active break to end." });
    }
    active.end = new Date();
    await record.save();
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { employeeId, days = 13 } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
    const since = dayjs().tz(INDIA_TZ).subtract(Number(days) - 1, "day").format("YYYY-MM-DD");
    const records = await Attendance.find({ employeeId, date: { $gte: since } }).sort({ date: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
