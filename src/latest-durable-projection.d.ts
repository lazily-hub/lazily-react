import type {
  LatestDurableEntryView,
  LatestDurableProjection,
  LatestDurableSnapshot,
} from "@lazily-hub/lazily-js/latest-durable-projection";

export declare function useLatestDurableSnapshot<K, V>(
  projection: LatestDurableProjection<K, V>,
): LatestDurableSnapshot<K, V>;

export declare function useLatestDurableEntry<K, V>(
  projection: LatestDurableProjection<K, V>,
  key: K,
): LatestDurableEntryView<K, V> | null;

export declare function useLatestDurableGeneration<K, V>(
  projection: LatestDurableProjection<K, V>,
): number;
