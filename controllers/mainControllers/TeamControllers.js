const Employee = require("../../models/masterModels/Employee");
const Lead = require("../../models/masterModels/Leads");
const TelecmiLog = require("../../models/masterModels/TeleCMICallLog");

const LOST_STATUS_PATTERN = /^lost$/i;
const BOOKED_STATUS_PATTERN = /^booked$/i;
const CALL_WINDOW_DAYS = 30;

function initialsFor(name) {
  if (!name) return "—";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// Team roster with real per-rep performance — no fabricated "booking
// target" or "avg response time" (neither has any real data behind it: no
// per-rep goal is tracked anywhere, and no "first contact" timestamp is
// recorded separately from a lead's general history log).
exports.getTeamRoster = async (req, res) => {
  try {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 86_400_000);
    const callWindowStart = new Date(now - CALL_WINDOW_DAYS * 86_400_000);

    const [employees, leads, calls] = await Promise.all([
      Employee.find({ isActive: true }).populate("roleId", "RoleName").select("EmployeeName roleId TelecmiID").lean(),
      Lead.find()
        .select("leadAssignedId leadStatusId leadPotentialValue SiteVisitDate")
        .populate("leadStatusId", "leadStatustName")
        .lean(),
      TelecmiLog.find({ callDate: { $gte: callWindowStart } }).select("user status answeredsec").lean(),
    ]);

    const leadsByRep = new Map();
    for (const lead of leads) {
      const statusName = lead.leadStatusId?.leadStatustName ?? "";
      if (/deleted|archived/i.test(statusName)) continue;
      if (!lead.leadAssignedId) continue;
      const repId = String(lead.leadAssignedId);
      if (!leadsByRep.has(repId)) leadsByRep.set(repId, []);
      leadsByRep.get(repId).push({ ...lead, statusName });
    }

    const callsByTelecmiId = new Map();
    for (const call of calls) {
      if (!call.user) continue;
      if (!callsByTelecmiId.has(call.user)) callsByTelecmiId.set(call.user, { handled: 0, missed: 0 });
      const bucket = callsByTelecmiId.get(call.user);
      bucket.handled += 1;
      const statusText = String(call.status ?? "").toLowerCase();
      const wasAnswered = statusText.includes("answer") || (call.answeredsec ?? 0) > 0;
      if (!wasAnswered && !statusText.includes("voicemail")) bucket.missed += 1;
    }

    const roster = employees.map((emp) => {
      const repLeads = leadsByRep.get(String(emp._id)) ?? [];
      const bookedLeads = repLeads.filter((l) => BOOKED_STATUS_PATTERN.test(l.statusName)).length;
      const lostLeads = repLeads.filter((l) => LOST_STATUS_PATTERN.test(l.statusName)).length;
      const activeLeads = Math.max(0, repLeads.length - bookedLeads - lostLeads);
      const pipelineValue = repLeads
        .filter((l) => !BOOKED_STATUS_PATTERN.test(l.statusName) && !LOST_STATUS_PATTERN.test(l.statusName))
        .reduce((sum, l) => sum + (l.leadPotentialValue ?? 0), 0);
      const siteVisitsWeek = repLeads.filter((l) => l.SiteVisitDate && new Date(l.SiteVisitDate) >= sevenDaysAgo).length;
      const conversionRate = repLeads.length ? (bookedLeads / repLeads.length) * 100 : 0;
      const callStats = emp.TelecmiID ? callsByTelecmiId.get(emp.TelecmiID) : null;

      return {
        id: emp._id,
        name: emp.EmployeeName ?? "",
        role: emp.roleId?.RoleName ?? "",
        initials: initialsFor(emp.EmployeeName),
        assignedLeads: repLeads.length,
        bookedLeads,
        lostLeads,
        activeLeads,
        conversionRate,
        pipelineValue,
        siteVisitsWeek,
        callsHandled: callStats?.handled ?? 0,
        missedCalls: callStats?.missed ?? 0,
      };
    });

    roster.sort((a, b) => b.conversionRate - a.conversionRate);

    res.status(200).json({ success: true, data: roster });
  } catch (error) {
    console.error("Team Roster Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
