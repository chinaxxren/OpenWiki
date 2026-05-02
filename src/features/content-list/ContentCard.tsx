import { memo, lazy, Suspense, useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { useTranslation } from "react-i18next";
import { FileText, Image as ImageIcon, Link2, MessageSquareText, Paperclip } from "lucide-react";
import type { TFunction } from "i18next";
import type { CapturedContent } from "../../types/content";
import { retryUrlFetch } from "../../services/storageService";
import { deleteContentEverywhere } from "../../services/contentMutationService";
import { useNavigationStore } from "../../stores/navigationStore";
import { ImagePreview } from "./ImagePreview";
import { useContentDetail } from "./useContentDetail";
import { useLinkedWikiPages } from "./useLinkedWikiPages";
import type { WikiPage } from "../../types/wiki";

interface ContentCardProps {
  content: CapturedContent;
  isHighlighted?: boolean;
  itemRef?: (el: HTMLDivElement | null) => void;
}

const minuteTickSubscribers = new Set<(value: number) => void>();
const hourTickSubscribers = new Set<(value: number) => void>();
let minuteTickTimer: ReturnType<typeof setInterval> | null = null;
let hourTickTimer: ReturnType<typeof setInterval> | null = null;
const LazyMarkdownContent = lazy(() => import("./MarkdownContent"));
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const URL_FETCH_FAILURE_PREFIX = "[读取失败] ";
const FORMATTED_TEXT_PARAGRAPH_CACHE_LIMIT = 120;
const FORMATTED_TEXT_LINES_CACHE_LIMIT = 2400;
const FORMATTED_TEXT_STRIP_CACHE_LIMIT = 4800;
const FORMATTED_TEXT_ANALYSIS_CACHE_LIMIT = 2400;
const FORMATTED_TEXT_INLINE_LIST_CACHE_LIMIT = 4800;
const TAG_LIST_CACHE_LIMIT = 2400;
const FORMATTED_TEXT_HEADING_CACHE_LIMIT = 2400;
const ORDERED_LIST_LINE_RE = /^\s*\d+[.)、]\s/;
const UNORDERED_LIST_LINE_RE = /^\s*[-•·*+]\s/;
const LIST_LINE_PREFIX_RE = /^\s*[-•·*+]\s*|^\s*\d+[.)、]\s*/;
const HEADING_LINE_RE = /^(#{1,6})\s+(.+)/;
const BLOCKQUOTE_PREFIX_RE = /^\s*>\s?/;
const INLINE_UNORDERED_LIST_RE = /^\s*[-•·*+]\s+(.*)/;
const formattedTextParagraphCache = new Map<string, string[]>();
const formattedTextLinesCache = new Map<string, string[]>();
interface FormattedParagraphAnalysis {
  lines: string[];
  nonEmptyLines: string[];
  allBlockquote: boolean;
  hasBlockquote: boolean;
  listCount: number;
  hasOrderedListMarker: boolean;
}
const formattedTextAnalysisCache = new Map<string, FormattedParagraphAnalysis>();
const formattedTextBlockquoteStripCache = new Map<string, string>();
const formattedTextListPrefixStripCache = new Map<string, string>();
const formattedTextInlineListContentCache = new Map<string, string | null>();
const tagListCache = new Map<string, string[]>();
interface FormattedHeadingAnalysis {
  level: number;
  text: string;
}
const formattedTextHeadingAnalysisCache = new Map<string, FormattedHeadingAnalysis | null>();
const EMPTY_LINKED_WIKI_PAGES: WikiPage[] = [];
const CARD_CONTAIN_STYLE: CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "360px",
  contain: "layout style paint",
};

function getCachedFormattedParagraphs(text: string): string[] {
  const cached = formattedTextParagraphCache.get(text);
  if (cached) {
    formattedTextParagraphCache.delete(text);
    formattedTextParagraphCache.set(text, cached);
    return cached;
  }

  const paragraphs = text.split(/\n{2,}/);
  formattedTextParagraphCache.set(text, paragraphs);
  if (formattedTextParagraphCache.size > FORMATTED_TEXT_PARAGRAPH_CACHE_LIMIT) {
    const oldestKey = formattedTextParagraphCache.keys().next().value;
    if (oldestKey) formattedTextParagraphCache.delete(oldestKey);
  }
  return paragraphs;
}

function getCachedFormattedLines(paragraph: string): string[] {
  const cached = formattedTextLinesCache.get(paragraph);
  if (cached) {
    formattedTextLinesCache.delete(paragraph);
    formattedTextLinesCache.set(paragraph, cached);
    return cached;
  }

  const lines = paragraph.split("\n");
  formattedTextLinesCache.set(paragraph, lines);
  if (formattedTextLinesCache.size > FORMATTED_TEXT_LINES_CACHE_LIMIT) {
    const oldestKey = formattedTextLinesCache.keys().next().value;
    if (oldestKey) formattedTextLinesCache.delete(oldestKey);
  }
  return lines;
}

function getCachedFormattedParagraphAnalysis(paragraph: string): FormattedParagraphAnalysis {
  const cached = formattedTextAnalysisCache.get(paragraph);
  if (cached) {
    formattedTextAnalysisCache.delete(paragraph);
    formattedTextAnalysisCache.set(paragraph, cached);
    return cached;
  }

  const lines = getCachedFormattedLines(paragraph);
  const nonEmptyLines: string[] = [];
  let allBlockquote = true;
  let hasBlockquote = false;
  let listCount = 0;
  let hasOrderedListMarker = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const isBlockquoteLine = trimmedLine.startsWith(">");
    if (isBlockquoteLine) {
      hasBlockquote = true;
    } else {
      allBlockquote = false;
    }

    const isOrderedLine = ORDERED_LIST_LINE_RE.test(line);
    const isUnorderedLine = UNORDERED_LIST_LINE_RE.test(line);
    if (isOrderedLine || isUnorderedLine) {
      listCount += 1;
      if (isOrderedLine) hasOrderedListMarker = true;
    }

    nonEmptyLines.push(line);
  }

  const analysis: FormattedParagraphAnalysis = {
    lines,
    nonEmptyLines,
    allBlockquote,
    hasBlockquote,
    listCount,
    hasOrderedListMarker,
  };
  formattedTextAnalysisCache.set(paragraph, analysis);
  if (formattedTextAnalysisCache.size > FORMATTED_TEXT_ANALYSIS_CACHE_LIMIT) {
    const oldestKey = formattedTextAnalysisCache.keys().next().value;
    if (oldestKey) formattedTextAnalysisCache.delete(oldestKey);
  }
  return analysis;
}

function getCachedStrippedBlockquoteLine(line: string): string {
  const cached = formattedTextBlockquoteStripCache.get(line);
  if (cached !== undefined) {
    formattedTextBlockquoteStripCache.delete(line);
    formattedTextBlockquoteStripCache.set(line, cached);
    return cached;
  }

  const stripped = line.replace(BLOCKQUOTE_PREFIX_RE, "");
  formattedTextBlockquoteStripCache.set(line, stripped);
  if (formattedTextBlockquoteStripCache.size > FORMATTED_TEXT_STRIP_CACHE_LIMIT) {
    const oldestKey = formattedTextBlockquoteStripCache.keys().next().value;
    if (oldestKey) formattedTextBlockquoteStripCache.delete(oldestKey);
  }
  return stripped;
}

function getCachedStrippedListContentLine(line: string): string {
  const cached = formattedTextListPrefixStripCache.get(line);
  if (cached !== undefined) {
    formattedTextListPrefixStripCache.delete(line);
    formattedTextListPrefixStripCache.set(line, cached);
    return cached;
  }

  const stripped = line.replace(LIST_LINE_PREFIX_RE, "");
  formattedTextListPrefixStripCache.set(line, stripped);
  if (formattedTextListPrefixStripCache.size > FORMATTED_TEXT_STRIP_CACHE_LIMIT) {
    const oldestKey = formattedTextListPrefixStripCache.keys().next().value;
    if (oldestKey) formattedTextListPrefixStripCache.delete(oldestKey);
  }
  return stripped;
}

function getCachedInlineListContent(line: string): string | null {
  if (formattedTextInlineListContentCache.has(line)) {
    const cached = formattedTextInlineListContentCache.get(line) ?? null;
    formattedTextInlineListContentCache.delete(line);
    formattedTextInlineListContentCache.set(line, cached);
    return cached;
  }

  const listMatch = line.match(INLINE_UNORDERED_LIST_RE);
  const content = listMatch ? listMatch[1] : null;
  formattedTextInlineListContentCache.set(line, content);
  if (formattedTextInlineListContentCache.size > FORMATTED_TEXT_INLINE_LIST_CACHE_LIMIT) {
    const oldestKey = formattedTextInlineListContentCache.keys().next().value;
    if (oldestKey) formattedTextInlineListContentCache.delete(oldestKey);
  }
  return content;
}

function getCachedTagList(tags: string): string[] {
  const cached = tagListCache.get(tags);
  if (cached) {
    tagListCache.delete(tags);
    tagListCache.set(tags, cached);
    return cached;
  }

  const parsed = tags.split(",").map((t) => t.trim()).filter(Boolean);
  tagListCache.set(tags, parsed);
  if (tagListCache.size > TAG_LIST_CACHE_LIMIT) {
    const oldestKey = tagListCache.keys().next().value;
    if (oldestKey) tagListCache.delete(oldestKey);
  }
  return parsed;
}

function getCachedFormattedHeadingAnalysis(trimmedParagraph: string): FormattedHeadingAnalysis | null {
  if (formattedTextHeadingAnalysisCache.has(trimmedParagraph)) {
    const cached = formattedTextHeadingAnalysisCache.get(trimmedParagraph) ?? null;
    formattedTextHeadingAnalysisCache.delete(trimmedParagraph);
    formattedTextHeadingAnalysisCache.set(trimmedParagraph, cached);
    return cached;
  }

  const headingMatch = trimmedParagraph.match(HEADING_LINE_RE);
  const heading = headingMatch
    ? { level: headingMatch[1].length, text: headingMatch[2] }
    : null;

  formattedTextHeadingAnalysisCache.set(trimmedParagraph, heading);
  if (formattedTextHeadingAnalysisCache.size > FORMATTED_TEXT_HEADING_CACHE_LIMIT) {
    const oldestKey = formattedTextHeadingAnalysisCache.keys().next().value;
    if (oldestKey) formattedTextHeadingAnalysisCache.delete(oldestKey);
  }
  return heading;
}

function extractUrlFailureReason(rawText: string): string {
  const body = rawText.startsWith(URL_FETCH_FAILURE_PREFIX)
    ? rawText.slice(URL_FETCH_FAILURE_PREFIX.length)
    : rawText;
  const reasonEnd = body.indexOf("\n\n");
  return (reasonEnd >= 0 ? body.slice(0, reasonEnd) : body).trim();
}

function ensureMinuteTickTimer() {
  if (minuteTickTimer) return;
  minuteTickTimer = window.setInterval(() => {
    const now = Date.now();
    for (const notify of minuteTickSubscribers) notify(now);
  }, 60_000);
}

function ensureHourTickTimer() {
  if (hourTickTimer) return;
  hourTickTimer = window.setInterval(() => {
    const now = Date.now();
    for (const notify of hourTickSubscribers) notify(now);
  }, 60 * 60_000);
}

function releaseMinuteTickTimerIfIdle() {
  if (minuteTickTimer && minuteTickSubscribers.size === 0) {
    window.clearInterval(minuteTickTimer);
    minuteTickTimer = null;
  }
}

function releaseHourTickTimerIfIdle() {
  if (hourTickTimer && hourTickSubscribers.size === 0) {
    window.clearInterval(hourTickTimer);
    hourTickTimer = null;
  }
}

function useMinuteNowMs(capturedAtMs: number) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const ageMs = nowMs - capturedAtMs;
  const shouldTrackMinute = ageMs < DAY_MS;
  const shouldTrackHour = ageMs >= DAY_MS && ageMs < WEEK_MS;

  useEffect(() => {
    if (!shouldTrackMinute) return;
    minuteTickSubscribers.add(setNowMs);
    ensureMinuteTickTimer();
    return () => {
      minuteTickSubscribers.delete(setNowMs);
      releaseMinuteTickTimerIfIdle();
    };
  }, [shouldTrackMinute]);

  useEffect(() => {
    if (!shouldTrackHour) return;
    hourTickSubscribers.add(setNowMs);
    ensureHourTickTimer();
    return () => {
      hourTickSubscribers.delete(setNowMs);
      releaseHourTickTimerIfIdle();
    };
  }, [shouldTrackHour]);

  return nowMs;
}

function formatRelativeTime(capturedAtMs: number, nowMs: number, t: TFunction): string {
  const diffMs = nowMs - capturedAtMs;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t("card.justNow");
  if (diffMin < 60) return t("card.minutesAgo", { count: diffMin });
  if (diffHour < 24) return t("card.hoursAgo", { count: diffHour });
  if (diffDay < 7) return t("card.daysAgo", { count: diffDay });
  return new Date(capturedAtMs).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getFreshnessDotClass(ageMs: number): string {
  const hours = ageMs / (1000 * 60 * 60);
  if (hours < 1) return "bg-green-500"; // < 1小时：鲜绿
  if (hours < 6) return "bg-green-400"; // < 6小时：浅绿
  if (hours < 24) return "bg-yellow-400"; // < 1天：黄色
  if (hours < 72) return "bg-orange-300"; // < 3天：浅橙
  if (hours < 168) return "bg-stone-400"; // < 1周：灰色
  return "bg-stone-300"; // > 1周：浅灰
}

function ContentCardBase({ content, isHighlighted = false, itemRef }: ContentCardProps) {
  const { t } = useTranslation("content");
  const navigate = useNavigationStore((s) => s.navigate);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const [overlayContent, setOverlayContent] = useState<CapturedContent | null>(null);
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");
  const [ocrState] = useState<"idle" | "running" | "done">("idle");
  const [ocrText] = useState<string | null>(null);
  const {
    detailLoading,
    copied,
    ensureContentDetail,
    handleCopy,
  } = useContentDetail(content);
  const {
    linkedWikiPages,
    wikiState,
    handleWikiCompile,
  } = useLinkedWikiPages(content.id, content.wiki_compile_hash);
  const capturedAtMsRaw = Date.parse(content.captured_at);
  const capturedAtMs = Number.isFinite(capturedAtMsRaw) ? capturedAtMsRaw : 0;
  const nowMs = useMinuteNowMs(capturedAtMs);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);
    },
    []
  );

  const handleDelete = async () => {
    if (deleteState === "idle") {
      setDeleteState("confirm");
      // Auto-reset after 3 seconds if user doesn't confirm
      deleteTimerRef.current = setTimeout(() => setDeleteState("idle"), 3000);
      return;
    }
    if (deleteState === "confirm") {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setDeleteState("deleting");
      try {
        await deleteContentEverywhere(content);
      } catch (e) {
        console.error("Failed to delete:", e);
        setDeleteState("idle");
      }
    }
  };

  const handleCloseTextOverlay = useCallback(() => {
    setOverlayContent(null);
    setTextExpanded(false);
  }, []);

  const openTextOverlay = useCallback(async () => {
    const resolvedContent = await ensureContentDetail();
    setOverlayContent(resolvedContent);
    setTextExpanded(true);
  }, [ensureContentDetail]);

  const TypeIcon = content.content_type === "image"
    ? ImageIcon
    : content.content_type === "url"
      ? Link2
      : content.content_type === "mixed"
        ? Paperclip
        : FileText;
  const timeStr = formatRelativeTime(capturedAtMs, nowMs, t);

  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryUrlFetch(content.id);
    } catch (e) {
      console.error("Retry failed:", e);
    }
    // Don't reset retrying — the list will reload when content:url-fetched fires
  };

  // URL content states
  const isUrlContent = content.content_type === "url";
  const hasSourceUrl = isUrlContent && !!content.source_url;
  const rawText = content.raw_text ?? null;
  const rawTextLength = content.raw_text_length ?? rawText?.length ?? 0;
  const previewRawText = rawTextLength > 80 ? `${rawText?.slice(0, 80)}...` : rawText;
  const sourceUrlTrimmed = content.source_url?.trim();
  const rawTextTrimmed = rawText?.trim();
  // Check if URL fetch failed (raw_text starts with [读取失败])
  const isFailedUrl = hasSourceUrl && rawText?.startsWith("[读取失败]");
  // Extract the actual error reason from the failure payload. Backend writes
  // raw_text as: "[读取失败] {error}\n\n原始链接: {url}" — we peel off the
  // prefix and stop at the double newline to recover {error}. Showing this
  // to the user lets them distinguish "yt-dlp not found" from "429 rate
  // limited" from "needs sign-in" without digging into logs.
  const failureReason = isFailedUrl && rawText ? extractUrlFailureReason(rawText) : null;
  // raw_text 不等于 source_url 就说明已完成读取（可能是正文、标题、或视频号标记）
  const isFetchedUrl = hasSourceUrl && !isFailedUrl && !!rawText &&
    rawTextTrimmed !== sourceUrlTrimmed;
  const canExpandContent = !!(rawText || ocrText || isFetchedUrl || content.has_clean_content);
  const isLoadingUrl = hasSourceUrl && !isFetchedUrl && !isFailedUrl;
  const ageMs = Math.max(0, nowMs - capturedAtMs);
  const freshnessClass = getFreshnessDotClass(ageMs);

  // Only show "AI 分析中" for content captured in the last 2 minutes
  const isRecent = ageMs < 2 * 60 * 1000;
  const visibleLinkedWikiPages =
    content.wiki_compile_hash || linkedWikiPages.length > 0 ? linkedWikiPages : EMPTY_LINKED_WIKI_PAGES;
  const tagsAnalyzing = !content.tags && !!(rawText || ocrText) && rawTextLength >= 6 && isRecent;
  const canCopyContent = !!rawText || !!content.has_clean_content;

  const imageSrc =
    content.content_type === "image"
      ? content.thumbnail_path
        ? convertFileSrc(content.thumbnail_path)
        : content.image_path
          ? convertFileSrc(content.image_path)
          : null
      : null;

  const fullImageSrc =
    content.content_type === "image" && content.image_path
      ? convertFileSrc(content.image_path)
      : null;

  return (
    <>
      <div
        ref={itemRef}
        style={CARD_CONTAIN_STYLE}
        className={`
        group rounded-2xl transition-all duration-300
        ${isHighlighted
          ? "ring-2 ring-orange-300/60 dark:ring-orange-500/30 animate-highlight-fade"
          : deleteState !== "idle"
            ? "ring-1 ring-red-200/80 dark:ring-red-500/30"
            : "hover:translate-y-[-1px] hover:shadow-[0_12px_40px_rgba(249,115,22,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
        }
        glass
      `}>
        {/* Main content area */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-3.5 items-start">
            {/* Type icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
              content.content_type === "url" ? "bg-orange-50 dark:bg-orange-500/10" :
              content.content_type === "image" ? "bg-green-50 dark:bg-green-500/10" :
              "bg-blue-50 dark:bg-blue-500/10"
            }`}>
              <TypeIcon className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            </div>

            {/* Content body */}
            <div className="flex-1 min-w-0">
          {/* Clickable content area — tags + summary, click anywhere to expand */}
          <div
            className="cursor-pointer"
            onClick={() => {
              if (canExpandContent) {
                void openTextOverlay();
              }
            }}
          >
            {/* Tags */}
            <TagChips
              tags={content.tags}
              analyzing={tagsAnalyzing}
            />

            {/* Image content: thumbnail + summary side by side */}
            {imageSrc && (
              <div className="flex gap-3.5 items-start mb-1">
                <div
                  className="cursor-pointer group/img flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
                >
                  <img
                    src={imageSrc}
                    alt="Captured"
                    className="w-20 h-20 rounded-[10px] border border-gray-200/60 dark:border-white/10
                               group-hover/img:border-orange-300/60 dark:group-hover/img:border-orange-500/40
                               group-hover/img:shadow-md transition-all object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {content.summary ? (
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                      {content.summary}
                    </p>
                  ) : rawText || ocrText ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                      {(ocrText || previewRawText || "").slice(0, 80)}...
                    </p>
                  ) : null}
                  {(rawText || ocrText) && (
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                      {t("card.ocrRecognized", { count: (ocrText || rawText || "").length })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* OCR loading indicator */}
            {content.content_type === "image" && !imageSrc && !rawText && !ocrText && ocrState === "running" && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("card.ocrRunning")}
              </div>
            )}

            {/* URL content: fetched */}
            {isUrlContent && isFetchedUrl && (
              <div>
                {content.summary ? (
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                    {content.summary}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                    {previewRawText}
                  </p>
                )}
              </div>
            )}

            {/* Text content (non-URL, non-image) */}
            {!isUrlContent && content.content_type !== "image" && rawText && (
              <div>
                {content.summary ? (
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    {content.summary}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    {previewRawText}
                  </p>
                )}
              </div>
            )}

            {/* No content fallback */}
            {!imageSrc && !rawText && !isUrlContent && (
              <p className="text-sm text-gray-400 dark:text-slate-500 italic">{t("card.noContent")}</p>
            )}
          </div>

          {/* URL content: loading — outside clickable area */}
          {isUrlContent && isLoadingUrl && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-orange-500 dark:text-orange-400 truncate flex-1">
                {content.source_url}
              </p>
              <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("card.fetching")}
              </span>
            </div>
          )}

          {/* URL content: failed */}
          {isUrlContent && isFailedUrl && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-red-500 dark:text-red-400 font-medium">{t("card.fetchFailed")}</span>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400
                             hover:text-orange-600 dark:hover:text-orange-300
                             disabled:opacity-50 transition-colors"
                >
                  <svg className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {retrying ? t("card.retrying") : t("card.retry")}
                </button>
              </div>
              {failureReason && (
                <p className="text-xs text-red-500/80 dark:text-red-400/80 mb-1 leading-relaxed">
                  {failureReason}
                </p>
              )}
              <p className="text-sm text-orange-500 dark:text-orange-400 truncate">
                {content.source_url}
              </p>
            </div>
          )}


          {/* User note */}
          {content.user_note && (
            <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg
                            bg-orange-500/[0.06] dark:bg-orange-500/[0.08]
                            border border-orange-200/40 dark:border-orange-500/15">
              <MessageSquareText className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-orange-600 dark:text-orange-300 leading-relaxed">
                {content.user_note}
              </span>
            </div>
          )}

          {/* Footer: meta + actions */}
          <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t"
               style={{ borderColor: "var(--color-border-light, rgba(0,0,0,0.04))" }}>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-slate-500">
              <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${
                freshnessClass
              }`} />
              <span>{timeStr}</span>
              <span className="text-gray-300/80 dark:text-slate-600">/</span>
              <span>{content.source_app}</span>
            </div>

            <div className="flex items-center gap-1">
              {hasSourceUrl && (
                <button
                  onClick={() => content.source_url && open(content.source_url)}
                  className="px-2 py-1 rounded-md text-[11px] text-gray-400 dark:text-slate-500
                             hover:text-orange-600 dark:hover:text-orange-400
                             hover:bg-orange-500/10 dark:hover:bg-orange-500/15 transition-all"
                >
                  {t("card.openLink")}
                </button>
              )}
              {canCopyContent && (
                <button
                  onClick={handleCopy}
                  disabled={detailLoading}
                  className={`px-2 py-1 rounded-md text-[11px] transition-all
                    ${copied
                      ? "text-green-600 dark:text-green-400"
                      : detailLoading
                      ? "text-gray-300 dark:text-slate-600 cursor-wait"
                      : "text-gray-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/15"
                    }`}
                >
                  {copied ? t("card.copied") : detailLoading ? "..." : t("card.copy")}
                </button>
              )}
              {visibleLinkedWikiPages.length === 0 && (rawText || content.user_note || content.source_url) && (
                <button
                  onClick={handleWikiCompile}
                  disabled={wikiState === "compiling"}
                  className={`px-2 py-1 rounded-md text-[11px] transition-all
                    ${wikiState === "done"
                      ? "text-green-600 dark:text-green-400"
                      : wikiState === "compiling"
                      ? "text-orange-400 dark:text-orange-500 opacity-60"
                      : "text-gray-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/15"
                    }`}
                >
                  {wikiState === "done" ? t("card.compiledToWiki") : wikiState === "compiling" ? t("card.compiling") : t("card.addToWiki")}
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleteState === "deleting"}
                className={`px-2 py-1 rounded-md text-[11px] transition-all
                  ${deleteState === "confirm"
                    ? "text-white bg-red-500 hover:bg-red-600 rounded-md"
                    : deleteState === "deleting"
                    ? "text-white bg-red-400 opacity-60 rounded-md"
                    : "text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15"
                  }`}
              >
                {deleteState === "confirm" ? t("card.deleteConfirmBtn") : deleteState === "deleting" ? "..." : t("card.delete")}
              </button>
            </div>
          </div>
            {/* Wiki linked pages */}
            {visibleLinkedWikiPages.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: "var(--color-border, #E7E5E4)" }}>
                <span style={{ fontSize: 10, color: "var(--color-text-muted, #A8A29E)" }}>{t("card.linkedKnowledge")}</span>
                {visibleLinkedWikiPages.slice(0, 3).map((wp) => (
                  <button
                    key={wp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({ type: "wiki-page", pageId: wp.id });
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors
                               hover:bg-orange-100 dark:hover:bg-orange-500/15"
                    style={{
                      color: "#F97316",
                      backgroundColor: "#F9731610",
                      border: "1px solid #F9731625",
                    }}
                  >
                    {wp.title}
                  </button>
                ))}
              </div>
            )}
            </div>{/* close content body */}
          </div>{/* close flex row */}
        </div>

      </div>

      {previewOpen && fullImageSrc && (
        <ImagePreview
          src={fullImageSrc}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Full text overlay — portal to body to escape overflow-hidden */}
      {createPortal(
        textExpanded && ((overlayContent ?? content).raw_text || ocrText || fullImageSrc) ? (
          <FullTextOverlay
            content={overlayContent ?? content}
            copied={copied}
            onCopy={handleCopy}
            onClose={handleCloseTextOverlay}
            imageSrc={fullImageSrc}
            ocrText={ocrText}
          />
        ) : null,
        document.body
      )}
    </>
  );
}

/* ================================================================
   AUTO-FORMAT — turn text with lightweight Markdown into styled elements
   ================================================================ */
const FormattedText = memo(function FormattedText({ text }: { text: string }) {
  const paragraphs = getCachedFormattedParagraphs(text);

  return (
    <div className="space-y-4" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // ── Headings: # Title / ## Title / ### Title ──
        const heading = getCachedFormattedHeadingAnalysis(trimmed);
        if (heading) {
          const level = heading.level;
          const headingText = heading.text;
          const cls = level === 1
            ? "text-lg font-bold text-gray-900 dark:text-gray-100 mt-2"
            : level === 2
            ? "text-base font-semibold text-gray-800 dark:text-gray-200 mt-1"
            : "text-sm font-semibold text-gray-700 dark:text-gray-300";
          return <h3 key={i} className={cls}>{headingText}</h3>;
        }

        const {
          lines,
          nonEmptyLines,
          allBlockquote,
          hasBlockquote,
          listCount,
          hasOrderedListMarker,
        } = getCachedFormattedParagraphAnalysis(trimmed);

        // ── Blockquote: lines starting with > ──
        if (allBlockquote && hasBlockquote) {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-orange-300 dark:border-orange-600 pl-3 py-1 text-[14px] text-gray-600 dark:text-gray-400 italic leading-relaxed"
            >
              {nonEmptyLines.map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {getCachedStrippedBlockquoteLine(line)}
                </span>
              ))}
            </blockquote>
          );
        }

        // ── List: lines starting with - / • / * / 1. / 1) ──
        const listLines = nonEmptyLines;
        const isList = listLines.length > 1 && listCount >= listLines.length * 0.6;
        if (isList) {
          const isOrdered = hasOrderedListMarker;
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {listLines.map((line, j) => {
                const content = getCachedStrippedListContentLine(line);
                const marker = isOrdered ? `${j + 1}.` : "•";
                return (
                  <li key={j} className="flex gap-2 text-[14px] text-gray-700 dark:text-gray-200 leading-relaxed">
                    <span className="text-orange-400 dark:text-orange-500 flex-shrink-0 mt-0.5 text-xs min-w-[16px]">{marker}</span>
                    <span>{content || line}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // ── Short standalone line → sub-heading ──
        if (trimmed.length < 40 && !trimmed.endsWith("。") && !trimmed.endsWith("，") && !trimmed.endsWith(".") && !trimmed.endsWith(",") && !trimmed.includes("\n")) {
          return (
            <h4 key={i} className="text-[15px] font-semibold text-gray-800 dark:text-gray-200 mt-1">
              {trimmed}
            </h4>
          );
        }

        // ── Regular paragraph (may contain inline list items) ──
        return (
          <p key={i} className="text-[14px] text-gray-700 dark:text-gray-200 leading-[1.85]">
            {lines.map((line, j) => {
              const inlineListContent = getCachedInlineListContent(line);
              if (inlineListContent !== null) {
                return (
                  <span key={j} className="flex gap-2 mt-1">
                    <span className="text-orange-400 dark:text-orange-500 flex-shrink-0">•</span>
                    <span>{inlineListContent}</span>
                  </span>
                );
              }
              return (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
});

/* ================================================================
   FULL TEXT OVERLAY
   ================================================================ */

function AnalyzingChip() {
  const { t } = useTranslation("content");
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full animate-pulse
                        bg-orange-50 dark:bg-orange-500/10 text-orange-400 dark:text-orange-500">
        {t("card.aiAnalyzing")}
      </span>
    </div>
  );
}

const TagChips = memo(function TagChips({
  tags,
  analyzing,
}: {
  tags?: string;
  analyzing?: boolean;
}) {
  if (!tags && analyzing) return <AnalyzingChip />;
  if (!tags) return null;
  const tagList = getCachedTagList(tags);
  if (tagList.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {tagList.map((tag, i) => (
        <span
          key={i}
          className="rounded-full px-2.5 py-0.5"
          style={{
            fontSize: 12,
            color: "#F97316",
            backgroundColor: "#F9731610",
            border: "1px solid #F9731625",
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
});

export const FullTextOverlay = memo(function FullTextOverlay({
  content,
  copied,
  onCopy,
  onClose,
  imageSrc,
  ocrText,
}: {
  content: CapturedContent;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  imageSrc?: string | null;
  ocrText?: string | null;
}) {
  const { t } = useTranslation("content");
  const isImage = content.content_type === "image";
  const isUrl = content.content_type === "url";
  const HeaderTypeIcon = isImage ? ImageIcon : isUrl ? Link2 : FileText;
  // For images, prefer ocrText over content.raw_text
  // Prefer clean_content for URL articles, fallback to raw_text
  const displayText = isImage
    ? (ocrText || content.raw_text)
    : (content.clean_content || content.raw_text);
  const hasCleanContent = !!content.clean_content;
  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
      {/* Panel */}
      <div
        className={`relative rounded-2xl overflow-hidden glass-elevated flex flex-col
                    w-full max-w-2xl max-h-[85vh]
                    animate-in zoom-in-95 slide-in-from-bottom-2 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] z-10"
          style={{ background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.4) 30%, rgba(249,115,22,0.5) 50%, rgba(249,115,22,0.4) 70%, transparent)" }}
        />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 border
              ${isImage
                ? "from-amber-500/15 to-orange-500/15 dark:from-amber-500/20 dark:to-orange-500/20 border-amber-200/30 dark:border-amber-500/15"
                : isUrl
                  ? "from-orange-500/15 to-orange-500/15 dark:from-orange-500/20 dark:to-orange-500/20 border-orange-200/30 dark:border-orange-500/15"
                  : "from-orange-500/15 to-orange-500/15 dark:from-orange-500/20 dark:to-orange-500/20 border-orange-200/30 dark:border-orange-500/15"
              }`}>
              <HeaderTypeIcon className="w-4 h-4 text-orange-500 dark:text-orange-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 truncate">
                {content.raw_text?.split("\n")[0]?.slice(0, 60) || (isImage ? t("card.imageContent") : t("card.contentDetail"))}
              </div>
              <div className="text-[11px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                {content.source_url || `${content.source_app} · ${content.content_type}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
            {content.source_url && (
              <button
                onClick={() => open(content.source_url!)}
                className="h-8 px-3 rounded-xl text-xs font-medium transition-all
                           text-gray-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400
                           hover:bg-orange-500/8 dark:hover:bg-orange-500/10
                           flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {t("card.originalArticle")}
              </button>
            )}
            <button
              onClick={onCopy}
              className={`h-8 px-3 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5
                ${copied
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/8 dark:hover:bg-orange-500/10"
                }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t("card.copied")}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  {t("card.copy")}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center
                         text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300
                         hover:bg-gray-500/8 dark:hover:bg-white/[0.08] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Divider */}
        <div className="mx-6 h-[1px] bg-gradient-to-r from-transparent via-gray-200/80 dark:via-white/[0.06] to-transparent flex-shrink-0" />

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="overflow-y-auto w-full">
            <div className="px-6 py-5">
              {/* Image display */}
              {isImage && imageSrc && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={imageSrc}
                    alt="Captured"
                    className="max-w-full max-h-[50vh] rounded-xl border border-white/50 dark:border-white/10 object-contain"
                  />
                </div>
              )}
              {/* Digest — paragraph summary */}
              {content.digest && (
                <div className="mb-4 rounded-xl p-4" style={{
                  backgroundColor: "var(--color-surface-raised, #F5F5F0)",
                  border: "1px solid var(--color-border, #E7E5E4)",
                }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#F97316" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#F97316" }}>{t("card.aiSummary")}</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--color-text-secondary, #57534E)" }}>
                    {content.digest}
                  </p>
                </div>
              )}
              {/* Text content — auto-formatted */}
              {displayText && (
                <article className="selection:bg-orange-500/20 dark:selection:bg-orange-500/30 overflow-hidden">
                  {isImage && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5 rounded-md bg-amber-500/10">{t("card.ocrText")}</span>
                    </div>
                  )}
                  {hasCleanContent ? (
                    <Suspense fallback={<FormattedText text={displayText} />}>
                      <LazyMarkdownContent text={displayText} />
                    </Suspense>
                  ) : (
                    <FormattedText text={displayText} />
                  )}
                </article>
              )}
              {/* No text fallback for images */}
              {isImage && !displayText && (
                <p className="text-sm text-gray-400 dark:text-slate-500 italic text-center">
                  {t("card.noOcrText")}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export const ContentCard = memo(
  ContentCardBase,
  (prev, next) =>
    prev.content === next.content &&
    prev.isHighlighted === next.isHighlighted &&
    prev.itemRef === next.itemRef
);
