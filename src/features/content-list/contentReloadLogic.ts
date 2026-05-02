export const CONTENT_RELOAD_BATCH_MAX_IDS = 120;

export function normalizeReloadId(id: string): string | null {
  if (!id) return null;
  const normalized = id.trim();
  return normalized ? normalized : null;
}

export function shouldQueueReloadId(
  id: string,
  loadedContentIds: ReadonlySet<string>
): string | null {
  const normalized = normalizeReloadId(id);
  if (!normalized) return null;
  if (loadedContentIds.size > 0 && !loadedContentIds.has(normalized)) return null;
  return normalized;
}

export function filterQueuedReloadIds(
  queuedIds: readonly string[],
  loadedContentIds: ReadonlySet<string>
): string[] {
  return queuedIds.filter((id) => loadedContentIds.has(id));
}

export function splitReloadIdsIntoChunks(
  ids: readonly string[],
  chunkSize = CONTENT_RELOAD_BATCH_MAX_IDS
): string[][] {
  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += chunkSize) {
    chunks.push(ids.slice(start, start + chunkSize));
  }
  return chunks;
}
