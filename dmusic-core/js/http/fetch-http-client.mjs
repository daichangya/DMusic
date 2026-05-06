/**
 * 可注入的 HTTP 客户端（默认 fetch），便于单测 mock。
 *
 * @author dmusic-test
 */

export class FetchHttpClient {
  /**
   * @param {typeof fetch} [fetchImpl]
   */
  constructor(fetchImpl) {
    const native = globalThis.fetch;
    /** 显式传入的 bare `globalThis.fetch` 与「未传参」一样，必须 bind，否则后续调用会 Illegal invocation */
    const f =
      fetchImpl === undefined || fetchImpl === null
        ? native?.bind(globalThis)
        : fetchImpl === native
          ? native.bind(globalThis)
          : fetchImpl;
    if (typeof f !== "function") {
      throw new Error("fetch 不可用：请注入 fetchImpl");
    }
    this._fetch = f;
  }

  /**
   * @param {string} url
   * @param {Record<string, unknown>} body
   * @param {Record<string, string>} [headers]
   */
  async postJson(url, body, headers = {}) {
    const res = await this._fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`POST ${url} → HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * @param {string} url
   * @param {Record<string, string>} [headers]
   */
  async getJson(url, headers = {}) {
    const res = await this._fetch(url, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      throw new Error(`GET ${url} → HTTP ${res.status}`);
    }
    return res.json();
  }
}
