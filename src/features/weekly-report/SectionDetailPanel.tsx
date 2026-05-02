import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FileText, Image as ImageIcon, Link2, Paperclip, Star, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { submitFeedback } from "../../services/reportService";
import { SECTION_THEME } from "./reportThemes";
import type { FeedbackType, ReportSection } from "../../types/report";
import type { CapturedContent } from "../../types/content";

const DEFAULT_THEME = SECTION_THEME.routine;

export function SectionDetailPanel({
  section,
  contentItems,
  onClose,
}: {
  section: ReportSection;
  contentItems: CapturedContent[];
  onClose: () => void;
}) {
  const { t } = useTranslation("report");
  const theme = SECTION_THEME[section.section_type] || DEFAULT_THEME;
  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackType | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleFeedback = async (type: FeedbackType) => {
    try {
      await submitFeedback(null, section.id, type);
      setFeedbackGiven(type);
    } catch (e) {
      console.error("Failed to submit feedback:", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative ml-auto w-full max-w-[400px] h-full glass-elevated overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-4 pt-4 pb-3 glass border-b ">
          <div className="flex items-start gap-3">
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center
                         text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-600
                         transition-colors cursor-pointer flex-shrink-0 mt-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-5 h-5 rounded-md ${theme.accent} flex items-center justify-center`}>
                  <svg className={`w-2.5 h-2.5 ${theme.accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={theme.iconPath} />
                  </svg>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${theme.accentText}`}>
                  {theme.keyword}
                </span>
              </div>

              <h2 className="text-[16px] font-bold text-gray-900 dark:text-gray-50 leading-snug">
                {section.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200">
                {t("detail.aiAdvice")}
              </span>
            </div>

            <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-3">
              <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
                {section.body}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mr-1">{t("detail.feedbackQuestion")}</p>
              <DetailFeedbackButton
                type="interested"
                icon={ThumbsUp}
                label={t("detail.agree")}
                isActive={feedbackGiven === "interested"}
                isDisabled={feedbackGiven !== null && feedbackGiven !== "interested"}
                onClick={() => handleFeedback("interested")}
              />
              <DetailFeedbackButton
                type="dismissed"
                icon={ThumbsDown}
                label={t("detail.disagree")}
                isActive={feedbackGiven === "dismissed"}
                isDisabled={feedbackGiven !== null && feedbackGiven !== "dismissed"}
                onClick={() => handleFeedback("dismissed")}
              />
              <DetailFeedbackButton
                type="bookmarked"
                icon={Star}
                label={t("detail.bookmark")}
                isActive={feedbackGiven === "bookmarked"}
                isDisabled={feedbackGiven !== null && feedbackGiven !== "bookmarked"}
                onClick={() => handleFeedback("bookmarked")}
              />
            </div>
          </div>

          <div className="mx-4 h-px bg-gray-100 dark:bg-slate-800" />

          {contentItems.length > 0 && (
            <div className="px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200">
                  {t("detail.relatedContent")}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-slate-500">
                  {t("contentPreview.itemsCount", { count: contentItems.length })}
                </span>
              </div>

              <div className="space-y-2">
                {contentItems.map((item) => (
                  <DetailContentItem key={item.id} content={item} />
                ))}
              </div>
            </div>
          )}

          {contentItems.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[12px] text-gray-300 dark:text-slate-600">{t("detail.noRelatedContent")}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailFeedbackButton({
  icon,
  label,
  isActive,
  isDisabled,
  onClick,
}: {
  type: FeedbackType;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 cursor-pointer
        ${isActive
          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/20"
          : isDisabled
            ? "bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 cursor-not-allowed"
            : "glass text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm"
        }
      `}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function DetailContentItem({ content }: { content: CapturedContent }) {
  const { t } = useTranslation("report");
  const typeConfig: Record<string, { icon: LucideIcon; label: string }> = {
    image: { icon: ImageIcon, label: t("contentType.image") },
    url: { icon: Link2, label: t("contentType.url") },
    text: { icon: FileText, label: t("contentType.text") },
    mixed: { icon: Paperclip, label: t("contentType.mixed") },
  };
  const { icon: TypeIcon, label } = typeConfig[content.content_type] || typeConfig.text;

  const isUrl = content.content_type === "url";
  const hasSourceUrl = isUrl && !!content.source_url;
  const hasFetchedText = hasSourceUrl && content.raw_text !== content.source_url;

  const imageSrc =
    content.content_type === "image"
      ? content.thumbnail_path
        ? convertFileSrc(content.thumbnail_path)
        : content.image_path
          ? convertFileSrc(content.image_path)
          : null
      : null;

  const timeStr = (() => {
    const d = new Date(content.captured_at);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  })();

  return (
    <div className="rounded-xl glass p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white/40 dark:bg-white/[0.04] flex items-center justify-center flex-shrink-0 shadow-sm">
          <TypeIcon className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
        </div>

        <div className="flex-1 min-w-0">
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Preview"
              className="max-w-full max-h-40 rounded-lg object-cover mb-2 border border-gray-200 dark:border-slate-600"
              loading="lazy"
            />
          )}

          {isUrl && hasFetchedText && (
            <>
              <p className="text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-4">
                {content.raw_text}
              </p>
              <a
                href={content.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-blue-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {(() => { try { return new URL(content.source_url!).hostname.replace(/^www\./, ""); } catch { return content.source_url; } })()}
              </a>
            </>
          )}

          {isUrl && !hasFetchedText && content.source_url && (
            <a
              href={content.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-blue-500 hover:text-blue-600 break-all transition-colors"
            >
              {content.source_url}
            </a>
          )}

          {!isUrl && content.raw_text && (
            <p className="text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-6">
              {content.raw_text}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 dark:text-slate-500">
            <span>{timeStr}</span>
            <span>·</span>
            <span>{content.source_app}</span>
            <span>·</span>
            <span>{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
