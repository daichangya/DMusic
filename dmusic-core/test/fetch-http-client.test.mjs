/**
 * FetchHttpClient：显式传入 globalThis.fetch 时不得 Illegal invocation（浏览器）。
 *
 * @author dmusic-test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { FetchHttpClient } from "../js/http/fetch-http-client.mjs";

test("显式传入 globalThis.fetch 时可完成 GET（与 player-app 一致）", async () => {
  if (typeof globalThis.fetch !== "function") {
    return;
  }
  const client = new FetchHttpClient(globalThis.fetch);
  const dataUrl = "data:application/json;charset=utf-8,%7B%22ok%22%3Atrue%7D";
  const body = await client.getJson(dataUrl);
  assert.deepEqual(body, { ok: true });
});

test("注入独立 mock 函数时仍可用", async () => {
  /** @type {typeof fetch} */
  const mock = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ x: 1 }),
  });
  const client = new FetchHttpClient(mock);
  const body = await client.getJson("https://example.test/");
  assert.deepEqual(body, { x: 1 });
});
