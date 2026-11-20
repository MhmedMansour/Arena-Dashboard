import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  XCircle,
} from "lucide-react";

export const GitHubMark: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface SectionLabelProps {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, action, className = "" }) => (
  <div className={`mb-2 flex items-center justify-between gap-3 px-0.5 ${className}`}>
    <span className="eyebrow">{children}</span>
    {action}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "ghost",
  icon,
  trailing,
  children,
  className = "",
  type = "button",
  ...rest
}) => (
  <button
    type={type}
    className={`btn ${
      variant === "primary" ? "btn-primary" : variant === "secondary" ? "btn-secondary" : "btn-ghost"
    } ${className}`}
    {...rest}
  >
    {icon}
    {children}
    {trailing}
  </button>
);

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  side?: "top" | "bottom" | "start" | "end";
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  side = "bottom",
  children,
  className = "",
  type = "button",
  ...rest
}) => {
  const pos =
    side === "bottom"
      ? "top-full mt-2 left-1/2 -translate-x-1/2"
      : side === "top"
        ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
        : side === "start"
          ? "right-full mr-2 top-1/2 -translate-y-1/2"
          : "left-full ml-2 top-1/2 -translate-y-1/2";
  return (
    <div className="group relative inline-flex">
      <button type={type} className={`btn-icon ${className}`} aria-label={label} {...rest}>
        {children}
      </button>
      <span className={`tooltip hidden opacity-0 transition group-hover:block group-hover:opacity-100 ${pos}`}>
        {label}
      </span>
    </div>
  );
};

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: "sm" | "md";
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, size = "md" }) => {
  const w = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex ${w} shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? "border-white/15"
            : "border-[var(--line)] bg-[var(--inset)] shadow-[inset_0_2px_5px_var(--shadow-dark)]"
        }`}
        style={
          checked
            ? {
                background: "linear-gradient(180deg,#f4ae9e,#e89a87)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,.5), 0 0 14px -4px rgba(240,164,147,.6)",
              }
            : undefined
        }
      >
        <span
          className={`absolute top-1/2 ${knob} -translate-y-1/2 rounded-full transition-all ${
            checked
              ? "right-0.5 bg-[#3d2820] shadow-[inset_0_1px_1px_rgba(255,255,255,.25)]"
              : "right-[calc(100%-1.15rem)] bg-[var(--faint)]"
          }`}
        />
      </button>
      {label && <span className="text-[11px] text-[var(--muted)]">{label}</span>}
    </label>
  );
};

interface TabsProps {
  items: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ items, active, onChange }) => (
  <div className="panel-inset inline-flex flex-wrap items-center gap-1 rounded-xl p-1">
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        onClick={() => onChange(item.id)}
        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
          active === item.id
            ? "bg-[linear-gradient(180deg,#f6b4a5,#e99a87)] text-[var(--salmon-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_4px_10px_-6px_rgba(240,164,147,.7)]"
            : "text-[var(--muted)] hover:text-[var(--ink)]"
        }`}
      >
        {item.label}
        {item.count !== undefined && (
          <span className="mr-1.5 font-mono text-[10px] opacity-70">{item.count}</span>
        )}
      </button>
    ))}
  </div>
);

interface BadgeProps {
  tone: "success" | "danger" | "warning" | "info" | "pink";
  count?: React.ReactNode;
  label?: string;
}

const BADGE_TONES: Record<BadgeProps["tone"], string> = {
  success: "#7fae6f",
  danger: "#d2624f",
  warning: "#c9a13f",
  info: "#5b8fb9",
  pink: "#ff5b9e",
};

export const Badge: React.FC<BadgeProps> = ({ tone, count, label }) => (
  <div className="flex flex-col items-center gap-1">
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 font-mono text-[10px] font-bold text-[#26302a]"
      style={{
        background: BADGE_TONES[tone],
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.45), 0 0 12px -3px ${BADGE_TONES[tone]}88`,
      }}
    >
      {count ?? <Check className="h-3 w-3" />}
    </span>
    {label && <span className="text-[9px] text-[var(--faint)]">{label}</span>}
  </div>
);

interface StepperProps {
  steps: string[];
  current: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, current }) => (
  <div className="w-full">
    <div className="flex items-center gap-1.5">
      {steps.map((_, i) => (
        <div key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--inset)] shadow-[inset_0_1px_2px_var(--shadow-dark)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: i <= current ? "100%" : "0%",
              background: "linear-gradient(90deg,#f7bcae,#ec9c89)",
              boxShadow: "0 0 10px rgba(240,164,147,.45)",
            }}
          />
        </div>
      ))}
    </div>
    <div className="mt-1.5 flex justify-between gap-2">
      {steps.map((step, i) => (
        <span
          key={i}
          className={`text-[10px] ${i <= current ? "font-semibold text-[var(--ink)]" : "text-[var(--faint)]"}`}
        >
          {step}
        </span>
      ))}
    </div>
  </div>
);

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5);
  return (
    <div className="panel-inset inline-flex items-center gap-1 rounded-xl p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-raised)] hover:text-[var(--ink)] disabled:opacity-30"
        aria-label="السابق"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[11px] transition ${
            p === page
              ? "bg-[linear-gradient(180deg,#f7b7a8,#eb9a87)] font-bold text-[var(--salmon-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_0_12px_-2px_rgba(255,91,158,.4)]"
              : "text-[var(--muted)] hover:bg-[var(--panel-raised)] hover:text-[var(--ink)]"
          }`}
        >
          {p}
        </button>
      ))}
      {totalPages > 5 && <span className="px-1 text-[11px] text-[var(--faint)]">…</span>}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-raised)] hover:text-[var(--ink)] disabled:opacity-30"
        aria-label="التالي"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
    <div className="panel-inset mb-3 flex h-20 w-24 items-center justify-center rounded-2xl">
      <svg viewBox="0 0 96 64" className="h-14 w-16" fill="none">
        <path d="M12 54h72" stroke="var(--line-strong)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M28 54V38l12-9 12 9v16" stroke="var(--salmon)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 54V30l18-14 18 14v24" stroke="var(--muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
        <circle cx="66" cy="22" r="10" stroke="var(--pink)" strokeWidth="1.5" opacity=".8" />
        <path d="M66 16v6l4 2" stroke="var(--pink)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="40" cy="46" r="1.6" fill="var(--pink)" />
        <circle cx="74" cy="44" r="1.2" fill="var(--pink)" opacity=".6" />
      </svg>
    </div>
    <h4 className="text-sm font-semibold text-[var(--ink)]">{title}</h4>
    <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-[var(--muted)]">{text}</p>
  </div>
);

interface NoticeProps {
  title: string;
  text: string;
  tone?: "success" | "error" | "info";
  onClose?: () => void;
}

export const Notice: React.FC<NoticeProps> = ({ title, text, tone = "success", onClose }) => {
  const tones = {
    success: {
      color: "var(--success)",
      bg: "var(--success-bg)",
      border: "rgba(166,207,154,.35)",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    error: {
      color: "var(--danger)",
      bg: "rgba(239,143,143,.1)",
      border: "rgba(239,143,143,.3)",
      icon: <XCircle className="h-4 w-4" />,
    },
    info: {
      color: "var(--warning)",
      bg: "rgba(236,201,138,.1)",
      border: "rgba(236,201,138,.28)",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  }[tone];

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5"
      style={{ background: tones.bg, borderColor: tones.border, boxShadow: `inset 0 1px 0 var(--shadow-light)` }}
    >
      <span className="mt-0.5" style={{ color: tones.color }}>
        {tones.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold" style={{ color: tones.color }}>
          {title}
        </div>
        <div className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">{text}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-0.5 text-[var(--muted)] transition hover:text-[var(--ink)]"
          aria-label="إغلاق"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export const TooltipBubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative inline-flex flex-col items-center">
    <div
      className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,#3d6259,#294742)] px-2.5 py-1 text-[10px] font-medium text-[var(--teal-ink)] shadow-[0_10px_20px_-12px_#000]"
    >
      {children}
    </div>
    <span className="h-1.5 w-1.5 -translate-y-0.5 rotate-45 border-r border-b border-white/10 bg-[#294742]" />
  </div>
);

export const InfoRow: React.FC<{ icon?: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      {icon}
      {label}
    </span>
    <span className="font-mono text-[11px] font-semibold text-[var(--ink)] tabular">{value}</span>
  </div>
);

export const Breadcrumb: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="panel-inset inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] text-[var(--muted)]">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        <span className={i === items.length - 1 ? "font-semibold text-[var(--ink)]" : ""}>{item}</span>
        {i < items.length - 1 && (
          <>
            {i === 0 ? (
              <ArrowLeft className="h-3 w-3 text-[var(--faint)]" />
            ) : (
              <ArrowRight className="h-3 w-3 rotate-180 text-[var(--faint)]" />
            )}
          </>
        )}
      </React.Fragment>
    ))}
  </div>
);

export const TooltipHint: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-flex">
    <Info className="h-3.5 w-3.5 cursor-help text-[var(--faint)] transition group-hover:text-[var(--ink)]" />
    <span className="tooltip top-full left-1/2 mt-2 hidden -translate-x-1/2 group-hover:block">{text}</span>
  </div>
);
