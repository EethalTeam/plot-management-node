const Employee = require("../../models/masterModels/Employee");
const { ensureSetting } = require("../../services/leadDistribution");

async function populatedSetting() {
  const setting = await ensureSetting();
  await setting.populate("rotationOrder", "EmployeeName");
  return setting;
}

exports.getSettings = async (req, res) => {
  try {
    const setting = await populatedSetting();
    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEnabled = async (req, res) => {
  try {
    const { enabled } = req.body;
    const setting = await ensureSetting();
    setting.enabled = Boolean(enabled);
    await setting.save();
    res.status(200).json({ success: true, data: await populatedSetting() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addToRotation = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
    const setting = await ensureSetting();
    if (!setting.rotationOrder.some((id) => String(id) === String(employeeId))) {
      setting.rotationOrder.push(employeeId);
      await setting.save();
    }
    res.status(200).json({ success: true, data: await populatedSetting() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeFromRotation = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const setting = await ensureSetting();
    const removeIndex = setting.rotationOrder.findIndex((id) => String(id) === String(employeeId));
    if (removeIndex === -1) {
      return res.status(404).json({ success: false, message: "Employee is not in the rotation" });
    }
    setting.rotationOrder.splice(removeIndex, 1);
    if (setting.rotationOrder.length === 0) {
      setting.nextUpIndex = 0;
    } else {
      if (setting.nextUpIndex > removeIndex) setting.nextUpIndex -= 1;
      setting.nextUpIndex = setting.nextUpIndex % setting.rotationOrder.length;
    }
    await setting.save();
    res.status(200).json({ success: true, data: await populatedSetting() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.moveInRotation = async (req, res) => {
  try {
    const { employeeId, direction } = req.body;
    const setting = await ensureSetting();
    const index = setting.rotationOrder.findIndex((id) => String(id) === String(employeeId));
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index !== -1 && swapWith >= 0 && swapWith < setting.rotationOrder.length) {
      [setting.rotationOrder[index], setting.rotationOrder[swapWith]] = [setting.rotationOrder[swapWith], setting.rotationOrder[index]];
      await setting.save();
    }
    res.status(200).json({ success: true, data: await populatedSetting() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Active employees not already in the rotation — populates the "add rep" picker.
exports.getEligibleEmployees = async (req, res) => {
  try {
    const setting = await ensureSetting();
    const inRotation = new Set(setting.rotationOrder.map((id) => String(id)));
    const employees = await Employee.find({ isActive: true }).select("EmployeeName");
    const eligible = employees.filter((e) => !inRotation.has(String(e._id)));
    res.status(200).json({ success: true, data: eligible });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
