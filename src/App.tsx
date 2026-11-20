import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { CalendarView } from "./components/CalendarView";
import { DeployGuideView } from "./components/DeployGuideView";
import { Header } from "./components/Header";
import { OverviewView } from "./components/OverviewView";
import { RepositoriesView } from "./components/RepositoriesView";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceView } from "./components/WorkspaceView";
import { DEFAULT_LINKS, DEFAULT_TASKS, DEMO_EVENTS, DEMO_REPOS, DEMO_USER } from "./data/fallbackData";
import { DashboardPayload, fetchGitHubDashboard } from "./services/githubApi";
import { DashboardTab, QuickLink, WorkspaceTask } from "./types/dashboard";
import { todayKey } from "./utils/date";

const VALID_TABS: DashboardTab[] = ["overview", "repositories", "calendar", "workspace", "deploy"];

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: "نظرة عامة",
  repositories: "المستودعات",
  calendar: "التقويم",
  workspace: "مساحة العمل",
  deploy: "التشغيل على GitHub",
};

function getTabFromHash(): DashboardTab {
  const hash = window.location.hash.replace("#", "") as DashboardTab;
  return VALID_TABS.includes(hash) ? hash : "overview";
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => getTabFromHash());

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("gitdash_theme") !== "light";
    } catch {
      return true;
    }
  });

  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem("gitdash_username") || "vercel";
    } catch {
      return "vercel";
    }
  });

  const [token, setToken] = useState<string>(() => {
    try {
      return localStorage.getItem("gitdash_token") || "";
    } catch {
      return "";
    }
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      return localStorage.getItem("gitdash_selected_date") || todayKey();
    } catch {
      return todayKey();
    }
  });

  const [payload, setPayload] = useState<DashboardPayload>({
    user: DEMO_USER,
    repos: DEMO_REPOS,
    events: DEMO_EVENTS,
    source: "demo",
    fetchedAt: Date.now(),
  });
  const [loading, setLoading] = useState<boolean>(true);

  const [tasks, setTasks] = useState<WorkspaceTask[]>(() =>
    readLocalJson<WorkspaceTask[]>("gitdash_tasks", DEFAULT_TASKS)
  );
  const [links, setLinks] = useState<QuickLink[]>(() =>
    readLocalJson<QuickLink[]>("gitdash_links", DEFAULT_LINKS)
  );

  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => setToast(msg), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Theme tokens: dark olive is default, light is a warm sand palette
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.classList.toggle("light", !darkMode);
    try {
      localStorage.setItem("gitdash_theme", darkMode ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  // Hash routing for GitHub Pages compatibility
  useEffect(() => {
    const onHash = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const selectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeSelectedDate = (date: string) => {
    setSelectedDate(date);
    try {
      localStorage.setItem("gitdash_selected_date", date);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem("gitdash_tasks", JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem("gitdash_links", JSON.stringify(links));
    } catch {
      /* ignore */
    }
  }, [links]);

  const loadDashboard = useCallback(
    async (targetUser: string, forceRefresh = false, customToken?: string) => {
      setLoading(true);
      const data = await fetchGitHubDashboard(targetUser, {
        forceRefresh,
        token: customToken ?? token,
      });
      setPayload(data);
      setLoading(false);
    },
    [token]
  );

  useEffect(() => {
    loadDashboard(username, false);
  }, [username, loadDashboard]);

  const handleSearchUsername = (newUser: string) => {
    const clean = newUser.trim().replace(/^@/, "");
    if (!clean) return;
    setUsername(clean);
    try {
      localStorage.setItem("gitdash_username", clean);
    } catch {
      /* ignore */
    }
    if (clean.toLowerCase() === username.toLowerCase()) loadDashboard(clean, true);
  };

  const handleSaveToken = (newToken: string) => {
    setToken(newToken);
    try {
      if (newToken) localStorage.setItem("gitdash_token", newToken);
      else localStorage.removeItem("gitdash_token");
    } catch {
      /* ignore */
    }
    notify(newToken ? "تم حفظ GitHub Token محلياً" : "تم مسح GitHub Token");
    loadDashboard(username, true, newToken);
  };

  const handleAddTask = (task: Omit<WorkspaceTask, "id" | "createdAt" | "done">) => {
    setTasks((prev) => [
      { ...task, id: `t-${Date.now()}`, done: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    notify("تم حذف المهمة");
  };

  const handleAddLink = (link: Omit<QuickLink, "id">) => {
    setLinks((prev) => [{ ...link, id: `l-${Date.now()}` }, ...prev]);
  };

  const handleDeleteLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    notify("تم حذف الرابط");
  };

  const tasksRemaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <div className="flex min-h-screen">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={selectTab}
          tasksRemaining={tasksRemaining}
          avatarUrl={payload.user.avatar_url}
          username={username}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            currentUsername={username}
            onSearchUsername={handleSearchUsername}
            onRefresh={() => loadDashboard(username, true)}
            loading={loading}
            source={payload.source}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((d) => !d)}
            token={token}
            onSaveToken={handleSaveToken}
            avatarUrl={payload.user.avatar_url}
            breadcrumb={TAB_LABELS[activeTab]}
          />

          <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-5 lg:px-6 lg:pb-6">
            {loading && (
              <div className="panel mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-[var(--muted)]">
                <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--pink)" }} />
                جاري مزامنة بيانات GitHub...
                <span className="mr-auto font-mono text-[9px] text-[var(--faint)]">@{username}</span>
              </div>
            )}

            {activeTab === "overview" && (
              <OverviewView
                user={payload.user}
                repos={payload.repos}
                events={payload.events}
                source={payload.source}
                errorNote={payload.errorNote}
                tasks={tasks}
                selectedDate={selectedDate}
                lastSync={payload.fetchedAt}
                onSelectDate={changeSelectedDate}
                onToggleTask={handleToggleTask}
                onViewAllRepos={() => selectTab("repositories")}
                onOpenWorkspace={() => selectTab("workspace")}
                onOpenCalendar={() => selectTab("calendar")}
                onAddTask={() => selectTab("workspace")}
                onNotify={notify}
              />
            )}

            {activeTab === "repositories" && (
              <RepositoriesView repos={payload.repos} onNotify={notify} />
            )}

            {activeTab === "calendar" && (
              <CalendarView
                tasks={tasks}
                selectedDate={selectedDate}
                onSelectDate={changeSelectedDate}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onNotify={notify}
              />
            )}

            {activeTab === "workspace" && (
              <WorkspaceView
                tasks={tasks}
                links={links}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((d) => !d)}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onAddLink={handleAddLink}
                onDeleteLink={handleDeleteLink}
                onImportData={(data) => {
                  setTasks(data.tasks);
                  setLinks(data.links);
                }}
                onNotify={notify}
              />
            )}

            {activeTab === "deploy" && <DeployGuideView onNotify={notify} />}
          </main>

          <footer className="border-t border-[var(--line)] px-4 py-3 lg:px-6">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--faint)]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--salmon)" }} />
                GitDash · System OS — واجهة عربية RTL جاهزة لـ GitHub Pages
              </span>
              <span className="flex items-center gap-2 font-mono">
                <span className="text-[var(--salmon)]">salmon</span>
                <span className="text-[var(--pink)]">pink</span>
                <span className="text-[#8fc0a9]">sage</span>
                <span>·</span>
                <span>v2.4</span>
              </span>
            </div>
          </footer>
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-medium text-[var(--ink)] shadow-[0_16px_30px_-16px_#000] lg:bottom-5"
          style={{
            background: "linear-gradient(180deg, var(--panel-2), var(--panel))",
            borderColor: "rgba(255,91,158,.4)",
            boxShadow: "0 0 0 1px rgba(255,91,158,.25), 0 0 24px -6px rgba(255,91,158,.4), 0 18px 30px -18px #000",
          }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
