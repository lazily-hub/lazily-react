import type {
  Context,
  Source,
  Computed,
  SignalHandle,
} from "@lazily-hub/lazily-js/reactive";

/** Any lazily source/derived handle (Cell kernel v2). */
export type LazilyHandle<T = unknown> =
  | Source<T>
  | Computed<T>
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
 * handle: under the Cell kernel v2 every cell is guarded, so a `Computed` whose
 * recompute yields an equal value — like a `Source` written an equal value —
 * suppresses the notification.
 */
export declare function createLazilySubscription(
  ctx: Context,
  handle: LazilyHandle,
  onChange: () => void,
): () => void;
