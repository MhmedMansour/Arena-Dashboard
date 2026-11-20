import React, { useState } from "react";
import { ActivityPoint, LanguageStat } from "../types/dashboard";
import { SectionLabel, Tabs } from "./UI";

export const MiniSparkline: React.FC<{ values: number[]; color?: string; className?: string }> = ({
  values,
  color = "var(--salmon)",
  className = "",
}) => {
  const w = 84;
  const h = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / Math.max(1, max - min)) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-7 w-20 overflow-visible ${className}`} aria-hidden="true">
      <polygon points={area} fill={color} opacity="0.14" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={w}
        cy={Number(points.split(" ").pop()?.split(",")[1] || 0)}
        r="1.8"
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  );
};

export const ActivityAreaChart: React.FC<{ data: ActivityPoint[] }> = ({ data }) => {
  const [metric, setMetric] = useState<"commits" | "stars">("commits");
  const [hovered, setHovered] = useState<number | null>(null);

  const width = 640;
  const height = 218;
  const padX = 34;
  const padTop = 16;
  const padBottom = 30;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const values = data.map((d) => (metric === "commits" ? d.commits : d.stars));
  const maxVal = Math.max(10, ...values);

  const points = data.map((d, i) => {
    const x = padX + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
    const val = metric === "commits" ? d.commits : d.stars;
    const y = padTop + innerH - (val / maxVal) * innerH;
    return { x, y, val, label: d.label, commits: d.commits, stars: d.stars };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area =
    points.length > 0
      ? `${line} L ${points[points.length - 1].x} ${padTop + innerH} L ${points[0].x} ${padTop + innerH} Z`
      : "";

  const accent = metric === "commits" ? "#f0a494" : "#ff5b9e";
  const MAX_GOAL = 40;

  return (
    <div className="panel p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <SectionLabel>Activity monitor</SectionLabel>
          <h3 className="text-sm font-bold text-[var(--ink)] sm:text-base">مؤشر النشاط الأسبوعي</h3>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">حركة المساهمات والتفاعل خلال آخر 7 أيام</p>
        </div>
        <Tabs
          active={metric}
          onChange={(id) => setMetric(id as "commits" | "stars")}
          items={[
            { id: "commits", label: "Commits" },
            { id: "stars", label: "Stars" },
          ]}
        />
      </div>

      <div className="panel-inset relative rounded-xl p-2 pt-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible sm:h-52">
          <defs>
            <linearGradient id={`activity-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padTop + innerH * (1 - ratio);
            return (
              <g key={idx}>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="var(--line-strong)"
                  strokeDasharray="3 5"
                  strokeOpacity="0.55"
                />
                <text x={padX - 7} y={y + 3} textAnchor="end" fill="var(--faint)" className="font-mono text-[9px]">
                  {Math.round(maxVal * ratio)}
                </text>
              </g>
            );
          })}

          {area && <path d={area} fill={`url(#activity-${metric})`} />}
          {line && <path d={line} fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}

          {points.map((p, i) => {
            const active = hovered === i;
            return (
              <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
                <rect x={p.x - 22} y={padTop} width={44} height={innerH + 24} fill="transparent" />
                {active && (
                  <line x1={p.x} x2={p.x} y1={padTop} y2={padTop + innerH} stroke={accent} strokeOpacity="0.4" strokeDasharray="3 3" />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={active ? 5.5 : 3.5}
                  fill={active ? accent : "var(--inset)"}
                  stroke={accent}
                  strokeWidth="2"
                  style={active ? { filter: `drop-shadow(0 0 6px ${accent})` } : undefined}
                />
                <text
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-[10px]"
                  fill={active ? "var(--ink)" : "var(--faint)"}
                  fontWeight={active ? 700 : 400}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered !== null && points[hovered] && (
          <div className="pointer-events-none absolute left-3 top-2 rounded-lg border border-white/10 bg-[linear-gradient(180deg,#3d6259,#294742)] px-2.5 py-1.5 text-[10px] text-[var(--teal-ink)] shadow-[0_10px_20px_-12px_#000]">
            <div className="font-semibold">{points[hovered].label}</div>
            <div className="mt-0.5 flex items-center gap-2 font-mono">
              <span>commits {points[hovered].commits}</span>
              <span className="opacity-50">·</span>
              <span>stars {points[hovered].stars}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[10px] text-[var(--faint)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full" style={{ background: "var(--salmon)" }} />
            commits
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full" style={{ background: "var(--pink)" }} />
            stars / interactions
          </span>
        </div>
        <span className="chip chip-teal !text-[9px]">7 days · live</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[
          ["أعلى يوم", `${Math.max(...values)}`, "peak"],
          ["الإجمالي", `${values.reduce((a, b) => a + b, 0)}`, "total"],
          ["المتوسط", `${Math.round(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length))}`, "avg / day"],
          ["الهدف", `${MAX_GOAL}`, "goal"],
        ].map(([label, value, en]) => (
          <div key={String(label)} className="panel-inset rounded-lg px-2 py-1.5">
            <div className="font-display text-sm font-bold leading-none text-[var(--ink)] tabular">{value}</div>
            <div className="mt-0.5 text-[9px] text-[var(--muted)]">{label}</div>
            <div className="font-mono text-[8px] text-[var(--faint)]">{en}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="eyebrow !text-[8px] shrink-0">Strip</span>
        <div className="flex flex-1 gap-1">
          {Array.from({ length: 28 }, (_, i) => {
            const v = data[i % data.length];
            const level = Math.min(4, Math.max(0, Math.round((metric === "commits" ? v.commits : v.stars) / Math.max(4, maxVal / 4))));
            return <span key={i} className="heat-cell flex-1" data-level={level} />;
          })}
        </div>
        <span className="font-mono text-[8px] text-[var(--faint)]">28d</span>
      </div>
    </div>
  );
};

export const LanguageBreakdown: React.FC<{ stats: LanguageStat[]; totalRepos: number }> = ({
  stats,
  totalRepos,
}) => (
  <div className="panel p-4 sm:p-5">
    <SectionLabel action={<span className="chip !py-0.5 !text-[9px]">{totalRepos} repos</span>}>
      Language split
    </SectionLabel>
    <h3 className="text-sm font-bold text-[var(--ink)]">توزيع اللغات البرمجية</h3>

    {stats.length === 0 ? (
      <p className="py-8 text-center text-[11px] text-[var(--faint)]">لا توجد لغات مسجلة في هذه المستودعات</p>
    ) : (
      <>
        <div className="my-3.5 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--inset)] shadow-[inset_0_1px_3px_var(--shadow-dark)]">
          {stats.map((lang) => (
            <div
              key={lang.name}
              className="h-full transition-all"
              style={{ width: `${lang.percentage}%`, background: lang.color, opacity: 0.9 }}
              title={`${lang.name} ${lang.percentage}%`}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {stats.map((lang) => (
            <div key={lang.name} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: lang.color }} />
                <span className="truncate font-mono text-[10px]">{lang.name}</span>
              </span>
              <span className="font-mono text-[10px] font-semibold text-[var(--ink)] tabular">{lang.percentage}%</span>
            </div>
          ))}
        </div>

        <div className="divider-soft my-3" />
        <div className="flex items-center justify-between text-[10px] text-[var(--faint)]">
          <span>إجمالي المستودعات المفحوصة</span>
          <span className="font-mono font-semibold text-[var(--ink)]">{totalRepos}</span>
        </div>
      </>
    )}
  </div>
);
