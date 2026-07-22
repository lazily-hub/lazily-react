import type { ReactNode, ReactElement } from "react";
import type { Context, Source, Computed } from "@lazily-hub/lazily-js/reactive";
import type { LazilyHandle } from "./bridge.js";

/** Provide a lazily reactive `Context` to the tree. */
export declare function LazilyProvider(props: {
  context: Context;
  children: ReactNode;
}): ReactElement;

/** Read the lazily `Context` from the nearest `LazilyProvider`. Throws if missing. */
export declare function useLazilyContext(): Context;

/**
 * Subscribe (read-only) to an externally-created lazily handle of any kind.
 * Does NOT dispose the handle on unmount (caller owns its lifetime).
 */
export declare function useLazily<T>(handle: LazilyHandle<T>): T;

/**
 * Component-local mutable source (a lazily `Source`), like `useState`.
 * Returns `[value, setValue]`. `setValue` accepts a value or an updater
 * `(prev) => next`. The source is disposed on real unmount (strict-mode-safe).
 */
export declare function useSource<T>(
  initial: T | (() => T),
): [T, (next: T | ((prev: T) => T)) => void];

/**
 * Lazy derived value backed by a guarded `Computed` (`ctx.computed`). Equal
 * recomputes suppress the re-render — the default (and only) derived hook under
 * the Cell kernel. The unguarded `useSlot` is deleted.
 */
export declare function useComputed<T>(
  compute: (compute: import("@lazily-hub/lazily-js/reactive").Compute) => T,
  deps?: unknown[],
): T;

// Re-export lazily handle types for consumers.
export type { Source, Computed } from "@lazily-hub/lazily-js/reactive";
