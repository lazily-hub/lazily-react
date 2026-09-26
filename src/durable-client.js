// React does not implement a second durable protocol stack. It exposes the
// lazily-js Client adapter unchanged so React/Preact applications can inject
// their NATS-compatible transport without gaining durable-host authority.
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

export const REACT_DURABLE_CAPABILITIES = Object.freeze({
  core: true,
  client: true,
  durable_host: false,
  distributed_host: false,
  accelerated_host: false,
  delegated_to: "@lazily-hub/lazily-js",
});
