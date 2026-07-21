// Bridge contract tests — framework-agnostic. These pin the lazily →
// useSyncExternalStore contract without React, exercising the equality-guard
// distinction between a guarded `formula` (suppresses equal recomputes) and the
// deprecated unguarded `slot` (always propagates), plus a driven formula (the
// eager construction that retired `Signal`). Each test mirrors a lazily property.
//
// `createLazilySubscription` registers the dependency edge on its initial forced
// run but does NOT call onChange then (store contract: subscribe notifies only
// future changes). So call counts below are zero immediately after subscribing.

import assert from "node:assert/strict";
import test from "node:test";

import { Context } from "@lazily-hub/lazily-js/reactive";
import { createLazilySubscription, readHandle } from "../src/bridge.js";

test("subscribe: onChange fires exactly once per dependent cell write", () => {
  const ctx = new Context();
  const a = ctx.source(1);
  const calls = [];
  const unsub = createLazilySubscription(ctx, a, () => calls.push("change"));

  ctx.setCell(a, 2);
  assert.deepEqual(calls, ["change"]);
  assert.equal(readHandle(ctx, a), 2, "getSnapshot reflects the new value");

  unsub();
  ctx.setCell(a, 3);
  assert.deepEqual(calls, ["change"], "unsubscribe stops further notifications");
  assert.equal(readHandle(ctx, a), 3);
});

test("subscribe: equal cell write does not fire (cell deep-PartialEq guard)", () => {
  const ctx = new Context();
  const a = ctx.source(1);
  let calls = 0;
  createLazilySubscription(ctx, a, () => calls++);

  ctx.setCell(a, 1); // equal — no-op at the cell
  assert.equal(calls, 0);
});

test("subscribe: structurally-equal OBJECT write is a no-op (deep equality)", () => {
  const ctx = new Context();
  const a = ctx.source({ x: 1 });
  const before = readHandle(ctx, a);
  let calls = 0;
  createLazilySubscription(ctx, a, () => calls++);

  ctx.setCell(a, { x: 1 }); // new ref but structurally equal → cell guard no-ops
  assert.equal(calls, 0);
  assert.equal(readHandle(ctx, a), before, "same reference preserved");
});

test("subscribe: guarded formula suppresses onChange on structurally-equal recompute; unguarded slot propagates", () => {
  const ctx = new Context();
  const a = ctx.source(1);
  // Fresh object each recompute. The guarded `formula` sees { n: 1 } === { n: 1 }
  // (deep-equality) and suppresses; the deprecated unguarded `slot` has no guard,
  // so it always propagates.
  const m = ctx.formula(() => ({ n: ctx.getCell(a) % 2 }));
  const s = ctx.slot(() => ({ n: ctx.getCell(a) % 2 }));

  readHandle(ctx, m); // materialize
  readHandle(ctx, s);

  let formulaCalls = 0;
  let slotCalls = 0;
  createLazilySubscription(ctx, m, () => formulaCalls++);
  createLazilySubscription(ctx, s, () => slotCalls++);

  ctx.setCell(a, 3); // 3 % 2 === 1, structurally equal to prior { n: 1 }
  assert.equal(formulaCalls, 0, "guarded formula must suppress onChange on equal recompute");
  assert.equal(slotCalls, 1, "unguarded slot propagates on every invalidation");
});

test("subscribe: guarded formula fires when recompute yields a structurally-different value", () => {
  const ctx = new Context();
  const a = ctx.source(1);
  const m = ctx.formula(() => ({ n: ctx.getCell(a) % 2 }));
  readHandle(ctx, m);
  let calls = 0;
  createLazilySubscription(ctx, m, () => calls++);

  ctx.setCell(a, 2); // 2 % 2 === 0, different from prior { n: 1 }
  assert.equal(calls, 1);
  assert.equal(readHandle(ctx, m).n, 0);
});

test("subscribe: works for a driven formula (eager construction, retires Signal)", () => {
  const ctx = new Context();
  const a = ctx.source(10);
  // `.drive()` attaches a puller Effect that keeps the formula materialized — the
  // eager construction that replaced `ctx.signal`. It is still a FormulaCell, read
  // through the `ctx.get` branch of readHandle.
  const driven = ctx.formula(() => ctx.getCell(a) * 10).drive();
  assert.equal(readHandle(ctx, driven), 100, "driven formula materializes immediately");

  let calls = 0;
  createLazilySubscription(ctx, driven, () => calls++);
  ctx.setCell(a, 3);
  assert.equal(calls, 1);
  assert.equal(readHandle(ctx, driven), 30);
});

test("subscribe: batched writes coalesce into one notification", () => {
  const ctx = new Context();
  const a = ctx.source(1);
  const b = ctx.source(10);
  const sum = ctx.formula(() => ctx.getCell(a) + ctx.getCell(b));
  readHandle(ctx, sum);
  let calls = 0;
  createLazilySubscription(ctx, sum, () => calls++);

  ctx.batch(() => {
    ctx.setCell(a, 2);
    ctx.setCell(b, 20);
  });
  assert.equal(calls, 1, "two batched writes → one coalesced notification");
  assert.equal(readHandle(ctx, sum), 22);
});

test("getSnapshot stability: equal write keeps the reference; real change yields a new one", () => {
  const ctx = new Context();
  const a = ctx.source({ x: 1 });
  const snap1 = readHandle(ctx, a);
  const snap2 = readHandle(ctx, a);
  assert.equal(snap1, snap2, "identical reference while unchanged");

  ctx.setCell(a, { x: 1 }); // structurally equal → deep guard no-op → same ref
  assert.equal(readHandle(ctx, a), snap1, "structural-equal write keeps the reference");

  ctx.setCell(a, { x: 2 }); // different → new reference
  assert.notEqual(readHandle(ctx, a), snap1, "real change yields a new reference");
});
