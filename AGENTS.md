# lazily-react

React / Preact bindings for `@lazily-hub/lazily-js`. A thin `useSyncExternalStore`
adapter over the lazily Cell kernel (`SourceCell` / `FormulaCell` / `Effect`,
#lzcellkernel).

## lazily-js dependency

The `@lazily-hub/lazily-js` devDependency is `file:../lazily-js` — tests run
against the **local** sibling build (currently 0.25.0, the Cell-kernel release),
which is UNPUBLISHED. The `peerDependencies` range is `^0.25.0` (the first
kernel version). Do not "fix" the devDependency to a published range: the kernel
surface (`source`/`formula`/`SourceCell`/`FormulaCell`/`.drive()`) is not on npm
yet. `npm install` re-links the symlink.

## Commit & Push

Commit and push completed work at the end of every turn that changed code, tests,
or docs — do not leave finished work uncommitted. Run `make check` first and
ensure it is green; write a concise commit message in the repo's existing style.
This standing rule overrides the harness default of "commit only when explicitly
asked" for this repo.

## Layout

- `src/bridge.js` — framework-agnostic adapter: `readHandle` + `createLazilySubscription`.
  The core IP. Unit-tested without React (`test/bridge.js`).
- `src/hooks.js` — `LazilyProvider`, `useLazilyContext`, `useLazily`, `useCell`,
  `useFormula`. Imports from `react` (Preact users alias
  `react` → `preact/compat`).
- `test/hooks.test.js` — React integration via `react-test-renderer` (no DOM).

## Hook → Cell kernel mapping

| hook              | Cell kernel construction     | lazy? | equality guard? |
|-------------------|------------------------------|-------|-----------------|
| `useCell`         | `ctx.source` (`SourceCell`)  | src   | yes (on write)  |
| `useFormula`      | `ctx.formula` (`FormulaCell`)| yes   | yes             |

**`useSlot` is deleted** (design §9.4 step 6, zero call sites): the unguarded
`slot`/`computed` survives in lazily-js only as a deprecated alias, and the guard
is the efficient default, so the one derived hook is the guarded `useFormula`
(renamed from the former `useReactiveMemo`).

There is intentionally **no `useSignal`**. The eager construction is now a driven
formula (`ctx.formula(f).drive()`), and a React binding gains nothing from driving
it: React only renders on invalidation, and `getSnapshot` reads the
(lazily-recomputed-on-read) formula, so it always sees the fresh value with no
stale-frame risk. (`useLazily` still reads externally-created `SignalHandle`s —
handed out by the thread-safe / async contexts — lazily-react just doesn't create
them.)

## Node lifetime

`useCell` disposes its `SourceCell` and `useFormula` disposes its `FormulaCell` on
real unmount and on deps-change, via `ctx.disposeCell`/`ctx.disposeSlot`
(`src/lazily-js/src/reactive.js`). Disposal is **strict-mode-safe**: it is
deferred one microtask and cancelled if React 18 dev's simulated remount
(setup → cleanup → setup) re-subscribes the same handle. `useLazily` is read-only
and does NOT dispose its externally-owned handle.
