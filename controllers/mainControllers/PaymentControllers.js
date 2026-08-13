const mongoose = require("mongoose");
const PaymentPlan = require("../../models/masterModels/PaymentPlan");
const PaymentTransaction = require("../../models/masterModels/PaymentTransaction");
const { recordActivity } = require("./ActivityLogControllers");
const { getActorId } = require("../../utils/getActor");

const PLAN_POPULATE = [
  { path: "plotId", select: "plotNumber plotCode siteId", populate: { path: "siteId", select: "sitename" } },
  { path: "visitorId", select: "visitorName visitorMobile visitorCode" },
];

// Recomputes each installment's status against "today" and rolls that up
// into the plan's overall status. Called after every write so `status` is
// always a derived value, never something a caller sets directly.
function recomputePlanStatus(plan) {
  const now = Date.now();
  let anyOverdue = false;
  let allPaid = true;

  for (const installment of plan.installments) {
    const isFullyPaid = installment.paidAmount >= installment.amount;
    if (isFullyPaid) {
      installment.status = "paid";
    } else if (installment.dueDate.getTime() < now) {
      installment.status = "overdue";
      anyOverdue = true;
      allPaid = false;
    } else if (installment.paidAmount > 0) {
      installment.status = "partial";
      allPaid = false;
    } else {
      installment.status = "pending";
      allPaid = false;
    }
  }

  plan.status = allPaid ? "completed" : anyOverdue ? "overdue" : "on-track";
}

exports.createPaymentPlan = async (req, res) => {
  try {
    const { plotId, visitorId, totalAmount, installments, notes, createdById } = req.body;

    if (!plotId || !visitorId || !totalAmount || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "plotId, visitorId, totalAmount and at least one installment are required",
      });
    }

    const existing = await PaymentPlan.findOne({ plotId, isActive: true });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This plot already has an active payment plan.",
      });
    }

    const plan = new PaymentPlan({
      plotId,
      visitorId,
      totalAmount,
      notes,
      createdById: createdById || undefined,
      installments: installments.map((i) => ({
        label: i.label,
        dueDate: i.dueDate,
        amount: i.amount,
        paidAmount: 0,
      })),
    });

    recomputePlanStatus(plan);
    await plan.save();
    await plan.populate(PLAN_POPULATE);

    await recordActivity({
      actorId: getActorId(req),
      module: "Payment",
      action: "plan_created",
      entityId: plan._id,
      entityLabel: plan.plotId?.plotNumber ?? plan._id.toString(),
      description: `Payment plan created for plot ${plan.plotId?.plotNumber ?? ""} (${plan.visitorId?.visitorName ?? "visitor"}) — total ${plan.totalAmount}`,
    });

    res.status(201).json({ success: true, message: "Payment plan created", data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllPaymentPlans = async (req, res) => {
  try {
    const { status, search } = req.body || {};
    const query = { isActive: true };
    if (status && status !== "all") query.status = status;

    let plans = await PaymentPlan.find(query).populate(PLAN_POPULATE).sort({ createdAt: -1 });

    if (search) {
      const term = search.trim().toLowerCase();
      plans = plans.filter((plan) => {
        const plotNumber = plan.plotId?.plotNumber?.toLowerCase() ?? "";
        const visitorName = plan.visitorId?.visitorName?.toLowerCase() ?? "";
        const visitorMobile = plan.visitorId?.visitorMobile?.toLowerCase() ?? "";
        return plotNumber.includes(term) || visitorName.includes(term) || visitorMobile.includes(term);
      });
    }

    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentPlanByPlot = async (req, res) => {
  try {
    const { plotId } = req.body;
    const plan = await PaymentPlan.findOne({ plotId, isActive: true }).populate(PLAN_POPULATE);
    if (!plan) {
      return res.status(404).json({ success: false, message: "No payment plan for this plot" });
    }
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentPlanById = async (req, res) => {
  try {
    const { _id } = req.body;
    const plan = await PaymentPlan.findById(_id).populate(PLAN_POPULATE);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Payment plan not found" });
    }
    const transactions = await PaymentTransaction.find({ paymentPlanId: _id }).sort({ paymentDate: -1 });
    res.status(200).json({ success: true, data: { plan, transactions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Records a receipt and applies it to an installment — either the one named
// in installmentId, or (if omitted) the oldest installment that isn't fully
// paid yet, oldest-due-first, which is the sensible default for walk-in
// collections where the rep just says "customer paid X today."
exports.recordPayment = async (req, res) => {
  try {
    const { paymentPlanId, installmentId, amount, paymentDate, paymentMode, referenceNumber, receiptNumber, notes, recordedById } = req.body;

    if (!paymentPlanId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "paymentPlanId and a positive amount are required" });
    }

    const plan = await PaymentPlan.findById(paymentPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Payment plan not found" });
    }

    let targetInstallment = installmentId
      ? plan.installments.id(installmentId)
      : plan.installments
          .filter((i) => i.paidAmount < i.amount)
          .sort((a, b) => a.dueDate - b.dueDate)[0];

    if (!targetInstallment) {
      return res.status(400).json({ success: false, message: "No outstanding installment to apply this payment to" });
    }

    targetInstallment.paidAmount += Number(amount);
    recomputePlanStatus(plan);
    await plan.save();

    const transaction = await PaymentTransaction.create({
      paymentPlanId: plan._id,
      installmentId: targetInstallment._id,
      plotId: plan.plotId,
      visitorId: plan.visitorId,
      amount,
      paymentDate: paymentDate || new Date(),
      paymentMode,
      referenceNumber,
      receiptNumber,
      notes,
      recordedById: recordedById || undefined,
    });

    await plan.populate(PLAN_POPULATE);

    await recordActivity({
      actorId: getActorId(req),
      module: "Payment",
      action: "payment_recorded",
      entityId: plan._id,
      entityLabel: plan.plotId?.plotNumber ?? plan._id.toString(),
      newValue: amount,
      description: `Payment of ${amount} recorded for plot ${plan.plotId?.plotNumber ?? ""} (${plan.visitorId?.visitorName ?? "visitor"})`,
    });

    res.status(201).json({ success: true, message: "Payment recorded", data: { plan, transaction } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPlanTransactions = async (req, res) => {
  try {
    const { paymentPlanId } = req.body;
    const transactions = await PaymentTransaction.find({ paymentPlanId }).sort({ paymentDate: -1 });
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePaymentPlan = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const plan = await PaymentPlan.findByIdAndUpdate(_id, { isActive: false }, { new: true }).populate(PLAN_POPULATE);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Payment plan not found" });
    }

    await recordActivity({
      actorId: getActorId(req),
      module: "Payment",
      action: "plan_deleted",
      entityId: plan._id,
      entityLabel: plan.plotId?.plotNumber ?? plan._id.toString(),
      description: `Payment plan removed for plot ${plan.plotId?.plotNumber ?? ""}`,
    });

    res.status(200).json({ success: true, message: "Payment plan removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Runs daily (see queues/scheduledJobs.js) — flips any installment whose due
// date has passed without full payment to "overdue" and rolls that up into
// the plan status, independent of anyone opening the plan in the UI.
exports.markOverdueInstallments = async () => {
  const plans = await PaymentPlan.find({ isActive: true, status: { $ne: "completed" } });

  for (const plan of plans) {
    recomputePlanStatus(plan);
    await plan.save();
  }

  console.log(`[Payments] markOverdueInstallments checked=${plans.length}`);
  return { checked: plans.length };
};
