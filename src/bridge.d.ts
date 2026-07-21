import type {
  Context,
  SourceCell,
  FormulaCell,
  SignalHandle,
} from "@lazily-hub/lazily-js/reactive";

/** Any lazily source/derived handle (Cell kernel). */
export type LazilyHandle<T = unknown> =
  | SourceCell<T>
  | FormulaCell<T>
  | SignalHandle<T>;

/**
 * Read any lazily handle from `ctx`, dispatching on handle class. Inside a
 * tracked computation the read also registers the dependency edge.
 */
export declare function readHandle<T>(
  ctx: Context,
  handle: LazilyHandle<T>,
): T;

/**
 * Subscribe an `onChange` callback to a lazily handle. Returns an unsubscribe
 * that disposes the underlying effect. Equality-guard semantics come from the
 * handle (a guarded `formula` suppresses equal recomputes; the deprecated
 * unguarded `slot`/`computed` always propagate).
 */
export declare function createLazilySubscription(
  ctx: Context,
  handle: LazilyHandle,
  onChange: () => void,
): () => void;
