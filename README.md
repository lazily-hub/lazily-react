# @lazily-hub/lazily-react

React / Preact bindings for [`@lazily-hub/lazily-js`](../lazily-js) — drive React
state from the lazily Cell kernel (`SourceCell` / `FormulaCell`) via
`useSyncExternalStore`. Glitch-free, equality-guarded re-renders.

The whole binding is a thin adapter: a lazily `effect` reads the handle
(registering the dependency edge) and calls React's re-render callback on
invalidation; `useSyncExternalStore` reads the cached value. lazily's pull-based
glitch-free formulas and its deep-equality guards carry straight through to React.

## Install

```bash
npm install @lazily-hub/lazily-react @lazily-hub/lazily-js react
```

**Preact** instead of React: alias `react` → `preact/compat` (the standard
convention). `useSyncExternalStore` is exported by both `react` (≥18) and
`preact/compat` (≥10.16), so no code changes are needed.

```js
// vite.config.js / bundler alias
{ resolve: { alias: { react: "preact/compat" } } }
```

## Usage

```jsx
import { createContext } from "@lazily-hub/lazily-js/reactive";
import { LazilyProvider, useCell, useFormula } from "@lazily-hub/lazily-react";

const ctx = createContext();

function Counter() {
  const [count, setCount] = useCell(0);
  const doubled = useFormula(() => count * 2, [count]);
  return (
    <button onClick={() => setCount((c) => c + 1)}>
      {count} (doubled: {doubled})
    </button>
  );
}

export function App() {
  return <LazilyProvider context={ctx}><Counter /></LazilyProvider>;
}
```

## Hooks

| hook              | Cell kernel construction | lazy? | equality guard? |
|-------------------|--------------------------|-------|-----------------|
| `useCell(initial)`| `ctx.source` (`SourceCell`) | src | yes (on write)  |
| `useFormula(fn, deps)` | `ctx.formula` (`FormulaCell`) | yes | yes        |
| `useLazily(handle)`| any (read-only)         | —     | from handle     |

There is intentionally **no `useSlot` and no `useSignal`**:

- **`useSlot` is deleted** (Cell kernel, #lzcellkernel — design §9.4 step 6, zero
  call sites). The old unguarded `slot`/`computed` is retained in lazily-js only as
  a deprecated alias; the guard is the efficient default (equal recomputes do not
  propagate), so the one derived hook is the guarded `useFormula`.
- **`useSignal` never existed.** The eager construction is now a *driven formula*
  (`ctx.formula(f).drive()`), and a React binding gains nothing from driving it —
  React only renders on invalidation, and `getSnapshot` reads the
  (lazily-recomputed-on-read) formula, so it always sees the fresh value with no
  stale-frame risk. (`useLazily` still *reads* externally-created `SignalHandle`s —
  handed out by the thread-safe / async contexts — lazily-react just doesn't
  create them.)

- **`useCell`** — component-local mutable source (a `SourceCell` via `ctx.source`),
  returns `[value, setValue]` like `useState`. `setValue` accepts a value or
  `(prev) => next`. The cell is disposed on real unmount.
- **`useFormula`** — the default (and only) derived hook: a guarded `FormulaCell`.
  Equal recomputes are suppressed at the lazily level (the subscribe effect never
  runs), so React never re-renders on a no-op recompute.

### The equality guard at the React level

`useSyncExternalStore` uses `Object.is` on the snapshot. With a primitive
recompute that comes back equal, `useFormula` skips the re-render for free. The
guard earns its keep when the compute returns a **fresh object** each invalidation:

- `useFormula(() => ({ n: a % 2 }))`: lazily's deep-equal guard suppresses
  propagation → no re-render, even though the reference changed.

(See `test/hooks.test.js`.)

### Sharing handles across components

`useCell` creates a component-local `SourceCell`. To share state, create the cell
externally and read it with `useLazily`; write it via `ctx.setCell`:

```js
const shared = ctx.source(0);
// in any component: const v = useLazily(shared);
// anywhere: ctx.setCell(shared, v + 1);
```

## How it works

```
React component
  └─ useSyncExternalStore(subscribe, getSnapshot)
       ├─ subscribe  = lazily effect that reads the handle (registers edge) + onChange
       └─ getSnapshot = ctx.get/getCell/getSignal(handle)
```

- lazily effects flush **synchronously** before `setCell`/`batch` returns, matching
  the notify-then-read contract `useSyncExternalStore` expects.
- Snapshot stability (required to avoid React's "getSnapshot should be cached"
  loop) comes for free: lazily caches node values and only changes the reference
  on a real change.
- The bridge skips the initial forced effect run's `onChange` (subscribe should
  notify only future changes); the first run still registers the dependency edge.

The framework-agnostic adapter lives in `src/bridge.js` (`readHandle`,
`createLazilySubscription`) and is unit-tested without React in
`test/bridge.test.js`.

## Node lifetime

`useCell` disposes its `SourceCell` and `useFormula` disposes its `FormulaCell` on
real unmount and on deps-change, via `ctx.disposeCell`/`ctx.disposeSlot` in
`src/lazily-js/src/reactive.js`. Disposal is **strict-mode-safe**: it is deferred
one microtask and cancelled if React 18 dev's simulated remount
(setup → cleanup → setup) re-subscribes the same handle, so the dev double-invoke
never frees a handle that the second setup still uses. `useLazily` is read-only
and does NOT dispose its externally-owned handle (the caller manages its lifetime).

## Develop

```bash
make check   # build (node --check) + node:test
npm test     # node --test test/*.test.js
```

## License

MIT.
