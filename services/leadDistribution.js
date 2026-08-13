const DistributionSetting = require("../models/masterModels/DistributionSetting");
const Employee = require("../models/masterModels/Employee");
const Notification = require("../models/masterModels/Notification");
const { recordActivity } = require("../controllers/mainControllers/ActivityLogControllers");

async function ensureSetting() {
  let setting = await DistributionSetting.findOne();
  if (!setting) {
    const activeEmployees = await Employee.find({ isActive: true }).select("_id");
    setting = await DistributionSetting.create({
      enabled: true,
      rotationOrder: activeEmployees.map((e) => e._id),
      nextUpIndex: 0,
    });
  }
  return setting;
}

// Auto-assigns a freshly created Lead to the next eligible rep in the
// rotation, advances the pointer, and logs/notifies the same way a manual
// assignLead does — called right after Lead.create()/lead.save() on every
// real creation path (form, bulk import, IndiaMART, Justdial, WhatsApp).
// Best-effort: a distribution failure must never break lead creation itself.
async function autoAssignLead(lead, { sourceLabel, io } = {}) {
  try {
    const setting = await ensureSetting();
    if (!setting.enabled || setting.rotationOrder.length === 0) return null;

    const activeIds = new Set((await Employee.find({ isActive: true }).select("_id")).map((e) => String(e._id)));
    const rotation = setting.rotationOrder.filter((id) => activeIds.has(String(id)));
    if (rotation.length === 0) return null;

    const index = setting.nextUpIndex % rotation.length;
    const employeeId = rotation[index];
    const employee = await Employee.findById(employeeId).select("EmployeeName");
    if (!employee) return null;

    const sourceSuffix = sourceLabel ? ` (${sourceLabel})` : "";
    const leadName = `${lead.leadFirstName ?? ""} ${lead.leadLastName ?? ""}`.trim() || "New lead";

    lead.leadAssignedId = employeeId;
    lead.leadHistory = lead.leadHistory || [];
    lead.leadHistory.push({
      eventType: "Lead Assigned",
      details: `Auto-assigned to ${employee.EmployeeName} via round robin${sourceSuffix}`,
    });
    await lead.save();

    // Advance the pointer by position within the full rotationOrder (not the
    // filtered-active list), so re-activating a skipped employee later
    // doesn't shift everyone else's turn.
    const fullIndex = setting.rotationOrder.findIndex((id) => String(id) === String(employeeId));
    setting.nextUpIndex = (fullIndex + 1) % setting.rotationOrder.length;
    await setting.save();

    await recordActivity({
      actorId: null,
      module: "Lead",
      action: "auto_assigned",
      entityId: lead._id,
      entityLabel: leadName,
      newValue: employee.EmployeeName,
      description: `"${leadName}" auto-assigned to ${employee.EmployeeName} via round robin${sourceSuffix}`,
    });

    await Notification.create({
      toEmployeeId: employeeId,
      message: `New lead "${leadName}" auto-assigned to you via round robin.`,
      type: "lead-assigned",
      status: "unseen",
      meta: { leadId: lead._id, assignedToId: employeeId, assignedToName: employee.EmployeeName },
    });

    if (io) {
      io.to(employeeId.toString()).emit("receiveNotification", {
        message: `New lead "${leadName}" assigned to you.`,
        meta: { leadId: lead._id },
      });
    }

    return employeeId;
  } catch (error) {
    console.error("Auto-assign lead failed:", error.message);
    return null;
  }
}

module.exports = { autoAssignLead, ensureSetting };
