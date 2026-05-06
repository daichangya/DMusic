/**
 * @author dmusic-test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { FetchHttpClient } from "../js/http/fetch-http-client.mjs";
import { createXiaoqiuAdapter } from "../js/adapters/musicfree-xiaoqiu.mjs";

function mockFetch(/** @type {unknown} */ _url, /** @type {RequestInit | undefined} */ init) {
  const url = String(_url);
  if (url.includes("u.y.qq.com")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        req_1: {
          data: {
            meta: { sum: 1 },
            body: {
              song: {
                list: [{ id: "1", mid: "003MockMid", title: "MockSong", singer: [{ name: "MockArtist" }] }],
              },
            },
          },
        },
      }),
    });
  }
  if (url.includes("lxmusicapi.onrender.com")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://example.com/mock-audio.mp3" }),
    });
  }
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
}

test("searchTracks + resolvePlayableUrl（mock，无公网）", async () => {
  const http = new FetchHttpClient(mockFetch);
  const ad = createXiaoqiuAdapter(http);
  const tracks = await ad.searchTracks("test", 1);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].songmid, "003MockMid");
  const playUrl = await ad.resolvePlayableUrl("003MockMid");
  assert.equal(playUrl, "https://example.com/mock-audio.mp3");
});
