const SequenceDefinition = require("../../models/masterModels/SequenceDefinition");
const SequenceEnrollment = require("../../models/masterModels/SequenceEnrollment");

// Lets the builder warn before an edit/delete strands leads currently
// enrolled in a sequence (see sequenceEngine.js — editing/deleting a
// sequence with active enrollments can leave them stuck mid-way).
exports.getSequences = async (req, res) => {
  try {
    const sequences = await SequenceDefinition.find({}).sort({ createdAt: -1 }).lean();
    const counts = await SequenceEnrollment.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$sequenceId", count: { $sum: 1 } } },
    ]);
    const countBySequenceId = new Map(counts.map((c) => [String(c._id), c.count]));
    const data = sequences.map((sequence) => ({
      ...sequence,
      activeEnrollmentCount: countBySequenceId.get(String(sequence._id)) || 0,
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSequence = async (req, res) => {
  try {
    const { name, trigger } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const sequence = await SequenceDefinition.create({
      name,
      trigger: trigger || { triggerType: "new_lead" },
      enabled: true,
      steps: [{ stepId: "step-1", delay: "immediately", messageType: "text", text: "Hi {{name}}! Thanks for reaching out." }],
    });

    res.status(201).json({ success: true, data: sequence });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Replace-whole-document save — the builder submits the entire step list at
// once rather than per-step endpoints.
exports.saveSequence = async (req, res) => {
  try {
    const { sequenceId, name, trigger, enabled, steps } = req.body;
    if (!sequenceId) return res.status(400).json({ success: false, message: "sequenceId is required" });

    const sequence = await SequenceDefinition.findByIdAndUpdate(
      sequenceId,
      { name, trigger, enabled, steps },
      { new: true, runValidators: true },
    );
    if (!sequence) return res.status(404).json({ success: false, message: "Sequence not found" });

    res.status(200).json({ success: true, data: sequence });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSequence = async (req, res) => {
  try {
    const { sequenceId } = req.body;
    await SequenceDefinition.findByIdAndDelete(sequenceId);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
