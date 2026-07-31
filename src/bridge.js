// Framework-agnostic adapter between a lazily reactive graph and the
// `useSyncExternalStore` contract shared by React 18+ and Preact's `preact/compat`.
//
// lazily (see @lazily-hub/lazily-js `reactive.js`) exposes the Cell kernel
// (#lzcellkernel) v2: bare-kind handles over two value kinds —
//   - Source   (written from outside: `source(v)` / `source(v, policy)`)
//   - Computed (computed from upstream: `computed(f)`, guarded always;
//               `computed(f).eager()` makes it eager — the retired `Signal`)
// plus the value-less `Effect` sink.
//
// `useSyncExternalStore(subscribe, getSnapshot)` needs two things:
//   - subscribe(onChange): register interest, return an unsubscribe.
//   - getSnapshot(): read the current value. Must be referentially stable across
//     calls while the value is unchanged (else React loops "getSnapshot should be
//     cached"). lazily caches node values and only changes reference on a real
//     change, so this holds by construction for every kind.
//
// The bridge registers a lazily `effect` whose body reads the handle (which
// auto-registers the dependency edge) and then calls `onChange`. lazily flushes
// effects synchronously before `set`/`batch` returns, matching the
// notify-then-read contract `useSyncExternalStore` expects.

/**
 * Read a lazily handle of any kind from `ctx`, dispatching on handle class.
 *
 * - `Source`       → `ctx.get`
 * - `Computed`     → `ctx.get` (covers `computed` and its `.eager()` eager form,
 *   plus the deprecated `slot` alias, which is now the same guarded computed)
 *
 * Inside a tracked computation (an `effect`/`computed` body) the read also
 * registers the dependency edge; outside one it is a plain read.
 *
 * @template T
 * @param {import("@lazily-hub/lazily-js/reactive").ComputeOps} ctx
 * @param {import("@lazily-hub/lazily-js/reactive").Source<T> | import("@lazily-hub/lazily-js/reactive").Computed<T>} handle
 * @returns {T}
 */
export function readHandle(ctx, handle) {
  return ctx.get(handle);
}

/**
 * Subscribe a React/Preact `onChange` callback to a lazily handle.
 *
 * Creates a lazily effect that (a) reads the handle — registering the dependency
 * edge — and (b) calls `onChange` whenever the handle's value invalidates. lazily
 * effects flush synchronously on write, so `onChange` fires before the mutating
 * `set`/`batch` returns.
 *
 * Equality-guard semantics come from the handle itself. Under the Cell kernel v2
 * every cell is guarded: a `Source` suppresses an equal write, and a `Computed`
 * whose recompute yields an equal value suppresses the effect run entirely (see
 * `recomputeSlotNow` → `effectShouldRun` in lazily's `reactive.js`), so `onChange`
 * is NOT called and React does not re-render.
 *
 * @param {import("@lazily-hub/lazily-js/reactive").Context} ctx
 * @param {import("@lazily-hub/lazily-js/reactive").Source | import("@lazily-hub/lazily-js/reactive").Computed} handle
 * @param {() => void} onChange React's re-render trigger from `useSyncExternalStore`.
 * @returns {() => void} unsubscribe — disposes the underlying effect (tears down
 *   the dependency edge and removes it from the effect queue).
 */
export function createLazilySubscription(ctx, handle, onChange) {
  // lazily effects force-run once on creation (#lzjseffort) — that first run is
  // what registers the dependency edge. The store contract (subscribe) should not
  // fire `onChange` during subscription itself, so the first invocation registers
  // the edge and materializes the value but skips the notification; React reads
  // the initial value via getSnapshot separately.
  let initialized = false;
  const eff = ctx.effect((compute) => {
    readHandle(compute, handle); // always: register dependency edge + read current value
    if (initialized) onChange();
    initialized = true;
    return null;
  });
  return () => eff.dispose();
}
