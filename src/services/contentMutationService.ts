import { deleteContent } from "./storageService";
import { shouldDecrementTotalForDeletedContent } from "../features/content-list/contentListLogic";
import { useContentDeletionEventStore } from "../stores/contentDeletionEventStore";
import { useContentListQueryStore } from "../stores/contentListQueryStore";
import { useContentStore } from "../stores/contentStore";
import { useContentEntitiesStore } from "../stores/contentEntitiesStore";
import { useDataHubStore } from "../stores/dataHubStore";
import { useDigestStore } from "../stores/digestStore";
import { useReportStore } from "../stores/reportStore";
import type { CapturedContent } from "../types/content";

export async function deleteContentEverywhere(content: CapturedContent): Promise<void> {
  await deleteContent(content.id);

  const {
    activeFilter,
    activeDateRange,
    activeSensitiveFilterEnabled,
  } = useContentListQueryStore.getState();
  const shouldDecrementTotal = shouldDecrementTotalForDeletedContent(
    content,
    activeFilter,
    activeDateRange,
    activeSensitiveFilterEnabled,
  );

  useContentStore.getState().applyDeletedContent(content.id, { decrementTotalCount: shouldDecrementTotal });
  useContentDeletionEventStore.getState().publishDeletedContent(content);
  useContentEntitiesStore.getState().removeOne(content.id);
  useDataHubStore.getState().applyDeletedContent(content);
  useDigestStore.getState().applyDeletedContent(content.id);
  useReportStore.getState().applyDeletedContent(content.id);
}
