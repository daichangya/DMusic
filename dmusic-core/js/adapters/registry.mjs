/**
 * 音源适配器注册表（adapterId → 实现）。
 *
 * @author dmusic-test
 */

export function createAdapterRegistry() {
  /** @type {Map<string, unknown>} */
  const map = new Map();
  return {
    /**
     * @param {string} adapterId
     * @param {unknown} impl
     */
    register(adapterId, impl) {
      map.set(adapterId, impl);
    },
    /**
     * @param {string} adapterId
     */
    get(adapterId) {
      return map.get(adapterId);
    },
    /**
     * @param {string} adapterId
     */
    has(adapterId) {
      return map.has(adapterId);
    },
  };
}
