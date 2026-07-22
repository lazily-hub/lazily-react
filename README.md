# @lazily-hub/lazily-react

React / Preact bindings for [`@lazily-hub/lazily-js`](../lazily-js) — drive React
state from the lazily Cell kernel (`Source` / `Computed`) via
`useSyncExternalStore`. Glitch-free, equality-guarded re-renders.

The whole binding is a thin adapter: a lazily `effect` reads the handle
(registering the dependency edge) and calls React's re-render callback on
invalidation; `useSyncExternalStore` reads the cached value. lazily's pull-based
glitch-free computeds and its deep-equality guards carry straight through to React.

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
import { LazilyProvider, useSource, useComputed } from "@lazily-hub/lazily-react";

const ctx = createContext();

function Counter() {
  const [count, setCount] = useSource(0);
  const doubled = useComputed(() => count * 2, [count]);
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
| `useSource(initial)`| `ctx.source` (`Source`) | src | yes (on write)  |
| `useComputed(fn, deps)` | `ctx.computed` (`Computed`) | yes | yes        |
| `useLazily(handle)`| any (read-only)         | —     | from handle     |

There is intentionally **no `useSlot` and no `useSignal`**:

- **`useSlot` is deleted** (Cell kernel, #lzcellkernel — design §9.4 step 6, zero
  call sites). Under the Cell kernel v2 every computed is guarded — there is no
  unguarded derived construction (`slot` survives in lazily-js only as a deprecated
  alias of the guarded `computed`). Equal recomputes do not propagate, so the one
  derived hook is the guarded `useComputed`.
- **`useSignal` never existed.** The eager construction is now `ctx.computed(f).eager()`,
  and a React binding gains nothing from making it eager —
  React only renders on invalidation, and `getSnapshot` reads the
  (lazily-recomputed-on-read) computed, so it always sees the fresh value with no
stale-frame risk. `useLazily` reads externally-created `Source` and `Computed`
handles without creating an eager wrapper.

- **`useSource`** — component-local mutable source (a `Source` via `ctx.source`),
  returns `[value, setValue]` like `useState`. `setValue` accepts a value or
  `(prev) => next`. The source is disposed on real unmount.
- **`useComputed`** — the default (and only) derived hook: a guarded `Computed`.
  Equal recomputes are suppressed at the lazily level (the subscribe effect never
  runs), so React never re-renders on a no-op recompute.

### The equality guard at the React level

`useSyncExternalStore` uses `Object.is` on the snapshot. With a primitive
recompute that comes back equal, `useComputed` skips the re-render for free. The
guard earns its keep when the compute returns a **fresh object** each invalidation:

- `useComputed(() => ({ n: a % 2 }))`: lazily's deep-equal guard suppresses
  propagation → no re-render, even though the reference changed.

(See `test/hooks.test.js`.)

### Sharing handles across components

`useSource` creates a component-local `Source`. To share state, create the source
externally and read it with `useLazily`; write it via `ctx.set`:

```js
const shared = ctx.source(0);
// in any component: const v = useLazily(shared);
// anywhere: ctx.set(shared, v + 1);
```

## How it works

```
React component
  └─ useSyncExternalStore(subscribe, getSnapshot)
       ├─ subscribe  = lazily effect that reads the handle (registers edge) + onChange
└─ getSnapshot = ctx.get(handle)
```

- lazily effects flush **synchronously** before `set`/`batch` returns, matching
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

`useSource` disposes its `Source` and `useComputed` disposes its `Computed` on
real unmount and on deps-change via each handle's canonical `dispose()` method.
Disposal is **strict-mode-safe**: it is deferred
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
