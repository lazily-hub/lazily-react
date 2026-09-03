import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import React from "react";
import TestRenderer from "react-test-renderer";
import { Context } from "@lazily-hub/lazily-js/reactive";
import { LatestDurableProjection } from "@lazily-hub/lazily-js/latest-durable-projection";
import { LazilyProvider } from "../src/hooks.js";
import {
  useLatestDurableEntry,
  useLatestDurableGeneration,
  useLatestDurableSnapshot,
} from "../src/latest-durable-projection.js";

const { createElement: h } = React;
const { act } = TestRenderer;
const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(
    join(
      here,
      "..",
      "..",
      "lazily-spec",
      "conformance",
      "egress",
      "latest_durable_projection.json",
    ),
    "utf8",
  ),
);

function runOperation(projection, operation) {
  switch (operation.type) {
    case "upsert_desired":
      return projection.upsertDesired(operation.key, operation.epoch, operation.value);
    case "claim":
      return projection.claim(operation.key, operation.generation);
    case "ack_applied":
      return projection.ackApplied(operation.key, operation.generation, operation.epoch);
    case "fail_retryable":
      return projection.failRetryable(operation.key, operation.generation, operation.epoch);
    case "reconnect":
      return projection.reconnect(operation.generation);
    default:
      throw new Error(`unknown latest-durable operation ${operation.type}`);
  }
}

function wireOutcome(operation, outcome) {
  const kindKey = {
    upsert_desired: "upsert",
    claim: "claim",
    ack_applied: "ack",
    fail_retryable: "failure",
    reconnect: "reconnect",
  }[operation.type];
  const result = { [kindKey]: outcome.kind };
  if (outcome.envelope !== undefined) result.envelope = outcome.envelope;
  if (outcome.current !== undefined) result.current = outcome.current;
  if (outcome.durableThrough !== undefined) result.durable_through = outcome.durableThrough;
  if (outcome.generation !== undefined) result.generation = outcome.generation;
  if (outcome.requeued !== undefined) result.requeued = outcome.requeued;
  if (outcome.superseded !== undefined) result.superseded = outcome.superseded;
  return result;
}

function wireSnapshot(snapshot) {
  return {
    generation: snapshot.generation,
    entries: snapshot.entries.map((entry) => ({
      key: entry.key,
      desired: entry.desired,
      inflight: entry.inflight,
      durable_through: entry.durableThrough,
    })),
  };
}

test("React snapshot hook replays canonical latest-durable conformance", async () => {
  let steps = 0;
  for (const scenario of fixture.scenarios) {
    const ctx = new Context();
    const projection = new LatestDurableProjection(ctx, scenario.generation);
    let observed;
    function View() {
      observed = useLatestDurableSnapshot(projection);
      return null;
    }
    const renderer = TestRenderer.create(h(LazilyProvider, { context: ctx }, h(View)));

    for (const step of scenario.steps) {
      let outcome;
      await act(async () => {
        outcome = runOperation(projection, step.op);
      });
      assert.deepEqual(wireOutcome(step.op, outcome), step.returns, `${scenario.id}: outcome`);
      assert.deepEqual(wireSnapshot(observed), step.expected, `${scenario.id}: React snapshot`);
      steps += 1;
    }
    renderer.unmount();
  }
  assert.ok(steps > 0);
});

test("entry and generation hooks select reactive latest-durable readers", async () => {
  const ctx = new Context();
  const projection = new LatestDurableProjection(ctx, 4);
  let entry;
  let generation;
  function View() {
    entry = useLatestDurableEntry(projection, "doc");
    generation = useLatestDurableGeneration(projection);
    return null;
  }
  const renderer = TestRenderer.create(h(LazilyProvider, { context: ctx }, h(View)));
  assert.equal(entry, null);
  assert.equal(generation, 4);

  await act(async () => projection.upsertDesired("doc", 1, "A"));
  assert.deepEqual(entry.desired, { epoch: 1, value: "A" });
  await act(async () => projection.reconnect(5));
  assert.equal(generation, 5);
  renderer.unmount();
});
