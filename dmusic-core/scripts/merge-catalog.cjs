/**
 * 将用户 overlay（按 stableId）合并到内置快照上。不得包含可执行代码字段。
 *
 * @author dmusic-test
 */

const STORAGE_OVERLAY_KEY = "dmusic.catalog.overlay";

/**
 * @param {{ catalogVersion?: number, entries: Array<Record<string, unknown>> }} snapshot
 * @param {{ byStableId?: Record<string, { enabled?: boolean }> }} overlay
 */
function mergeSnapshotWithOverlay(snapshot, overlay) {
  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.entries)) {
    throw new Error("快照格式无效：缺少 entries");
  }
  const by =
    overlay && typeof overlay === "object" && overlay.byStableId && typeof overlay.byStableId === "object"
      ? overlay.byStableId
      : {};
  const entries = snapshot.entries.map((e) => {
    const sid = /** @type {{ stableId?: string }} */ (e).stableId;
    if (typeof sid !== "string" || !sid) {
      throw new Error("条目缺少 stableId");
    }
    const patch = by[sid];
    if (!patch || typeof patch !== "object") {
      return { ...e };
    }
    const next = { ...e };
    if (typeof patch.enabled === "boolean") {
      next.enabled = patch.enabled;
    }
    return next;
  });
  return {
    ...snapshot,
    entries,
  };
}

module.exports = { mergeSnapshotWithOverlay, STORAGE_OVERLAY_KEY };
