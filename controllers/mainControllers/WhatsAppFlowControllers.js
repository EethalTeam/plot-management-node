const WhatsAppFlow = require("../../models/masterModels/WhatsAppFlow");
const WhatsAppFlowState = require("../../models/masterModels/WhatsAppFlowState");

// Lets the builder warn before an edit/delete strands leads who are
// currently mid-conversation in a flow (see whatsappFlowEngine.js — editing
// or deleting a flow with active sessions can leave them stuck or captured
// into fields that no longer make sense).
exports.getFlows = async (req, res) => {
  try {
    const flows = await WhatsAppFlow.find({}).sort({ createdAt: -1 }).lean();
    const counts = await WhatsAppFlowState.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$flowId", count: { $sum: 1 } } },
    ]);
    const countByFlowId = new Map(counts.map((c) => [String(c._id), c.count]));
    const data = flows.map((flow) => ({
      ...flow,
      activeSessionCount: countByFlowId.get(String(flow._id)) || 0,
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFlow = async (req, res) => {
  try {
    const { flowId } = req.body;
    const flow = await WhatsAppFlow.findById(flowId);
    if (!flow) return res.status(404).json({ success: false, message: "Flow not found" });
    res.status(200).json({ success: true, data: flow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFlow = async (req, res) => {
  try {
    const { name, trigger } = req.body;
    if (!name || !trigger?.triggerType) {
      return res.status(400).json({ success: false, message: "name and trigger.triggerType are required" });
    }

    const startNodeId = "node-1";
    const flow = await WhatsAppFlow.create({
      name,
      trigger,
      enabled: true,
      startNodeId,
      nodes: [{ nodeId: startNodeId, type: "message", text: "Hi! Welcome to PlotBase.", next: undefined }],
    });

    res.status(201).json({ success: true, data: flow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Replace-whole-document save — the list-based builder submits the entire
// node list at once rather than per-node endpoints.
exports.saveFlow = async (req, res) => {
  try {
    const { flowId, name, trigger, enabled, nodes, startNodeId } = req.body;
    if (!flowId) return res.status(400).json({ success: false, message: "flowId is required" });

    const flow = await WhatsAppFlow.findByIdAndUpdate(
      flowId,
      { name, trigger, enabled, nodes, startNodeId },
      { new: true, runValidators: true },
    );
    if (!flow) return res.status(404).json({ success: false, message: "Flow not found" });

    res.status(200).json({ success: true, data: flow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFlow = async (req, res) => {
  try {
    const { flowId } = req.body;
    await WhatsAppFlow.findByIdAndDelete(flowId);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
