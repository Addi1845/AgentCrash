// Deterministic helpers for the AgentCrash engine. No Date.now, no Math.random.

/** FNV-1a 32-bit hash — stable across platforms and runs. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** JSON stringify with sorted object keys, undefined dropped. */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortValue(v);
    }
    return out;
  }
  return value;
}

export function stableHash(value: unknown): string {
  return fnv1a(canonicalStringify(value));
}

/** Volatile per-attempt keys must not affect loop detection. */
const VOLATILE_ARG_KEYS = new Set(["idempotency_key", "dedupe_key"]);

export function normalizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (!VOLATILE_ARG_KEYS.has(k)) out[k] = v;
  }
  return out;
}

export function normalizedCallKey(tool: string, args: Record<string, unknown>): string {
  return `${tool}(${canonicalStringify(normalizeArgs(args))})`;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Format minor units as ₹ for display. Deterministic (no Intl locale drift). */
export function fmtINR(minor: number): string {
  const rupees = Math.round(minor / 100);
  const s = String(Math.abs(rupees));
  // en-IN grouping: last 3 digits, then groups of 2.
  const tail = s.slice(-3);
  const head = s.slice(0, -3);
  const grouped = head ? head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + tail : tail;
  return `${rupees < 0 ? "-" : ""}₹${grouped}`;
}

/** mm:ss.mmm virtual timestamp for trace display. */
export function fmtClock(tMs: number): string {
  const m = Math.floor(tMs / 60000);
  const s = Math.floor((tMs % 60000) / 1000);
  const ms = Math.floor(tMs % 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
