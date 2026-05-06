/**
 * OpenSpec 3.5：注册表未注册 adapterId 时不得误用实现。
 *
 * @author dmusic-test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createAdapterRegistry } from "../js/adapters/registry.mjs";

test("未注册的 adapterId：has 为 false，get 为 undefined", () => {
  const reg = createAdapterRegistry();
  assert.equal(reg.has("musicfree:nonexistent"), false);
  assert.equal(reg.get("musicfree:nonexistent"), undefined);
});

test("注册后 has/get 可用", () => {
  const reg = createAdapterRegistry();
  const stub = { searchTracks: async () => [] };
  reg.register("musicfree:xiaoqiu", stub);
  assert.equal(reg.has("musicfree:xiaoqiu"), true);
  assert.equal(reg.get("musicfree:xiaoqiu"), stub);
});
