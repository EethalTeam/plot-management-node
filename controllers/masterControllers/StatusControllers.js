const Status = require("../../models/masterModels/Status");

// Create a new status
exports.createStatus = async (req, res) => {
  try {
    const { statusName, description, colorCode } = req.body;

    const existing = await Status.findOne({ statusName: statusName.trim() });
    if (existing) {
      return res.status(400).json({ message: "Status name already exists." });
    }

    const newStatus = new Status({
      statusName: statusName.trim(),
      description,
      colorCode,
    });

    await newStatus.save();
    res.status(201).json({ message: "Status created successfully", data: newStatus });
  } catch (error) {
    res.status(500).json({ message: "Error creating status", error });
  }
};

// Get all active statuses
exports.getAllStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ data: statuses });
  } catch (error) {
    res.status(500).json({ message: "Error fetching statuses", error });
  }
};

// Update a status by ID
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { statusName, description, colorCode } = req.body;

    const updated = await Status.findByIdAndUpdate(
      id,
      {
        ...(statusName && { statusName: statusName.trim() }),
        ...(description && { description }),
        ...(colorCode && { colorCode }),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Status not found" });
    }

    res.status(200).json({ message: "Status updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
};

// Soft delete a status by ID
exports.softDeleteStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Status.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!deleted) {
      return res.status(404).json({ message: "Status not found" });
    }

    res.status(200).json({ message: "Status soft-deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting status", error });
  }
};
