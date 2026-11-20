import React, { useState } from "react";
import {
  KeyRound,
  Moon,
  RefreshCw,
  Search,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DataSourceMode } from "../types/dashboard";
import { Button, GitHubMark, IconButton } from "./UI";

interface HeaderProps {
  currentUsername: string;
  onSearchUsername: (username: string) => void;
  onRefresh: () => void;
  loading: boolean;
  source: DataSourceMode;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  token: string;
  onSaveToken: (token: string) => void;
  avatarUrl: string;
  breadcrumb: string;
}

const PRESETS = ["vercel", "tailwindlabs", "facebook", "microsoft"];

export const Header: React.FC<HeaderProps> = ({
  currentUsername,
  onSearchUsername,
  onRefresh,
  loading,
  source,
  darkMode,
  onToggleDarkMode,
  token,
  onSaveToken,
  avatarUrl,
  breadcrumb,
}) => {
  const [inputVal, setInputVal] = useState(currentUsername);
  const [showToken, setShowToken] = useState(false);
  const [tokenDraft, setTokenDraft] = useState(token);

  React.useEffect(() => setInputVal(currentUsername), [currentUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) onSearchUsername(inputVal.trim());
  };

  const status = {
    live: { label: "GitHub API · متصل", color: "var(--success)", icon: <Wifi className="h-3 w-3" /> },
    cached: { label: "ذاكرة محلية", color: "var(--warning)", icon: <Wifi className="h-3 w-3" /> },
    demo: { label: "وضع العرض", color: "var(--pink)", icon: <WifiOff className="h-3 w-3" /> },
  }[source];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
        {/* Right cluster: brand on mobile + breadcrumb + search */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <a
            href="#overview"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-[linear-gradient(180deg,#f7b7a8,#e2947f)] text-[var(--salmon-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_8px_18px_-12px_rgba(240,164,147,.8)] lg:hidden"
            aria-label="GitDash"
          >
            <GitHubMark className="h-4 w-4" />
          </a>

          <div className="hidden items-center gap-1.5 md:flex">
            <div className="panel-inset flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-[var(--muted)]">
              <GitHubMark className="h-3 w-3" />
              <span>Dashboard</span>
              <span className="text-[var(--faint)]">/</span>
              <span className="font-semibold text-[var(--ink)]">{breadcrumb}</span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="panel-inset flex min-w-0 max-w-[320px] flex-1 items-center gap-1.5 rounded-xl py-1 pr-3 pl-1"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" />
            <div className="min-w-0 flex-1">
              <label className="eyebrow block !text-[8px] !tracking-[0.12em]">GitHub profile</label>
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="username"
                dir="ltr"
                className="w-full bg-transparent font-mono text-[11px] text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" className="!px-2.5 !py-1.5 !text-[10px]" disabled={loading}>
              جلب
            </Button>
          </form>

          <div className="hidden items-center gap-1 xl:flex">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setInputVal(preset);
                  onSearchUsername(preset);
                }}
                className={`rounded-lg px-2 py-1 font-mono text-[10px] transition ${
                  currentUsername.toLowerCase() === preset
                    ? "bg-[var(--pink-soft)] text-[var(--pink)] ring-1 ring-[rgba(255,91,158,.35)]"
                    : "text-[var(--faint)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
                }`}
              >
                @{preset}
              </button>
            ))}
          </div>
        </div>

        {/* Left cluster: status + actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_60%,transparent)] px-2.5 py-1.5 text-[10px] font-medium sm:inline-flex"
            style={{ color: status.color }}
          >
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
            {status.icon}
          </span>

          <div className="relative">
            <IconButton
              label="GitHub Token"
              onClick={() => {
                setTokenDraft(token);
                setShowToken(!showToken);
              }}
              className={token ? "!text-[var(--pink)] !border-[rgba(255,91,158,.4)]" : ""}
            >
              <KeyRound className="h-4 w-4" />
            </IconButton>

            {showToken && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToken(false)} />
                <div className="panel absolute left-0 top-full z-50 mt-2 w-72 !rounded-xl p-3.5">
                  <div className="eyebrow mb-1">Access token · optional</div>
                  <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                    يُحفظ في متصفحك فقط لزيادة حد الطلبات من 60 إلى 5000 طلب/ساعة.
                  </p>
                  <input
                    type="password"
                    value={tokenDraft}
                    onChange={(e) => setTokenDraft(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    dir="ltr"
                    className="field mt-2 font-mono !text-[11px]"
                  />
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <Button
                      onClick={() => {
                        onSaveToken("");
                        setShowToken(false);
                      }}
                      className="!px-2 !py-1.5 !text-[10px]"
                    >
                      مسح
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        onSaveToken(tokenDraft.trim());
                        setShowToken(false);
                      }}
                      className="!px-2.5 !py-1.5 !text-[10px]"
                    >
                      حفظ محلياً
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            variant="primary"
            onClick={onRefresh}
            disabled={loading}
            icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />}
            className="!px-2.5 sm:!px-3.5"
          >
            <span className="hidden sm:inline">تحديث</span>
          </Button>

          <IconButton label={darkMode ? "الوضع الفاتح" : "الوضع الزيتوني"} onClick={onToggleDarkMode}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>

          <a
            href="https://github.com/settings/profile"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full ring-1 ring-[var(--line-strong)] transition hover:ring-[var(--pink)] sm:block"
            aria-label="إعدادات حساب GitHub"
          >
            <img src={avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
          </a>
        </div>
      </div>
    </header>
  );
};
