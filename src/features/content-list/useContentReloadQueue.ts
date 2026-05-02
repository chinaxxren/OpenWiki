import { useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { fetchAndApplyContentUpdates } from "../../services/contentUpdateService";
import {
  CONTENT_RELOAD_BATCH_MAX_IDS,
  filterQueuedReloadIds,
  shouldQueueReloadId,
  splitReloadIdsIntoChunks,
} from "./contentReloadLogic";

const CONTENT_RELOAD_BATCH_WINDOW_MS = 80;

interface UseContentReloadQueueOptions {
  loadedContentIds: ReadonlySet<string>;
}

export function useContentReloadQueue({
  loadedContentIds,
}: UseContentReloadQueueOptions): void {
  const pendingContentReloadIdsRef = useRef<Set<string>>(new Set());
  const contentReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedContentIdsRef = useRef(loadedContentIds);

  useEffect(() => {
    loadedContentIdsRef.current = loadedContentIds;
  }, [loadedContentIds]);

  const flushQueuedContentReloads = useCallback(async () => {
    if (contentReloadTimerRef.current) {
      clearTimeout(contentReloadTimerRef.current);
      contentReloadTimerRef.current = null;
    }
    const queuedIds = Array.from(pendingContentReloadIdsRef.current);
    pendingContentReloadIdsRef.current.clear();
    if (queuedIds.length === 0) return;

    const ids = filterQueuedReloadIds(queuedIds, loadedContentIdsRef.current);
    if (ids.length === 0) return;

    try {
      for (const chunk of splitReloadIdsIntoChunks(ids, CONTENT_RELOAD_BATCH_MAX_IDS)) {
        await fetchAndApplyContentUpdates(chunk);
      }
    } catch (e) {
      console.error("Failed to reload content batch:", e);
    }
  }, []);

  const queueContentReload = useCallback((id: string) => {
    const normalizedId = shouldQueueReloadId(id, loadedContentIdsRef.current);
    if (!normalizedId) return;
    pendingContentReloadIdsRef.current.add(normalizedId);
    if (contentReloadTimerRef.current) return;
    contentReloadTimerRef.current = setTimeout(() => {
      void flushQueuedContentReloads();
    }, CONTENT_RELOAD_BATCH_WINDOW_MS);
  }, [flushQueuedContentReloads]);

  useEffect(() => {
    const unlistenTasks = [
      listen<{ id: string; reorder?: boolean }>(
        "content:url-fetched",
        (event) => { queueContentReload(event.payload.id); }
      ),
      listen<string>(
        "content:clean-ready",
        (event) => { queueContentReload(event.payload); }
      ),
      listen<string>(
        "content-summary-ready",
        (event) => { queueContentReload(event.payload); }
      ),
      listen<{ id: string }>(
        "content:ocr-done",
        (event) => { queueContentReload(event.payload.id); }
      ),
    ];

    const pendingReloadIds = pendingContentReloadIdsRef.current;

    return () => {
      if (contentReloadTimerRef.current) {
        clearTimeout(contentReloadTimerRef.current);
        contentReloadTimerRef.current = null;
      }
      pendingReloadIds.clear();
      for (const task of unlistenTasks) {
        task.then((fn) => fn()).catch((error) => {
          console.warn("Failed to unlisten content update event:", error);
        });
      }
    };
  }, [queueContentReload]);
}
