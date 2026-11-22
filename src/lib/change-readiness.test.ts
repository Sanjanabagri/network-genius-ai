import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessChangeReadiness } from "./change-readiness";

const completeChange = {
  title: "Upgrade edge routing policy",
  description: "Improve route convergence for the branch network.",
  devices: "EDGE-01, EDGE-02",
  plan: [
    "Pre-checks: capture current BGP status",
    "Implementation steps: apply the reviewed policy",
    "Post-checks: verify routes and adjacency",
    "Rollback: restore the previous policy",
  ].join("\n"),
  risk: "high",
  scheduledFor: "2026-11-23T02:00:00.000Z",
  inventoryHostnames: ["EDGE-01", "EDGE-02", "CORE-01"],
};

describe("assessChangeReadiness", () => {
  it("marks a complete high-risk request ready when its targets match inventory", () => {
    const result = assessChangeReadiness(completeChange);

    assert.equal(result.ready, true);
    assert.equal(result.readyCount, 7);
    assert.equal(result.percentage, 100);
    assert.equal(result.checks.find((check) => check.id === "target-devices")?.detail, "Inventory match: EDGE-01, EDGE-02.");
  });

  it("requires an exact inventory hostname instead of a partial or unknown match", () => {
    const result = assessChangeReadiness({ ...completeChange, devices: "EDGE-010", inventoryHostnames: ["EDGE-01"] });
    const targetCheck = result.checks.find((check) => check.id === "target-devices");

    assert.equal(targetCheck?.ready, false);
  });

  it("flags a high-risk request without a scheduled maintenance window", () => {
    const result = assessChangeReadiness({ ...completeChange, scheduledFor: "" });
    const scheduleCheck = result.checks.find((check) => check.id === "maintenance-window");

    assert.equal(scheduleCheck?.ready, false);
    assert.equal(result.ready, false);
  });

  it("does not require a maintenance window for medium-risk requests", () => {
    const result = assessChangeReadiness({ ...completeChange, risk: "medium", scheduledFor: "" });
    const scheduleCheck = result.checks.find((check) => check.id === "maintenance-window");

    assert.equal(scheduleCheck?.ready, true);
    assert.equal(scheduleCheck?.detail, "Not required for this risk level.");
  });
});