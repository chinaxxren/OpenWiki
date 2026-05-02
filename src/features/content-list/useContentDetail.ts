import { useState, useRef, useEffect, useCallback } from "react";
import type { CapturedContent } from "../../types/content";
import { fetchAndHydrateContentDetail } from "../../services/contentUpdateService";

interface UseContentDetailResult {
  detailLoading: boolean;
  copied: boolean;
  setCopied: (value: boolean) => void;
  ensureContentDetail: () => Promise<CapturedContent>;
  handleCopy: () => Promise<void>;
}

export function useContentDetail(content: CapturedContent): UseContentDetailResult {
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    },
    []
  );

  const ensureContentDetail = useCallback(async (): Promise<CapturedContent> => {
    if (content.detail_complete !== false) return content;

    setDetailLoading(true);
    try {
      const hydrated = await fetchAndHydrateContentDetail(content);
      return hydrated ?? content;
    } catch (e) {
      console.error("Failed to load content detail:", e);
      return content;
    } finally {
      setDetailLoading(false);
    }
  }, [content]);

  const handleCopy = useCallback(async () => {
    const resolvedContent = await ensureContentDetail();
    const textToCopy = resolvedContent.clean_content || resolvedContent.raw_text;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [ensureContentDetail]);

  return {
    detailLoading,
    copied,
    setCopied,
    ensureContentDetail,
    handleCopy,
  };
}
