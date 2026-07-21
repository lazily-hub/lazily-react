// Public entry point for @lazily-hub/lazily-react.
//
// React/Preact bindings for the lazily reactive core. Import from `react`
// resolves to `preact/compat` when the consumer aliases it (standard convention).

export {
  LazilyProvider,
  useLazilyContext,
  useLazily,
  useSource,
  useComputed,
} from "./hooks.js";

export { readHandle, createLazilySubscription } from "./bridge.js";
