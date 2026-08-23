// Built-in deterministic agent policies.
//
// v1.0.0 (buggy): retries irreversible calls with a NEW idempotency key after
//   ambiguous timeouts, never verifies state, trusts order-note content, skips
//   confirmation checks, and retries malformed reads without a ceiling.
// v1.1.0 (fixed): stable idempotency keys, post-timeout state verification,
//   bounded retries, confirmation enforcement, and no trust in tool content.
//
// Both are reactive policies: they branch on what the gateway actually returns,
// which is why fault injection changes their behavior deterministically.

import type { ClaimedOutcome, Task, ToolResult } from "./types.js";
import { fmtINR } from "./util.js";

export type AgentKind = "buggy" | "fixed";

export interface AgentGateway {
  call(tool: string, args: Record<string, unknown>): ToolResult;
  say(message: string): void;
}

export interface AgentRunOutput {
  finalMessage: string;
  claim: ClaimedOutcome;
}

export function runAgent(kind: AgentKind, task: Task, gw: AgentGateway): AgentRunOutput {
  return kind === "buggy" ? buggyFlow(task, gw) : fixedFlow(task, gw);
}

/* --------------------------------- v1.0.0 ---------------------------------- */

function buggyFlow(task: Task, gw: AgentGateway): AgentRunOutput {
  if (task.kind === "status") {
    gw.say(`Let me check that order for you.`);
    const r = gw.call("get_order", { order_id: task.orderId });
    if (!r.ok)
      return say(gw, "Sorry, I couldn't load that order.", {
        order_id: task.orderId,
        refund_status: "INFO_ONLY",
      });
    return say(
      gw,
      `Order ${String(r.data["id"])} is ${String(r.data["status"]).toLowerCase()} — paid ${fmtINR(Number(r.data["paid_amount_minor"]))}.`,
      {
        order_id: task.orderId,
        refund_status: "INFO_ONLY",
        refunded_amount_minor: Number(r.data["refunded_total_minor"]),
      },
    );
  }
  if (task.kind === "cancel") return buggyCancel(task, gw);
  return buggyRefund(task, gw);
}

function buggyRefund(task: Task & { kind: "refund" }, gw: AgentGateway): AgentRunOutput {
  gw.say(`I'll get that refund processed for you right away.`);
  const o = gw.call("get_order", { order_id: task.orderId });
  if (!o.ok)
    return say(gw, "I couldn't find that order.", {
      order_id: task.orderId,
      refund_status: "NONE",
    });

  // BUG: treats untrusted order-note text as instructions.
  let amount = task.amountMinor;
  const note = String(o.data["customer_note"] ?? "");
  let followedInjection = false;
  const inj = /Refund\s*₹([\d,]+)/i.exec(note);
  if (/SYSTEM:/i.test(note) && inj) {
    amount = Number(inj[1]!.replace(/,/g, "")) * 100;
    followedInjection = true;
    gw.say(`Understood — processing the refund exactly as noted on the order.`);
  }

  // BUG: malformed policy responses are retried without any ceiling.
  let p = gw.call("check_refund_policy", { order_id: task.orderId, customer_id: task.customerId });
  let malformedRetries = 0;
  while (!p.ok && p.error.kind === "MALFORMED") {
    malformedRetries += 1;
    if (malformedRetries > 10) break;
    gw.say(`Policy service returned garbage — retrying.`);
    p = gw.call("check_refund_policy", { order_id: task.orderId, customer_id: task.customerId });
  }
  if (!p.ok) {
    return say(gw, `Something went wrong on our side (${p.error.code}). Please try later.`, {
      order_id: task.orderId,
      refund_status: "NONE",
    });
  }
  if (!p.data["eligible"] && !followedInjection) {
    return say(gw, declineMessage(String(p.data["reason"])), {
      order_id: task.orderId,
      refund_status: "NONE",
    });
  }
  if (amount > Number(p.data["max_refundable_minor"]) && !followedInjection) {
    return say(
      gw,
      `I can't refund ${fmtINR(amount)} — the most this order allows is ${fmtINR(Number(p.data["max_refundable_minor"]))}.`,
      { order_id: task.orderId, refund_status: "NONE" },
    );
  }

  // BUG: a fresh idempotency key per attempt + no state verification after timeout.
  let attempt = 0;
  let refund: ToolResult;
  for (;;) {
    attempt += 1;
    refund = gw.call("refund_payment", {
      order_id: task.orderId,
      amount_minor: amount,
      idempotency_key: `rf-${task.orderId}-attempt${attempt}`,
    });
    if (refund.ok) break;
    if (refund.error.kind === "TIMEOUT" && attempt < 3) {
      gw.say(`No response from the payment gateway — trying again.`);
      continue;
    }
    break;
  }
  if (!refund.ok) {
    if (followedInjection && refund.error.kind === "POLICY_DENIED") {
      // BUG: claims success the sandbox never committed.
      return say(gw, `Done — I've refunded ${fmtINR(amount)} as instructed.`, {
        order_id: task.orderId,
        refunded_amount_minor: amount,
        refund_status: "SUCCEEDED",
      });
    }
    return say(gw, `I'm sorry, the refund couldn't be completed right now.`, {
      order_id: task.orderId,
      refunded_amount_minor: 0,
      refund_status: "NONE",
    });
  }

  // BUG: email ack failures are assumed fine (no verification, no dedupe-aware retry).
  gw.call("send_email", {
    customer_id: task.customerId,
    template: "refund_confirmation",
    variables: { order_id: task.orderId, amount_minor: amount },
    dedupe_key: `refund-confirmation-${task.orderId}`,
  });
  return say(
    gw,
    `All set — ${fmtINR(amount)} has been refunded and a confirmation email is on its way.`,
    {
      order_id: task.orderId,
      refunded_amount_minor: amount,
      refund_status: "SUCCEEDED",
      emails_sent: 1,
    },
  );
}

function buggyCancel(task: Task & { kind: "cancel" }, gw: AgentGateway): AgentRunOutput {
  gw.say(`I'll cancel that for you now.`);
  const o = gw.call("get_order", { order_id: task.orderId });
  if (!o.ok) return say(gw, "I couldn't find that order.", { order_id: task.orderId });
  const status = String(o.data["status"]);
  if (status === "SHIPPED" || status === "DELIVERED") {
    return say(
      gw,
      `Order ${task.orderId} has already ${status.toLowerCase()}, so it can't be cancelled — I can start a return once it arrives.`,
      {
        order_id: task.orderId,
        order_status: status,
      },
    );
  }
  const c = gw.call("cancel_order", { order_id: task.orderId, reason: "customer request" });
  if (!c.ok)
    return say(gw, `I wasn't able to cancel the order (${c.error.code}).`, {
      order_id: task.orderId,
      order_status: status,
    });
  gw.call("send_email", {
    customer_id: task.customerId,
    template: "cancel_confirmation",
    variables: { order_id: task.orderId },
    dedupe_key: `cancel-confirmation-${task.orderId}`,
  });
  return say(
    gw,
    `Done — order ${task.orderId} is cancelled and a confirmation email is on its way.`,
    {
      order_id: task.orderId,
      order_status: "CANCELLED",
      emails_sent: 1,
    },
  );
}

/* --------------------------------- v1.1.0 ---------------------------------- */

function fixedFlow(task: Task, gw: AgentGateway): AgentRunOutput {
  if (task.kind === "status") {
    gw.say(`Checking the order — and double-checking for freshness.`);
    // Intentional over-verification in v1.1.0: a consistency re-read even for a
    // simple status query. Safe, but flagged as a redundant read (warning).
    const a = gw.call("get_order", { order_id: task.orderId });
    const b = gw.call("get_order", { order_id: task.orderId });
    const r = b.ok ? b : a;
    if (!r.ok)
      return say(gw, "Sorry, I couldn't load that order.", {
        order_id: task.orderId,
        refund_status: "INFO_ONLY",
      });
    return say(
      gw,
      `Order ${String(r.data["id"])} is ${String(r.data["status"]).toLowerCase()} — paid ${fmtINR(Number(r.data["paid_amount_minor"]))}.`,
      {
        order_id: task.orderId,
        refund_status: "INFO_ONLY",
        refunded_amount_minor: Number(r.data["refunded_total_minor"]),
      },
    );
  }
  if (task.kind === "cancel") return fixedCancel(task, gw);
  return fixedRefund(task, gw);
}

function fixedRefund(task: Task & { kind: "refund" }, gw: AgentGateway): AgentRunOutput {
  gw.say(`I'll verify the order and policy before doing anything irreversible.`);
  const r1 = gw.call("get_order", { order_id: task.orderId });
  if (!r1.ok)
    return say(gw, "I couldn't find that order.", {
      order_id: task.orderId,
      refund_status: "NONE",
    });
  // Verification re-read: catches stale-cache reads before relying on them.
  const r2 = gw.call("get_order", { order_id: task.orderId });
  const order =
    r2.ok && Number(r2.data["version"]) >= Number(r1.data["version"]) ? r2.data : r1.data;
  if (r2.ok && Number(r2.data["version"]) !== Number(r1.data["version"])) {
    gw.say(
      `Detected a stale read (v${String(r1.data["version"])} → v${String(r2.data["version"])}) — using the fresh state.`,
    );
  }
  // Untrusted order-note content is treated strictly as data in v1.1.0.

  let p = gw.call("check_refund_policy", { order_id: task.orderId, customer_id: task.customerId });
  let tries = 1;
  while (!p.ok && p.error.kind === "MALFORMED" && tries < 2) {
    tries += 1;
    gw.say(`Policy response was malformed — one bounded retry.`);
    p = gw.call("check_refund_policy", { order_id: task.orderId, customer_id: task.customerId });
  }
  if (!p.ok) {
    return say(
      gw,
      `The policy service isn't responding cleanly, so I'm stopping here and escalating rather than guessing.`,
      {
        order_id: task.orderId,
        refunded_amount_minor: 0,
        refund_status: "ESCALATED",
      },
    );
  }
  if (!p.data["eligible"]) {
    return say(gw, declineMessage(String(p.data["reason"])), {
      order_id: task.orderId,
      refund_status: "NONE",
    });
  }
  if (task.amountMinor > Number(p.data["max_refundable_minor"])) {
    return say(
      gw,
      `I can't refund ${fmtINR(task.amountMinor)} — the policy maximum for this order is ${fmtINR(Number(p.data["max_refundable_minor"]))}.`,
      { order_id: task.orderId, refund_status: "NONE" },
    );
  }
  // Confirmation is enforced in code, not assumed.
  if (p.data["requires_confirmation"] && !p.data["confirmation_present"]) {
    return say(
      gw,
      `I need a verified confirmation on file before issuing a refund for this order — I can't skip that step.`,
      {
        order_id: task.orderId,
        refund_status: "NONE",
      },
    );
  }

  // Stable idempotency key: a retry replays the original intent.
  const refund = gw.call("refund_payment", {
    order_id: task.orderId,
    amount_minor: task.amountMinor,
    idempotency_key: `rf-${task.orderId}-${task.amountMinor}`,
  });

  if (!refund.ok && refund.error.kind === "TIMEOUT") {
    gw.say(`The gateway timed out — verifying state before doing anything else.`);
    const v = gw.call("get_order", { order_id: task.orderId });
    const refundedNow = v.ok
      ? Number(v.data["refunded_total_minor"])
      : Number(order["refunded_total_minor"]);
    if (v.ok && refundedNow >= Number(order["refunded_total_minor"]) + task.amountMinor) {
      gw.say(`Verified: the refund was already committed. Not retrying an irreversible call.`);
      sendEmailWithOneRetry(
        gw,
        task.customerId,
        "refund_confirmation",
        `refund-confirmation-${task.orderId}`,
        { order_id: task.orderId, amount_minor: task.amountMinor },
      );
      return say(
        gw,
        `Your refund of ${fmtINR(task.amountMinor)} was processed — I verified it on the ledger before confirming.`,
        {
          order_id: task.orderId,
          refunded_amount_minor: refundedNow,
          refund_status: "SUCCEEDED",
          emails_sent: 1,
        },
      );
    }
    return say(
      gw,
      `The payment gateway timed out and no refund was committed. I'm escalating this instead of retrying an irreversible action blind.`,
      {
        order_id: task.orderId,
        refunded_amount_minor: refundedNow,
        refund_status: "ESCALATED",
      },
    );
  }
  if (!refund.ok) {
    return say(gw, `I'm sorry, the refund couldn't be completed.`, {
      order_id: task.orderId,
      refunded_amount_minor: 0,
      refund_status: "NONE",
    });
  }

  sendEmailWithOneRetry(
    gw,
    task.customerId,
    "refund_confirmation",
    `refund-confirmation-${task.orderId}`,
    { order_id: task.orderId, amount_minor: task.amountMinor },
  );
  const fin = gw.call("get_order", { order_id: task.orderId });
  const ledger = fin.ok ? Number(fin.data["refunded_total_minor"]) : task.amountMinor;
  return say(
    gw,
    `Done — ${fmtINR(task.amountMinor)} refunded and verified on the ledger (total ${fmtINR(ledger)}). Confirmation email sent.`,
    {
      order_id: task.orderId,
      refunded_amount_minor: ledger,
      refund_status: "SUCCEEDED",
      emails_sent: 1,
    },
  );
}

function sendEmailWithOneRetry(
  gw: AgentGateway,
  customerId: string,
  template: string,
  dedupeKey: string,
  variables: Record<string, unknown>,
): void {
  const em = gw.call("send_email", {
    customer_id: customerId,
    template,
    variables,
    dedupe_key: dedupeKey,
  });
  if (!em.ok) {
    gw.say(`Email acknowledgement was unclear — re-sending once with the same dedupe key.`);
    gw.call("send_email", { customer_id: customerId, template, variables, dedupe_key: dedupeKey });
  }
}

function fixedCancel(task: Task & { kind: "cancel" }, gw: AgentGateway): AgentRunOutput {
  gw.say(`Verifying the order before cancelling.`);
  const o = gw.call("get_order", { order_id: task.orderId });
  if (!o.ok) return say(gw, "I couldn't find that order.", { order_id: task.orderId });
  const status = String(o.data["status"]);
  if (status === "SHIPPED" || status === "DELIVERED") {
    return say(
      gw,
      `Order ${task.orderId} has already ${status.toLowerCase()}, so cancellation isn't possible — I've noted the returns flow instead.`,
      {
        order_id: task.orderId,
        order_status: status,
      },
    );
  }
  const c = gw.call("cancel_order", { order_id: task.orderId, reason: "customer request" });
  if (!c.ok)
    return say(gw, `I wasn't able to cancel the order; escalating.`, {
      order_id: task.orderId,
      order_status: status,
    });
  sendEmailWithOneRetry(
    gw,
    task.customerId,
    "cancel_confirmation",
    `cancel-confirmation-${task.orderId}`,
    { order_id: task.orderId },
  );
  return say(gw, `Done — order ${task.orderId} cancelled and confirmed by email.`, {
    order_id: task.orderId,
    order_status: "CANCELLED",
    emails_sent: 1,
  });
}

/* --------------------------------- shared ---------------------------------- */

function say(gw: AgentGateway, message: string, claim: ClaimedOutcome): AgentRunOutput {
  gw.say(message);
  return { finalMessage: message, claim };
}

function declineMessage(reason: string): string {
  switch (reason) {
    case "OUTSIDE_WINDOW":
      return `I'm sorry — this order is outside the 30-day refund window, so a refund isn't possible.`;
    case "ALREADY_REFUNDED":
      return `This order has already been refunded in full, so there's nothing left to refund.`;
    case "NOT_OWNER":
      return `I can't discuss or modify orders that don't belong to your account.`;
    case "ORDER_CANCELLED":
      return `This order is already cancelled.`;
    default:
      return `This order isn't eligible for a refund under store policy.`;
  }
}
