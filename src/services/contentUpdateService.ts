import { getContentsByIds } from "./storageService";
import { useContentStore } from "../stores/contentStore";
import type { CapturedContent } from "../types/content";

export function hydrateContentDetail(content: CapturedContent): CapturedContent {
  return {
    ...content,
    detail_complete: true,
    raw_text_length: content.raw_text?.length ?? 0,
    has_clean_content: !!content.clean_content,
  };
}

export async function fetchContentsByIds(ids: string[]): Promise<CapturedContent[]> {
  if (ids.length === 0) return [];
  return getContentsByIds(ids);
}

export async function fetchAndApplyContentUpdates(ids: string[]): Promise<CapturedContent[]> {
  const contents = await fetchContentsByIds(ids);
  if (contents.length === 0) return [];
  useContentStore.getState().updateContents(contents);
  return contents;
}

export async function fetchAndHydrateContentDetail(content: CapturedContent): Promise<CapturedContent | null> {
  const details = await fetchAndApplyContentUpdates([content.id]);
  const detail = details[0];
  if (!detail) return null;
  const hydrated = hydrateContentDetail(detail);
  useContentStore.getState().updateContent(hydrated);
  return hydrated;
}
