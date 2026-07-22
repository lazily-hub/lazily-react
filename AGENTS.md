# lazily-react

React / Preact bindings for `@lazily-hub/lazily-js`. A thin `useSyncExternalStore`
adapter over the lazily Cell kernel v2 (`Source` / `Computed` / `Effect`,
#lzcellkernel).

## lazily-js dependency

The `@lazily-hub/lazily-js` devDependency is `file:../lazily-js` — tests run
against the local sibling build (currently 0.27.0). The peer dependency starts
at `^0.27.0`, the source-first async API release. Keep the devDependency local so
binding tests exercise the sibling checkout; `npm install` re-links the symlink.

## Commit & Push

Commit and push completed work at the end of every turn that changed code, tests,
or docs — do not leave finished work uncommitted. Run `make check` first and
ensure it is green; write a concise commit message in the repo's existing style.
This standing rule overrides the harness default of "commit only when explicitly
asked" for this repo.

## Layout

- `src/bridge.js` — framework-agnostic adapter: `readHandle` + `createLazilySubscription`.
  The core IP. Unit-tested without React (`test/bridge.js`).
- `src/hooks.js` — `LazilyProvider`, `useLazilyContext`, `useLazily`, `useSource`,
  `useComputed`. Imports from `react` (Preact users alias
  `react` → `preact/compat`).
- `test/hooks.test.js` — React integration via `react-test-renderer` (no DOM).

## Hook → Cell kernel mapping

| hook              | Cell kernel construction     | lazy? | equality guard? |
|-------------------|------------------------------|-------|-----------------|
| `useSource`       | `ctx.source` (`Source`)      | src   | yes (on write)  |
| `useComputed`     | `ctx.computed` (`Computed`)  | yes   | yes             |

**`useSlot` is deleted** (design §9.4 step 6, zero call sites): under the Cell
kernel v2 every computed is guarded — `slot` survives in lazily-js only as a
deprecated alias of the guarded `computed`, so the one derived hook is the guarded
`useComputed` (renamed from the former `useFormula` / `useReactiveMemo`).

There is intentionally **no `useSignal`**. The eager construction is now
`ctx.computed(f).eager()`, and a React binding gains nothing from making it eager:
React only renders on invalidation, and `getSnapshot` reads the
(lazily-recomputed-on-read) computed, so it always sees the fresh value with no
stale-frame risk. `useLazily` reads externally-created `Source` and `Computed`
handles without creating an eager wrapper.

## Node lifetime

`useSource` disposes its `Source` and `useComputed` disposes its `Computed` on
real unmount and on deps-change via each handle's canonical `dispose()` method.
Disposal is **strict-mode-safe**: it is
deferred one microtask and cancelled if React 18 dev's simulated remount
(setup → cleanup → setup) re-subscribes the same handle. `useLazily` is read-only
and does NOT dispose its externally-owned handle.
