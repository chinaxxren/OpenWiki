import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock3, RefreshCw, Target, Trash2, Zap } from "lucide-react";
import type {
  Glance,
  InfoDiet,
  SubconsciousItem,
  Graveyard,
  BlindSpot,
  Action,
  HeatmapDay,
  TopicItem,
  Verdict,
  Footer,
  BriefingTopic,
  RadarReport,
} from "../../services/radarService";
import { formatHeatDate, parsePercent, sourceGradient } from "./radarViewLogic";

const ACCENT = "#F97316";

export function RadarReportContent({
  report,
  analysis,
  hasReport,
  hasLegacy,
  isAnalyzing,
  t,
}: {
  report: RadarReport | null;
  analysis: { topics?: BriefingTopic[] } | null;
  hasReport: boolean;
  hasLegacy: boolean;
  isAnalyzing: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <>
      {!hasReport && hasLegacy && analysis && (
        <>
          <LegacyBriefingHero topic={analysis.topics![0]} />
          {analysis.topics!.length > 1 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {analysis.topics!.slice(1).map((topic) => (
                <LegacyBriefingSecondary key={topic.id} topic={topic} />
              ))}
            </div>
          )}
        </>
      )}

      {!report || !hasReport ? null : (
        <div>
          <StatsGrid report={report} />
          <Section num="01" title={t("radar.sections.atAGlance")} subtitle={t("radar.sections.atAGlanceSubtitle")}>
            <AtAGlanceBody items={report.at_a_glance} />
          </Section>
          <Section num="02" title={t("radar.sections.infoDiet")} subtitle={t("radar.sections.infoDietSubtitle")}>
            <InfoDietBody diet={report.info_diet} />
          </Section>
          <Section num="03" title={t("radar.sections.subconscious")} subtitle={t("radar.sections.subconsciousSubtitle")}>
            <SubconsciousBody items={report.subconscious} />
          </Section>
          <Section num="04" title={t("radar.sections.graveyard")} subtitle={t("radar.sections.graveyardSubtitle")}>
            <GraveyardBody graveyard={report.graveyard} />
          </Section>
          <Section num="05" title={t("radar.sections.blindSpots")} subtitle={t("radar.sections.blindSpotsSubtitle")}>
            <BlindSpotsBody items={report.blind_spots} />
          </Section>
          <Section num="06" title={t("radar.sections.actions")} subtitle={t("radar.sections.actionsSubtitle")}>
            <ActionsBody items={report.actions} />
          </Section>
          <Section num="⊹" title={t("radar.sections.heatmap")} subtitle={t("radar.sections.heatmapSubtitle")}>
            <HeatmapBody days={report.heatmap} />
            <div style={{ height: 1, backgroundColor: "var(--color-border)", margin: "16px 0" }} />
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 10 }}>{t("radar.sections.topicDistribution")}</div>
            <TopicCloudBody items={report.topic_cloud} />
          </Section>
          <Section num="07" title={t("radar.sections.verdict")} subtitle={t("radar.sections.verdictSubtitle")}>
            <VerdictBody verdict={report.verdict} />
          </Section>
          <ReportFooter footer={report.footer} />

          {isAnalyzing && (
            <div className="text-center py-6">
              <RefreshCw size={16} className="animate-spin text-stone-400 mx-auto mb-2" />
              <p className="text-stone-400" style={{ fontSize: 13 }}>{t("radar.updating")}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function StatsGrid({ report }: { report: RadarReport }) {
  const { t } = useTranslation("digest");
  const { meta } = report;
  const stats = [
    { n: meta.total_items, l: t("radar.stats.savedItems") },
    { n: meta.active_days, l: t("radar.stats.activeDays") },
    { n: meta.annotated_items, l: t("radar.stats.annotated") },
    { n: meta.annotation_rate, l: t("radar.stats.annotationRate") },
    { n: meta.source_count, l: t("radar.stats.sources") },
  ];
  return (
    <div className="grid grid-cols-5 mb-6 overflow-hidden" style={{ borderRadius: 14, border: "1px solid var(--color-border)" }}>
      {stats.map((s, i) => (
        <div
          key={i}
          className="text-center py-4 px-2"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRight: i < 4 ? "1px solid var(--color-border)" : undefined,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: ACCENT }}>
            {s.n}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 4, textTransform: "uppercase" }}>
            {s.l}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ num, title, subtitle, children }: { num: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mb-5" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16 }}>
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>
          {num}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
          {title} <span style={{ color: ACCENT }}>{subtitle}</span>
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function AtAGlanceBody({ items }: { items: Glance[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-4" style={{ backgroundColor: `${ACCENT}08`, border: `1px solid ${ACCENT}20` }}>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--color-text-secondary)" }}>
            <HighlightText text={item.text} highlight={item.highlight} />
          </p>
        </div>
      ))}
    </div>
  );
}

function InfoDietBody({ diet }: { diet: InfoDiet }) {
  const { t } = useTranslation("digest");
  const maxCount = Math.max(...diet.sources.map((s) => s.count), 1);
  return (
    <>
      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 10 }}>{t("radar.infoDiet.sourceDistribution")}</div>
      <div className="space-y-2 mb-4">
        {diet.sources.map((src) => (
          <div key={src.name} className="flex items-center gap-3">
            <span className="w-20 text-right shrink-0" style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {src.name}
            </span>
            <div className="flex-1 rounded-md overflow-hidden" style={{ height: 24, backgroundColor: "var(--color-surface-raised, #F5F5F0)" }}>
              <div
                className="h-full rounded-md flex items-center justify-end px-2"
                style={{
                  width: `${Math.max((src.count / maxCount) * 100, 8)}%`,
                  background: sourceGradient(src.color),
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{src.count}{t("radar.infoDiet.itemsUnit")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MiniCard title={t("radar.infoDiet.depthVsFragment")} value={diet.depth_ratio.label} percent={parsePercent(diet.depth_ratio.label)} />
        <MiniCard title={t("radar.infoDiet.dietBias")} value={`${diet.dominant_topic.name} ${diet.dominant_topic.percent.toFixed(0)}%`} percent={diet.dominant_topic.percent} />
      </div>
      {diet.alert && (
        <div className="flex gap-2 rounded-xl px-4 py-3" style={{ fontSize: 13, backgroundColor: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", color: "var(--color-text-secondary)" }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          <span>{diet.alert}</span>
        </div>
      )}
    </>
  );
}

function MiniCard({ title, value, percent }: { title: string; value: string; percent: number }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-surface-raised, #F5F5F0)", border: "1px solid var(--color-border)" }}>
      <div style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{value}</div>
      <div className="mt-2 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "var(--color-border)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, background: `linear-gradient(90deg, ${ACCENT}, #FB923C)` }} />
      </div>
    </div>
  );
}

function SubconsciousBody({ items }: { items: SubconsciousItem[] }) {
  const { t } = useTranslation("digest");
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-r-xl py-3 px-4" style={{ backgroundColor: "var(--color-surface-raised, #F5F5F0)", borderLeft: `3px solid ${ACCENT}` }}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
              <Target className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
              {item.title}
            </span>
            {item.evidence_count != null && (
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: ACCENT, whiteSpace: "nowrap" }}>
                {t("radar.subconscious.evidenceCount", { count: item.evidence_count })}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function GraveyardBody({ graveyard }: { graveyard: Graveyard }) {
  const { t } = useTranslation("digest");
  return (
    <>
      <div className="flex gap-2 rounded-xl px-4 py-3 mb-4" style={{ fontSize: 13, backgroundColor: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", color: "var(--color-text-secondary)" }}>
        <Trash2 className="w-4 h-4 mt-0.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
        <span>{graveyard.alert}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 10 }}>{t("radar.graveyard.worthReading")}</div>
      <div className="space-y-3">
        {graveyard.top_picks.map((pick) => (
          <div key={pick.rank} className="rounded-xl p-4 flex gap-3" style={{ backgroundColor: "var(--color-surface-raised, #F5F5F0)", border: "1px solid var(--color-border)" }}>
            <div className="shrink-0 flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, #EA580C)`, color: "#fff", fontSize: 13, fontWeight: 800 }}>
              {pick.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{pick.title}</div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text-secondary)", marginBottom: 8 }}>{pick.reason}</p>
              {pick.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pick.tags.map((tag) => (
                    <span key={tag} className="rounded-full px-2.5 py-0.5" style={{ fontSize: 10, color: ACCENT, backgroundColor: `${ACCENT}10`, border: `1px solid ${ACCENT}25` }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function BlindSpotsBody({ items }: { items: BlindSpot[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-4" style={{ backgroundColor: `${ACCENT}08`, border: `1px solid ${ACCENT}20` }}>
          <h4 className="mb-1" style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{item.title}</h4>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function ActionsBody({ items }: { items: Action[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-4 flex gap-3" style={{ backgroundColor: "var(--color-surface-raised, #F5F5F0)", border: "1px solid var(--color-border)" }}>
          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{item.title}</div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text-secondary)", marginBottom: 8 }}>{item.desc}</p>
            <div className="flex items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 10, color: ACCENT, backgroundColor: `${ACCENT}10`, border: `1px solid ${ACCENT}25` }}>
                {item.ref}
              </span>
              <span className="rounded-full px-2.5 py-0.5" style={{ fontSize: 10, color: "#10B981", backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="w-3 h-3" />
                  {item.time}
                </span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeatmapBody({ days }: { days: HeatmapDay[] }) {
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  return (
    <div className="flex gap-2 flex-wrap">
      {days.map((day) => {
        const intensity = day.count / maxCount;
        const isPeak = intensity > 0.8 && day.count > 0;
        const bg = day.count === 0
          ? "var(--color-surface-raised, #F5F5F0)"
          : `rgba(249, 115, 22, ${0.15 + intensity * 0.85})`;

        return (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, backgroundColor: bg, border: day.count === 0 ? "1px solid var(--color-border)" : undefined }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: intensity > 0.4 ? "#fff" : "var(--color-text-muted)" }}>
                {day.count > 0 ? day.count : ""}
              </span>
            </div>
            <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
              <span className="inline-flex items-center gap-0.5">
                {formatHeatDate(day.date)}
                {isPeak ? <Zap className="w-3 h-3 text-orange-500" /> : null}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopicCloudBody({ items }: { items: TopicItem[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.name}
          className="rounded-full px-3 py-1"
          style={{ fontSize: 13, color: ACCENT, backgroundColor: `${ACCENT}10`, border: `1px solid ${ACCENT}25` }}
        >
          {item.name} ({item.percent.toFixed(0)}%)
        </span>
      ))}
    </div>
  );
}

function VerdictBody({ verdict }: { verdict: Verdict }) {
  return (
    <div
      className="rounded-xl py-6 px-5 text-center"
      style={{ background: `linear-gradient(135deg, ${ACCENT}12, rgba(234, 88, 12, 0.08))`, border: `1px solid ${ACCENT}30` }}
    >
      <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.7, fontFamily: "'Cabinet Grotesk', sans-serif", color: "var(--color-text-primary)" }}>
        <HighlightVerdict text={verdict.text} highlights={verdict.highlights} />
      </p>
    </div>
  );
}

function ReportFooter({ footer }: { footer: Footer }) {
  const { t } = useTranslation("digest");
  return (
    <div className="text-center py-4 mt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text-muted)" }}>
        <strong>{t("radar.footer.brand")}</strong> · {footer.date_range} · {t("radar.footer.itemsCount", { count: footer.total })} · {t("radar.footer.activeDays", { active: footer.active_days, total: footer.total_days })}
      </div>
    </div>
  );
}

function LegacyBriefingHero({ topic }: { topic: BriefingTopic }) {
  const { t } = useTranslation("digest");
  return (
    <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: ACCENT }}>{topic.tag}</span>
      </div>
      <h3 className="mb-3" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{topic.insight_title}</h3>
      {topic.key_findings.length > 0 && (
        <div className="mb-3 space-y-2">
          {topic.key_findings.map((finding, i) => (
            <div key={i} className="flex gap-2" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text-secondary)" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, minWidth: 18, paddingTop: 2 }}>{i + 1}</span>
              <span>{finding}</span>
            </div>
          ))}
        </div>
      )}
      {topic.suggestion && (
        <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: ACCENT, marginBottom: 4 }}>{t("radar.legacy.suggestion")}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text-secondary)" }}>{topic.suggestion}</div>
        </div>
      )}
      <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)", fontSize: 11, color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
        {t("radar.legacy.contentCount", { count: topic.content_count })} · {t("radar.legacy.spanDays", { count: topic.span_days })}
      </div>
    </div>
  );
}

function LegacyBriefingSecondary({ topic }: { topic: BriefingTopic }) {
  const { t } = useTranslation("digest");
  const tagColor = topic.tag === t("insight.tag.emergingInterest") ? "#4ADE80" : "#3B82F6";
  const truncatedAnalysis = topic.deep_analysis.length > 80 ? topic.deep_analysis.slice(0, 80) + "..." : topic.deep_analysis;
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tagColor }} />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: tagColor }}>{topic.tag}</span>
      </div>
      <h4 className="mb-1.5" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{topic.insight_title}</h4>
      <p className="mb-2.5" style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-text-muted)" }}>{truncatedAnalysis}</p>
      <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
        {t("radar.legacy.itemsShort", { count: topic.content_count })} · {t("radar.legacy.daysShort", { count: topic.span_days })}
      </div>
    </div>
  );
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight) return <>{text}</>;
  const idx = text.indexOf(highlight);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: ACCENT, fontWeight: 600 }}>{highlight}</span>
      {text.slice(idx + highlight.length)}
    </>
  );
}

function HighlightVerdict({ text, highlights }: { text: string; highlights: string[] }) {
  if (!highlights.length) return <>{text}</>;
  let parts: (string | { hl: string })[] = [text];
  for (const hl of highlights) {
    const newParts: (string | { hl: string })[] = [];
    for (const part of parts) {
      if (typeof part !== "string") { newParts.push(part); continue; }
      const idx = part.indexOf(hl);
      if (idx === -1) { newParts.push(part); } else {
        if (idx > 0) newParts.push(part.slice(0, idx));
        newParts.push({ hl });
        if (idx + hl.length < part.length) newParts.push(part.slice(idx + hl.length));
      }
    }
    parts = newParts;
  }
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string"
          ? <span key={i}>{p}</span>
          : <span key={i} style={{ color: ACCENT }}>{p.hl}</span>
      )}
    </>
  );
}
