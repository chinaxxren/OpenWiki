import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { CapturedContent } from "../types/content";

type ContentEntityMap = Record<string, CapturedContent>;

interface ContentEntitiesState {
  entities: ContentEntityMap;
  upsertOne: (content: CapturedContent) => void;
  upsertMany: (contents: CapturedContent[]) => void;
  removeOne: (id: string) => void;
  removeMany: (ids: string[]) => void;
}

export function didCapturedContentChange(
  previous: CapturedContent | undefined,
  next: CapturedContent,
): boolean {
  if (!previous) return true;
  if (previous === next) return false;
  return !(
    previous.id === next.id &&
    previous.content_type === next.content_type &&
    previous.raw_text === next.raw_text &&
    previous.raw_text_length === next.raw_text_length &&
    previous.image_path === next.image_path &&
    previous.thumbnail_path === next.thumbnail_path &&
    previous.source_app === next.source_app &&
    previous.source_bundle_id === next.source_bundle_id &&
    previous.source_url === next.source_url &&
    previous.user_note === next.user_note &&
    previous.captured_at === next.captured_at &&
    previous.content_hash === next.content_hash &&
    previous.byte_size === next.byte_size &&
    previous.is_deleted === next.is_deleted &&
    previous.created_at === next.created_at &&
    previous.updated_at === next.updated_at &&
    previous.digested_at === next.digested_at &&
    previous.digest_action === next.digest_action &&
    previous.summary === next.summary &&
    previous.tags === next.tags &&
    previous.digest === next.digest &&
    previous.wiki_compile_hash === next.wiki_compile_hash &&
    previous.wiki_assessed_hash === next.wiki_assessed_hash &&
    previous.clean_content === next.clean_content &&
    previous.has_clean_content === next.has_clean_content &&
    previous.detail_complete === next.detail_complete
  );
}

export const useContentEntitiesStore = create<ContentEntitiesState>((set) => ({
  entities: {},

  upsertOne: (content) =>
    set((state) => {
      const previous = state.entities[content.id];
      if (!didCapturedContentChange(previous, content)) return state;
      return {
        entities: {
          ...state.entities,
          [content.id]: content,
        },
      };
    }),

  upsertMany: (contents) =>
    set((state) => {
      if (contents.length === 0) return state;
      let changed = false;
      const nextEntities: ContentEntityMap = { ...state.entities };
      for (const content of contents) {
        if (!didCapturedContentChange(nextEntities[content.id], content)) continue;
        nextEntities[content.id] = content;
        changed = true;
      }
      if (!changed) return state;
      return { entities: nextEntities };
    }),

  removeOne: (id) =>
    set((state) => {
      if (!(id in state.entities)) return state;
      const nextEntities = { ...state.entities };
      delete nextEntities[id];
      return { entities: nextEntities };
    }),

  removeMany: (ids) =>
    set((state) => {
      if (ids.length === 0) return state;
      let changed = false;
      const nextEntities = { ...state.entities };
      for (const id of ids) {
        if (!(id in nextEntities)) continue;
        delete nextEntities[id];
        changed = true;
      }
      if (!changed) return state;
      return { entities: nextEntities };
    }),
}));

export function useResolvedContents(ids: readonly string[]): CapturedContent[] {
  return useContentEntitiesStore(
    useShallow((state) => {
      const resolved: CapturedContent[] = [];
      for (const id of ids) {
        const content = state.entities[id];
        if (content) {
          resolved.push(content);
        }
      }
      return resolved;
    })
  );
}
