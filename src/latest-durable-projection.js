import { useLazily } from "./hooks.js";

/** Subscribe to the complete latest-durable projection snapshot. */
export function useLatestDurableSnapshot(projection) {
  return useLazily(projection.snapshotState);
}

/** Subscribe to the latest-durable state for one key. */
export function useLatestDurableEntry(projection, key) {
  return useLazily(projection.entryState(key));
}

/** Subscribe to the current actor generation fence. */
export function useLatestDurableGeneration(projection) {
  return useLazily(projection.generationState);
}
