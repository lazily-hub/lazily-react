export {
  DURABLE_CAPABILITIES,
  DURABLE_PROTOCOL_VERSION,
  DurableClient,
  DurableHostOutcome,
  DurableProjectionCompleteness,
  DurableProjectionHealth,
  compareDurableProjectionFingerprints,
  decodeDurableIngressEnvelope,
  durableIngressEnvelope,
  encodeDurableIngressEnvelope,
} from "@lazily-hub/lazily-js/durable-client";
export type {
  DurableBrokerPubAck,
  DurableCapabilities,
  DurableHostReceipt,
  DurableIngressEnvelope,
  DurableNATSTransport,
  DurableProjectionEvent,
  DurableProjectionFingerprint,
  DurableProjectionFingerprintComparison,
  DurableSubscription,
} from "@lazily-hub/lazily-js/durable-client";

export const REACT_DURABLE_CAPABILITIES: Readonly<{
  core: true;
  client: true;
  durable_host: false;
  distributed_host: false;
  accelerated_host: false;
  delegated_to: "@lazily-hub/lazily-js";
}>;
