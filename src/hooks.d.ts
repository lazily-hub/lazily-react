import type { ReactNode, ReactElement } from "react";
import type { Context, SourceCell, FormulaCell, SignalHandle } from "@lazily-hub/lazily-js/reactive";
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
 * Component-local mutable source (a lazily `SourceCell`), like `useState`.
 * Returns `[value, setValue]`. `setValue` accepts a value or an updater
 * `(prev) => next`. The cell is disposed on real unmount (strict-mode-safe).
 */
export declare function useCell<T>(
  initial: T | (() => T),
): [T, (next: T | ((prev: T) => T)) => void];

/**
 * Lazy derived value backed by a guarded `FormulaCell` (`ctx.formula`). Equal
 * recomputes suppress the re-render — the default (and only) derived hook under
 * the Cell kernel. Replaces the old `useReactiveMemo`; the unguarded `useSlot` is
 * deleted.
 */
export declare function useFormula<T>(compute: () => T, deps?: unknown[]): T;

// Re-export lazily handle types for consumers.
export type { SourceCell, FormulaCell, SignalHandle } from "@lazily-hub/lazily-js/reactive";
