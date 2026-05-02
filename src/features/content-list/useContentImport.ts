import { useCallback, useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import type { TFunction } from "i18next";
import {
  importContentFiles,
  type ContentImportEntry,
  type ContentImportKind,
} from "../../services/storageService";

const LONG_IMPORT_NOTICE_MS = 8000;

interface UseContentImportOptions {
  importInputRef: RefObject<HTMLInputElement | null>;
  importPanelRef: RefObject<HTMLDivElement | null>;
  getImportKind: (file: File) => ContentImportKind | null;
  readFileAsBase64: (file: File) => Promise<string>;
  loadInitial: () => Promise<void>;
  setHighlightedIds: (ids: string[]) => void;
  t: TFunction<"content">;
}

export type ImportStatus = "idle" | "picking" | "reading" | "converting" | "saving" | "done" | "error";

interface UseContentImportResult {
  importStatus: ImportStatus;
  importMessage: string;
  isImportTakingLong: boolean;
  isImportPanelOpen: boolean;
  isImportBusy: boolean;
  openImportPanel: () => void;
  handleChooseFiles: () => void;
  handleContentImport: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function useContentImport({
  importInputRef,
  importPanelRef,
  getImportKind,
  readFileAsBase64,
  loadInitial,
  setHighlightedIds,
  t,
}: UseContentImportOptions): UseContentImportResult {
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importMessage, setImportMessage] = useState("");
  const [isImportTakingLong, setIsImportTakingLong] = useState(false);
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const importStatusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importPickerOpenRef = useRef(false);

  const scheduleImportStatusReset = useCallback((delayMs: number) => {
    if (importStatusResetTimerRef.current) {
      clearTimeout(importStatusResetTimerRef.current);
    }
    importStatusResetTimerRef.current = setTimeout(() => setImportStatus("idle"), delayMs);
  }, []);

  useEffect(
    () => () => {
      if (importStatusResetTimerRef.current) clearTimeout(importStatusResetTimerRef.current);
    },
    []
  );

  const openImportPanel = useCallback(() => {
    setIsImportPanelOpen((open) => !open);
  }, []);

  const handleChooseFiles = useCallback(() => {
    if (!importInputRef.current) {
      setImportStatus("error");
      setImportMessage(t("import.failed"));
      scheduleImportStatusReset(3000);
      return;
    }
    importPickerOpenRef.current = true;
    setImportStatus("picking");
    setImportMessage(t("import.choosing"));
    setIsImportPanelOpen(false);
    importInputRef.current.click();
  }, [importInputRef, scheduleImportStatusReset, t]);

  const importFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setImportStatus("idle");
      setImportMessage("");
      return;
    }

    const supportedFiles = files
      .map((file) => ({ file, kind: getImportKind(file) }))
      .filter((item): item is { file: File; kind: ContentImportKind } => item.kind !== null);

    if (supportedFiles.length === 0) {
      setImportStatus("error");
      setImportMessage(t("import.unsupported"));
      scheduleImportStatusReset(3000);
      return;
    }

    setImportStatus("reading");
    setImportMessage(t("import.reading", { count: supportedFiles.length }));
    setIsImportTakingLong(false);
    setIsImportPanelOpen(false);
    try {
      const hasDocument = supportedFiles.some(({ kind }) => kind === "document");
      const entries = await Promise.all(
        supportedFiles.map(async ({ file, kind }): Promise<ContentImportEntry> => {
          if (kind === "image" || kind === "document") {
            return {
              file_name: file.name,
              kind,
              data_base64: await readFileAsBase64(file),
            };
          }
          return {
            file_name: file.name,
            kind,
            text: await file.text(),
          };
        })
      );
      setImportStatus(hasDocument ? "converting" : "saving");
      setImportMessage(hasDocument ? t("import.converting") : t("import.saving"));
      const result = await importContentFiles(entries);
      setImportStatus("saving");
      setImportMessage(t("import.saving"));
      await loadInitial();

      const importedIds = result.imported.map((item) => item.id);
      if (importedIds.length > 0) {
        setHighlightedIds(importedIds);
      }

      const skipped = result.skipped_duplicates + result.skipped_invalid;
      if (result.imported.length === 0 && result.failed.length > 0) {
        setImportStatus("error");
        setImportMessage(t("import.failedWithReason", { reason: result.failed[0] }));
      } else {
        setImportStatus("done");
        setImportMessage(t("import.done", {
          imported: result.imported.length,
          skipped,
          failed: result.failed.length,
        }));
      }
      scheduleImportStatusReset(4000);
    } catch (e) {
      console.error("Failed to import content:", e);
      setImportStatus("error");
      setImportMessage(t("import.failed"));
      scheduleImportStatusReset(4000);
    }
  }, [getImportKind, loadInitial, readFileAsBase64, scheduleImportStatusReset, setHighlightedIds, t]);

  useEffect(() => {
    const isProcessing = importStatus === "reading" || importStatus === "converting" || importStatus === "saving";
    if (!isProcessing) return;

    const timer = setTimeout(() => setIsImportTakingLong(true), LONG_IMPORT_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [importStatus]);

  const handleContentImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    importPickerOpenRef.current = false;
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await importFiles(files);
  }, [importFiles]);

  useEffect(() => {
    if (!isImportPanelOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!importPanelRef.current?.contains(event.target as Node)) {
        setIsImportPanelOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImportPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [importPanelRef, isImportPanelOpen]);

  return {
    importStatus,
    importMessage,
    isImportTakingLong,
    isImportPanelOpen,
    isImportBusy: importStatus === "picking" || importStatus === "reading" || importStatus === "converting" || importStatus === "saving",
    openImportPanel,
    handleChooseFiles,
    handleContentImport,
  };
}
