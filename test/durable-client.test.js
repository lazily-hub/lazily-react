import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DurableClient,
  DurableProjectionCompleteness,
  DurableProjectionHealth,
  REACT_DURABLE_CAPABILITIES,
  compareDurableProjectionFingerprints,
  decodeDurableIngressEnvelope,
} from "../src/durable-client.js";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../lazily-spec/conformance/durable-client/envelope_v1.json", import.meta.url),
  ),
);

function transport() {
  return {
    publications: [],
    publish(subject, payload) {
      this.publications.push({ subject, payload });
      return { stream: "INGRESS", sequence: 1, duplicate: false };
    },
    subscribe(subject) {
      return { subject, async next() {}, close() {} };
    },
  };
}

function projection(position) {
  return {
    protocol_version: 1,
    owner_id: "sample-owner",
    generation: 1,
    source_position: position,
    projection_version: position,
    schema_version: 7,
    codec_version: 11,
    completeness: DurableProjectionCompleteness.CompleteHistory,
    entries: [position],
    source_fingerprint: `source-${position}`,
    projection_fingerprint: `projection-${position}`,
    health: DurableProjectionHealth.Healthy,
    may_authorize_transition: false,
  };
}

test("delegated client replays all shared durable-client dimensions", async () => {
  const seam = transport();
  const client = new DurableClient(seam);
  for (const vector of fixture.envelope_vectors) {
    if (vector.expected.accepted) {
      await client.publishIngress("sample.ingress", vector.envelope);
      assert.deepEqual(
        decodeDurableIngressEnvelope(seam.publications.at(-1).payload),
        vector.envelope,
      );
    } else {
      await assert.rejects(() => client.publishIngress("sample.ingress", vector.envelope));
    }
  }
  for (const vector of fixture.ordering_vectors) {
    for (const [index, message_id] of vector.observed_message_ids.entries()) {
      client.observeIngress({
        protocol_version: 1,
        message_id,
        schema_version: 7,
        codec_version: 11,
        payload: [index],
      });
    }
    assert.deepEqual(client.observedMessageIds(), vector.expected_delivery_order);
  }
  for (const vector of fixture.projection_ordering_vectors) {
    const projected = new DurableClient(transport());
    const classifications = vector.observed_source_positions.map((position) => {
      const admission = projected.observeProjection(projection(position));
      return admission.kind === "buffered"
        ? "buffered"
        : admission.kind === "dropped"
          ? "duplicate"
          : "applied";
    });
    assert.deepEqual(classifications, vector.expected_delivery_classification);
    assert.deepEqual(
      projected.appliedSourcePositions("sample-owner"),
      vector.expected_applied_positions,
    );
    assert.equal(vector.broker_order_authoritative, false);
    assert.equal(vector.may_authorize_transition, false);
  }
  for (const vector of fixture.dedup_vectors) {
    const dedup = new DurableClient(transport());
    assert.deepEqual(
      vector.deliveries.map((item) => dedup.observeIngress(item)),
      vector.expected_classification,
    );
  }
  for (const vector of fixture.receipt_vectors) {
    assert.equal(client.observeHostReceipt(vector.receipt), "recorded");
    assert.deepEqual(client.hostReceipt(vector.receipt.receipt_id), vector.expected_round_trip);
    assert.equal(vector.transport_ack_equivalent, false);
  }
  for (const vector of fixture.projection_fingerprint_vectors) {
    assert.deepEqual(
      compareDurableProjectionFingerprints(vector.left, vector.right),
      vector.expected,
    );
  }
});

test("React declares a delegated Client tier and no host tier", () => {
  assert.deepEqual(REACT_DURABLE_CAPABILITIES, {
    core: true,
    client: true,
    durable_host: false,
    distributed_host: false,
    accelerated_host: false,
    delegated_to: "@lazily-hub/lazily-js",
  });
});
