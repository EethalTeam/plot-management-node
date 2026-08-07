const WhatsAppFlow = require("../models/masterModels/WhatsAppFlow");
const WhatsAppFlowState = require("../models/masterModels/WhatsAppFlowState");
const { sendTextMessage, sendInteractiveMessage } = require("./whatsappOutbox");

// Only "buttons" and "question" nodes pause the flow waiting for a reply;
// "message" nodes send-and-continue. Guards against a badly authored flow
// (e.g. a "message" node whose `next` points back to itself) spinning
// forever / spamming sends.
const MAX_AUTO_ADVANCE_STEPS = 25;

// A lead who never replies to a pending question/buttons prompt shouldn't
// have that stale session silently absorb an unrelated message weeks later
// (and, since advanceFlow always takes priority over tryStartFlow, an
// abandoned session would otherwise permanently block that lead from ever
// entering a new flow). 24h mirrors Meta's own customer-service window —
// past that point the conversation context is stale by Meta's own rules too.
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

function isExpired(state) {
  return Date.now() - state.updatedAt.getTime() > SESSION_TIMEOUT_MS;
}

function interpolate(text, variables, lead) {
  if (!text) return "";
  const scope = { name: lead?.leadFirstName || "there", ...variables };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (scope[key] ?? ""));
}

async function sendNode(node, variables, lead, waid) {
  const text = interpolate(node.text, variables, lead);
  if (node.type === "buttons") {
    await sendInteractiveMessage({
      waid,
      leadId: lead._id,
      bodyText: text,
      buttons: (node.buttons || []).map((button) => ({ id: button.id, title: button.title })),
    });
  } else if (text) {
    await sendTextMessage({ waid, leadId: lead._id, text });
  }
}

// Walks the flow from `startNodeId`, sending each "message" node and
// auto-continuing to `next`, until it hits a "buttons"/"question" node (saves
// state there, waiting for the lead's reply) or an "end" node (marks the
// session completed). A send failure (e.g. outside Meta's 24h window) is
// logged but doesn't stop the walk — same fail-open pattern as the existing
// sendAutoAcknowledgment/sendKeywordTriggerReply.
async function runUntilWait(state, flow, startNodeId, { lead, waid }) {
  let currentId = startNodeId;
  let steps = 0;

  while (currentId && steps < MAX_AUTO_ADVANCE_STEPS) {
    steps += 1;
    const node = flow.nodes.find((n) => n.nodeId === currentId);
    if (!node) break;

    try {
      await sendNode(node, state.variables || {}, lead, waid);
    } catch (error) {
      console.error(`WhatsApp flow send failed at node ${node.nodeId}:`, error.message);
    }

    if (node.type === "end") {
      state.currentNodeId = node.nodeId;
      state.status = "completed";
      await state.save();
      return;
    }
    if (node.type === "buttons" || node.type === "question") {
      state.currentNodeId = node.nodeId;
      await state.save();
      return;
    }
    currentId = node.next;
  }

  // Ran off a dangling `next` or hit the step guard — end the session rather
  // than leaving it stuck "active" with no way to advance.
  state.status = "completed";
  await state.save();
}

// Continues a lead's already-in-progress flow using their latest inbound
// message. Returns false when the lead has no active session, so
// whatsappParser.js falls through to its normal keyword-trigger/auto-ack path.
exports.advanceFlow = async ({ lead, waid, message, messageBody }) => {
  const state = await WhatsAppFlowState.findOne({ leadId: lead._id, status: "active" });
  if (!state) return false;

  if (isExpired(state)) {
    // Don't treat this message as the answer to a question asked over a day
    // ago — expire the stale session and let tryStartFlow evaluate this
    // message fresh (it may or may not start a new flow).
    state.status = "expired";
    await state.save();
    return false;
  }

  const flow = await WhatsAppFlow.findById(state.flowId);
  if (!flow) {
    state.status = "completed";
    await state.save();
    return false;
  }

  const currentNode = flow.nodes.find((n) => n.nodeId === state.currentNodeId);
  if (!currentNode) {
    state.status = "completed";
    await state.save();
    return false;
  }

  if (currentNode.type === "buttons") {
    const tappedId = message?.interactive?.button_reply?.id;
    const nextNodeId = tappedId ? currentNode.branches?.get(tappedId) : undefined;

    if (!nextNodeId) {
      // The lead typed free text instead of tapping a button — re-prompt
      // rather than silently dropping their turn or guessing a branch.
      const text = interpolate(currentNode.text, state.variables || {}, lead);
      try {
        await sendInteractiveMessage({
          waid,
          leadId: lead._id,
          bodyText: `Please tap one of the options below.\n\n${text}`,
          buttons: (currentNode.buttons || []).map((button) => ({ id: button.id, title: button.title })),
        });
      } catch (error) {
        console.error("WhatsApp flow re-prompt failed:", error.message);
      }
      return true;
    }

    await runUntilWait(state, flow, nextNodeId, { lead, waid });
    return true;
  }

  if (currentNode.type === "question") {
    state.variables = { ...(state.variables || {}), [currentNode.captureVariable]: messageBody };
    await runUntilWait(state, flow, currentNode.next, { lead, waid });
    return true;
  }

  // "message"/"end" nodes never wait for a reply, so state should never be
  // parked on one — defensive fallback if it somehow is.
  state.status = "completed";
  await state.save();
  return false;
};

// Checks whether this message should kick off a brand-new flow (only called
// once advanceFlow has confirmed there's no session already in progress).
// Returns false when nothing matches, so the caller falls through to the
// existing keyword-trigger/auto-ack path.
exports.tryStartFlow = async ({ lead, waid, messageBody, isNewLead }) => {
  const flows = await WhatsAppFlow.find({ enabled: true });
  if (!flows.length) return false;

  const normalizedBody = (messageBody || "").toLowerCase().trim();
  const matched = flows.find((flow) => {
    if (flow.trigger?.triggerType === "new_contact") return isNewLead;
    if (flow.trigger?.triggerType === "keyword") {
      return Boolean(flow.trigger.keyword) && normalizedBody.includes(flow.trigger.keyword.toLowerCase());
    }
    return false;
  });
  if (!matched) return false;

  const state = await WhatsAppFlowState.create({
    leadId: lead._id,
    waid,
    flowId: matched._id,
    currentNodeId: matched.startNodeId,
    variables: {},
    status: "active",
  });

  await runUntilWait(state, matched, matched.startNodeId, { lead, waid });
  return true;
};
