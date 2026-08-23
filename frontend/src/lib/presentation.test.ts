import { describe, expect, it } from "vitest";
import { toScenario, toTrace } from "./presentation";
import type { ScenarioDef } from "./domain";

describe("backend presentation adapters", () => {
  it("maps immutable scenarios without changing their contract", () => {
    const definition: ScenarioDef = {
      stable_key: "system-timeout-after-commit",
      sort: 10,
      title: "Timeout after commit",
      category: "SYSTEM_FAILURE",
      description: "Lost gateway response",
      prompt: "Refund",
      expected_summary: "Verify before retry",
      risk: "CRITICAL",
      weight: 8,
      chaos: { rules: [{ phase: "AFTER_COMMIT", fault: { type: "TIMEOUT" } }] },
    };
    expect(toScenario(definition)).toMatchObject({
      stableKey: definition.stable_key,
      category: "System Failures",
      chaos: "success_then_timeout",
      weight: 8,
    });
  });

  it("maps backend fault events to injected trace rows", () => {
    expect(
      toTrace({ seq: 1, type: "FAULT_INJECTED", t_ms: 100, message: "timeout" }),
    ).toMatchObject({
      kind: "inject",
      label: "timeout",
    });
  });
});
