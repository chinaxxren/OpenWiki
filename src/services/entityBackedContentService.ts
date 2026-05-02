import { useContentEntitiesStore } from "../stores/contentEntitiesStore";
import type { CapturedContent } from "../types/content";

export interface EntityBackedLoadResult<T> {
  result: T;
  contentIds: string[];
}

export function syncEntityBackedContents(contents: CapturedContent[]): string[] {
  useContentEntitiesStore.getState().upsertMany(contents);
  return contents.map((content) => content.id);
}

export async function loadEntityBackedContents<T>({
  load,
  selectContents,
}: {
  load: () => Promise<T>;
  selectContents: (result: T) => CapturedContent[];
}): Promise<EntityBackedLoadResult<T>> {
  const result = await load();
  const contentIds = syncEntityBackedContents(selectContents(result));
  return { result, contentIds };
}
