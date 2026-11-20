import React from "react";
import {
  CalendarDays,
  FolderGit2,
  LayoutDashboard,
  ListTodo,
  Moon,
  Rocket,
  Sun,
} from "lucide-react";
import { DashboardTab } from "../types/dashboard";
import { GitHubMark } from "./UI";

interface SidebarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  tasksRemaining: number;
  avatarUrl: string;
  username: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const NAV_ITEMS: Array<{ id: DashboardTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "نظرة عامة", icon: <LayoutDashboard className="h-[19px] w-[19px]" /> },
  { id: "repositories", label: "المستودعات", icon: <FolderGit2 className="h-[19px] w-[19px]" /> },
  { id: "calendar", label: "التقويم", icon: <CalendarDays className="h-[19px] w-[19px]" /> },
  { id: "workspace", label: "مساحة العمل", icon: <ListTodo className="h-[19px] w-[19px]" /> },
  { id: "deploy", label: "التشغيل على GitHub", icon: <Rocket className="h-[19px] w-[19px]" /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  tasksRemaining,
  avatarUrl,
  username,
  darkMode,
  onToggleDarkMode,
}) => {
  const badgeFor = (id: DashboardTab) => (id === "workspace" ? tasksRemaining : 0);

  return (
    <>
      {/* Desktop icon rail */}
      <aside className="sticky top-0 z-40 hidden h-screen w-[78px] shrink-0 flex-col items-center border-l border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_60%,transparent)] py-4 backdrop-blur-md lg:flex">
        <a
          href="#overview"
          className="group relative mb-6 flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/25 bg-[linear-gradient(180deg,#f7b7a8,#e2947f)] text-[var(--salmon-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_10px_22px_-12px_rgba(240,164,147,.75)]"
          aria-label="GitDash"
        >
          <GitHubMark className="h-5 w-5" />
          <span className="tooltip top-full left-1/2 mt-2 hidden -translate-x-1/2 group-hover:block">
            GitDash · System OS
          </span>
        </a>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            const badge = badgeFor(item.id);
            return (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`nav-rail-btn ${active ? "nav-rail-active" : ""}`}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon}
                  {badge > 0 && (
                    <span className="absolute -bottom-1 -left-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-[var(--bg)] bg-[#ff5b9e] px-[3px] font-mono text-[8px] font-bold text-white shadow-[0_0_8px_rgba(255,91,158,.55)]">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </button>
                <span className="tooltip top-1/2 right-full mr-3 hidden -translate-y-1/2 group-hover:block">
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>

        <div className="mt-2 flex flex-col items-center gap-2">
          <div className="h-px w-7 bg-[var(--line-strong)]" />
          <div className="group relative">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="nav-rail-btn"
              aria-label="تبديل الوضع"
            >
              {darkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <span className="tooltip top-1/2 right-full mr-3 hidden -translate-y-1/2 group-hover:block">
              {darkMode ? "الوضع الفاتح" : "الوضع الزيتوني"}
            </span>
          </div>

          <div className="group relative">
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-full p-0.5 ring-1 ring-[var(--line-strong)] transition hover:ring-[var(--pink)]"
              aria-label={`حساب ${username} على GitHub`}
            >
              <img src={avatarUrl} alt={username} className="h-8 w-8 rounded-full object-cover" />
            </a>
            <span className="tooltip top-1/2 right-full mr-3 hidden -translate-y-1/2 group-hover:block">
              @{username}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition ${
                  active ? "text-[var(--pink)]" : "text-[var(--muted)]"
                }`}
              >
                <span className={`relative ${active ? "nav-rail-active flex h-8 w-8 items-center justify-center rounded-lg" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-[9px] font-medium">{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[var(--muted)]"
          >
            <span className="flex h-8 w-8 items-center justify-center">
              {darkMode ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
            </span>
            <span className="text-[9px] font-medium">الوضع</span>
          </button>
        </div>
      </nav>
    </>
  );
};
