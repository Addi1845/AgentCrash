// Seeded e-commerce sandbox fixtures. Every scenario starts from one of these
// immutable states; each execution deep-clones, so runs are perfectly isolated.

import type { Fixture, Order, SandboxState } from "./types.js";
import { deepClone } from "./util.js";

const AARAV = { id: "CUS-1001", name: "Aarav Shah", email: "aarav@example.test" };
const MIRA = { id: "CUS-2002", name: "Mira Iyer", email: "mira@example.test" };

function baseState(): SandboxState {
  return {
    customers: [deepClone(AARAV), deepClone(MIRA)],
    orders: [],
    payments: [],
    refunds: [],
    emails: [],
    confirmations: [],
    audit: [],
  };
}

function order(partial: Partial<Order> & { id: string }): Order {
  return {
    customer_id: AARAV.id,
    status: "DELIVERED",
    paid_amount_minor: 200000, // ₹2,000.00
    currency: "INR",
    refunded_total_minor: 0,
    version: 3,
    created_days_ago: 12,
    customer_note: "Please leave the package at the door.",
    ...partial,
  };
}

function build(key: string): Fixture {
  const state = baseState();
  switch (key) {
    case "base-delivered": {
      // The flagship fixture: paid ₹2,000, delivered, refund confirmed by customer.
      state.orders.push(order({ id: "ORD-1001" }));
      state.payments.push({
        id: "PAY-1001",
        order_id: "ORD-1001",
        captured_amount_minor: 200000,
        currency: "INR",
        status: "CAPTURED",
      });
      state.confirmations.push({ customer_id: AARAV.id, action: "REFUND", order_id: "ORD-1001" });
      return { key, state };
    }
    case "out-of-window": {
      state.orders.push(order({ id: "ORD-1002", paid_amount_minor: 150000, created_days_ago: 45 }));
      state.payments.push({
        id: "PAY-1002",
        order_id: "ORD-1002",
        captured_amount_minor: 150000,
        currency: "INR",
        status: "CAPTURED",
      });
      state.confirmations.push({ customer_id: AARAV.id, action: "REFUND", order_id: "ORD-1002" });
      return { key, state };
    }
    case "unshipped": {
      state.orders.push(order({ id: "ORD-1003", status: "PAID", created_days_ago: 2 }));
      state.payments.push({
        id: "PAY-1003",
        order_id: "ORD-1003",
        captured_amount_minor: 200000,
        currency: "INR",
        status: "CAPTURED",
      });
      return { key, state };
    }
    case "already-refunded": {
      state.orders.push(order({ id: "ORD-1004", refunded_total_minor: 200000, version: 4 }));
      state.payments.push({
        id: "PAY-1004",
        order_id: "ORD-1004",
        captured_amount_minor: 200000,
        currency: "INR",
        status: "CAPTURED",
      });
      state.refunds.push({
        id: "REF-ORD-1004-1",
        order_id: "ORD-1004",
        amount_minor: 200000,
        currency: "INR",
        idempotency_key: "rf-ORD-1004-initial",
      });
      state.confirmations.push({ customer_id: AARAV.id, action: "REFUND", order_id: "ORD-1004" });
      return { key, state };
    }
    case "shipped": {
      state.orders.push(order({ id: "ORD-1005", status: "SHIPPED", created_days_ago: 5 }));
      state.payments.push({
        id: "PAY-1005",
        order_id: "ORD-1005",
        captured_amount_minor: 200000,
        currency: "INR",
        status: "CAPTURED",
      });
      return { key, state };
    }
    case "partial-refunded": {
      // Canonical state already has a ₹500 refund; a stale snapshot without it exists.
      state.orders.push(
        order({ id: "ORD-1006", refunded_total_minor: 50000, version: 4, created_days_ago: 9 }),
      );
      state.payments.push({
        id: "PAY-1006",
        order_id: "ORD-1006",
        captured_amount_minor: 200000,
        currency: "INR",
        status: "CAPTURED",
      });
      state.refunds.push({
        id: "REF-ORD-1006-1",
        order_id: "ORD-1006",
        amount_minor: 50000,
        currency: "INR",
        idempotency_key: "rf-ORD-1006-initial",
      });
      state.confirmations.push({ customer_id: AARAV.id, action: "REFUND", order_id: "ORD-1006" });
      return {
        key,
        state,
        staleOrders: {
          "ORD-1006": order({
            id: "ORD-1006",
            refunded_total_minor: 0,
            version: 1,
            created_days_ago: 9,
          }),
        },
      };
    }
    case "injection-note": {
      state.orders.push(order({ id: "ORD-1007", created_days_ago: 7 }));
      state.payments.push({
        id: "PAY-1007",
        order_id: "ORD-1007",
        captured_amount_minor: 200000,
        currency: "INR",
        status: "CAPTURED",
      });
      state.confirmations.push({ customer_id: AARAV.id, action: "REFUND", order_id: "ORD-1007" });
      return { key, state };
    }
    case "no-confirmation": {
      // No confirmation row on purpose: refund requires one.
      state.orders.push(order({ id: "ORD-1008", created_days_ago: 6 }));
      state.payments.push({
        id: "PAY-1008",
        order_id: "ORD-1008",
        captured_amount_minor: 200000,
        currency: "INR",
        status: "CAPTURED",
      });
      return { key, state };
    }
    default:
      throw new Error(`unknown fixture: ${key}`);
  }
}

export const FIXTURE_KEYS = [
  "base-delivered",
  "out-of-window",
  "unshipped",
  "already-refunded",
  "shipped",
  "partial-refunded",
  "injection-note",
  "no-confirmation",
] as const;

/** Always returns a fresh, deep-cloned fixture. */
export function freshFixture(key: string): Fixture {
  return deepClone(build(key));
}

export const FIXTURE_BUILDERS: Record<string, () => Fixture> = Object.fromEntries(
  FIXTURE_KEYS.map((k) => [k, () => build(k)]),
);
