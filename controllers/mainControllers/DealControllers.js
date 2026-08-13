const fs = require("fs");
const mongoose = require("mongoose");
const Deal = require("../../models/masterModels/Deal");
const { recordActivity } = require("./ActivityLogControllers");
const { getActorId } = require("../../utils/getActor");

const DEAL_POPULATE = [
  { path: "siteId", select: "sitename location" },
  { path: "plotId", select: "plotNumber plotCode" },
  { path: "visitorId", select: "visitorName visitorMobile" },
  { path: "ownerId", select: "EmployeeName" },
];

exports.createDeal = async (req, res) => {
  try {
    const { leadId, leadName, phone, siteId, plotId, visitorId, unit, ownerId, stageId, value } = req.body;

    if (!leadName || !siteId) {
      return res.status(400).json({ success: false, message: "leadName and siteId are required" });
    }

    const deal = await Deal.create({
      leadId: leadId || undefined,
      leadName,
      phone,
      siteId,
      plotId: plotId || undefined,
      visitorId: visitorId || undefined,
      unit,
      ownerId: ownerId || undefined,
      stageId: stageId || "new",
      value: value || 0,
      stageEnteredAt: new Date(),
    });

    await deal.populate(DEAL_POPULATE);

    await recordActivity({
      actorId: getActorId(req),
      module: "Deal",
      action: "created",
      entityId: deal._id,
      entityLabel: deal.leadName,
      description: `Deal "${deal.leadName}" created`,
    });

    res.status(201).json({ success: true, message: "Deal created", data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find({ isActive: true }).populate(DEAL_POPULATE).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: deals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDeal = async (req, res) => {
  try {
    const { _id, leadName, phone, siteId, plotId, visitorId, unit, ownerId, value } = req.body;
    const deal = await Deal.findByIdAndUpdate(
      _id,
      { leadName, phone, siteId, plotId: plotId || undefined, visitorId: visitorId || undefined, unit, ownerId: ownerId || undefined, value },
      { new: true, runValidators: true },
    ).populate(DEAL_POPULATE);

    if (!deal) return res.status(404).json({ success: false, message: "Deal not found" });
    res.status(200).json({ success: true, message: "Deal updated", data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDealStage = async (req, res) => {
  try {
    const { dealId, stageId } = req.body;
    const existing = await Deal.findById(dealId).select("stageId leadName");
    if (!existing) return res.status(404).json({ success: false, message: "Deal not found" });
    const oldStageId = existing.stageId;

    const deal = await Deal.findByIdAndUpdate(
      dealId,
      { stageId, stageEnteredAt: new Date() },
      { new: true, runValidators: true },
    ).populate(DEAL_POPULATE);

    if (!deal) return res.status(404).json({ success: false, message: "Deal not found" });

    if (stageId !== oldStageId) {
      await recordActivity({
        actorId: getActorId(req),
        module: "Deal",
        action: "stage_changed",
        entityId: deal._id,
        entityLabel: deal.leadName,
        changeField: "stageId",
        oldValue: oldStageId,
        newValue: stageId,
        description: `Deal "${deal.leadName}" moved from ${oldStageId} to ${stageId}`,
      });
    }

    res.status(200).json({ success: true, message: "Deal stage updated", data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDeal = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const deal = await Deal.findByIdAndUpdate(_id, { isActive: false }, { new: true });
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found" });

    await recordActivity({
      actorId: getActorId(req),
      module: "Deal",
      action: "deleted",
      entityId: deal._id,
      entityLabel: deal.leadName,
      description: `Deal "${deal.leadName}" removed`,
    });

    res.status(200).json({ success: true, message: "Deal removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuotation = async (req, res) => {
  try {
    const { dealId } = req.body;
    const deal = await Deal.findById(dealId).select("quotation");
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found" });
    res.status(200).json({ success: true, data: deal.quotation ?? null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveQuotation = async (req, res) => {
  try {
    const { dealId, lineItems, taxRatePercent, notes } = req.body;
    const items = lineItems ?? [];
    const rate = Number(taxRatePercent ?? 18) || 0;
    // Mirrors the totals math in QuotationModal.jsx exactly, so "Deal Value"
    // always matches what the quotation actually shows — the two used to be
    // completely disconnected (value only ever set once, at deal creation).
    const subtotal = items.reduce((acc, li) => acc + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0);
    const total = subtotal * (1 + rate / 100);

    const deal = await Deal.findByIdAndUpdate(
      dealId,
      {
        quotation: {
          lineItems: items,
          taxRatePercent: rate,
          notes,
          generatedAt: new Date(),
        },
        value: total,
      },
      { new: true, runValidators: true },
    );
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found" });
    res.status(200).json({ success: true, message: "Quotation saved", data: deal.quotation, dealValue: deal.value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDealDocuments = async (req, res) => {
  try {
    const { dealId } = req.body;
    const deal = await Deal.findById(dealId).select("documents");
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found" });
    res.status(200).json({ success: true, data: deal.documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addDealDocument = async (req, res) => {
  const { dealId } = req.body;
  const uploadedFile = req.file;

  if (!dealId) {
    if (uploadedFile) fs.unlinkSync(uploadedFile.path);
    return res.status(400).json({ success: false, message: "dealId is required" });
  }
  if (!uploadedFile) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  try {
    const deal = await Deal.findById(dealId);
    if (!deal) {
      fs.unlinkSync(uploadedFile.path);
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    deal.documents.unshift({
      fileName: uploadedFile.originalname,
      fileUrl: `/api/lead_documents/${uploadedFile.filename}`,
      sizeKb: Math.max(1, Math.round(uploadedFile.size / 1024)),
      uploadedAt: new Date(),
    });
    await deal.save();

    res.status(201).json({ success: true, message: "Document attached", data: deal.documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDealDocument = async (req, res) => {
  try {
    const { dealId, documentId } = req.body;
    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found" });

    deal.documents = deal.documents.filter((d) => d._id.toString() !== documentId);
    await deal.save();

    res.status(200).json({ success: true, message: "Document removed", data: deal.documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
