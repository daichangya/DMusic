/**
 * @author dmusic-test
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeSnapshotWithOverlay } = require("../scripts/merge-catalog.cjs");

const base = {
  catalogVersion: 1,
  entries: [
    { stableId: "musicfree:a", name: "A", enabled: true, adapterStatus: "pending" },
    { stableId: "musicfree:b", name: "B", enabled: true, adapterStatus: "pending" },
  ],
};

test("无 overlay 时保持原样", () => {
  const m = mergeSnapshotWithOverlay(base, {});
  assert.deepEqual(m.entries, base.entries);
});

test("按 stableId 覆盖 enabled", () => {
  const m = mergeSnapshotWithOverlay(base, { byStableId: { "musicfree:a": { enabled: false } } });
  assert.equal(m.entries[0].enabled, false);
  assert.equal(m.entries[1].enabled, true);
});

test("未知 stableId 忽略", () => {
  const m = mergeSnapshotWithOverlay(base, { byStableId: { "musicfree:ghost": { enabled: false } } });
  assert.equal(m.entries[0].enabled, true);
});
