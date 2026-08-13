const ActivityLog = require("../../models/masterModels/Log");

// Called from other controllers after a mutating action succeeds. Best
// effort: a logging failure must never break the write it's recording, so
// errors are swallowed (and only logged to the server console) rather than
// propagated to the caller.
exports.recordActivity = async ({ actorId, module, action, entityId, entityLabel, changeField, oldValue, newValue, description }) => {
  try {
    await ActivityLog.create({
      actorId: actorId || undefined,
      module,
      action,
      entityId,
      entityLabel,
      changeField,
      oldValue,
      newValue,
      description,
    });
  } catch (error) {
    console.error("[ActivityLog] failed to record:", error.message);
  }
};

exports.getActivityLog = async (req, res) => {
  try {
    const { module, entityId, actorId, action, search, startDate, endDate, page = 1, limit = 50 } = req.body || {};
    const query = {};
    if (module) query.module = module;
    if (entityId) query.entityId = entityId;
    if (actorId) query.actorId = actorId;
    if (action) query.action = action;
    if (search) {
      const term = new RegExp(search, "i");
      query.$or = [{ entityLabel: term }, { description: term }];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ActivityLog.find(query).populate("actorId", "EmployeeName").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ActivityLog.countDocuments(query),
    ]);

    res.status(200).json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
