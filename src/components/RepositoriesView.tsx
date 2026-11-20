import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, GitFork, Search, SlidersHorizontal, Star } from "lucide-react";
import { LANGUAGE_COLORS } from "../data/fallbackData";
import { formatCompactNumber, formatRelativeArabic } from "../services/githubApi";
import { GitHubRepo } from "../types/dashboard";
import { Button, EmptyState, Pagination, SectionLabel } from "./UI";

interface RepositoriesViewProps {
  repos: GitHubRepo[];
  onNotify: (msg: string) => void;
}

const PER_PAGE = 6;

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({ repos, onNotify }) => {
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("all");
  const [sortBy, setSortBy] = useState<"stars" | "updated" | "forks">("stars");
  const [copied, setCopied] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const languages = useMemo(() => {
    const set = new Set<string>();
    repos.forEach((r) => r.language && set.add(r.language));
    return Array.from(set).sort();
  }, [repos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos
      .filter((r) => {
        if (lang !== "all" && r.language !== lang) return false;
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.language || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "stars") return b.stargazers_count - a.stargazers_count;
        if (sortBy === "forks") return b.forks_count - a.forks_count;
        return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
      });
  }, [repos, query, lang, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const copyClone = async (repo: GitHubRepo) => {
    try {
      await navigator.clipboard.writeText(`git clone ${repo.clone_url}`);
      setCopied(repo.id);
      onNotify(`تم نسخ أمر استنساخ ${repo.name}`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      onNotify("تعذر النسخ — يمكنك نسخ الرابط يدوياً");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setLang("all");
    setSortBy("stars");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Library · repository grid</div>
          <h1 className="font-display text-xl font-bold text-[var(--ink)] sm:text-2xl">المستودعات</h1>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            استعرض، ابحث، وانسخ أي مستودع من حساب GitHub الحالي.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="chip chip-salmon !text-[10px]">{filtered.length} نتيجة</span>
          <span className="chip !text-[10px]">من {repos.length} مستودع</span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="panel p-3.5 sm:p-4">
        <SectionLabel>Filters · inputs</SectionLabel>
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--faint)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث باسم المستودع أو الوصف أو اللغة..."
              className="field pr-8"
            />
          </div>

          <div className="relative lg:col-span-3">
            <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--faint)]" />
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                setPage(1);
              }}
              className="field appearance-none pr-8"
            >
              <option value="all">كل اللغات</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--faint)]" />
          </div>

          <div className="relative lg:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "stars" | "updated" | "forks")}
              className="field appearance-none"
            >
              <option value="stars">الأكثر نجوماً</option>
              <option value="updated">الأحدث تحديثاً</option>
              <option value="forks">الأكثر نسخاً</option>
            </select>
            <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--faint)]" />
          </div>

          <div className="lg:col-span-1">
            <Button onClick={resetFilters} className="h-full w-full !px-2 !text-[10px]">
              مسح
            </Button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setLang("all");
              setPage(1);
            }}
            className={`chip transition ${lang === "all" ? "chip-salmon" : "hover:text-[var(--ink)]"}`}
          >
            Filter X
            <span className="font-mono text-[9px] opacity-70">{repos.length}</span>
          </button>
          {languages.slice(0, 6).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLang(l);
                setPage(1);
              }}
              className={`chip transition ${lang === l ? "chip-teal" : "hover:text-[var(--ink)]"}`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: LANGUAGE_COLORS[l] || LANGUAGE_COLORS.Other }}
              />
              {l}
            </button>
          ))}
          {lang !== "all" && (
            <button type="button" onClick={() => setLang("all")} className="chip chip-pink">
              Action X
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {visible.length === 0 ? (
        <div className="panel">
          <EmptyState title="لا توجد نتائج مطابقة" text="جرّب تعديل كلمات البحث أو إزالة فلاتر اللغة لعرض جميع المستودعات." />
          <div className="flex justify-center pb-6">
            <Button variant="primary" onClick={resetFilters}>
              إعادة ضبط الفلاتر
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((repo) => (
            <div key={repo.id} className="panel flex flex-col justify-between p-4 transition hover:border-[rgba(255,91,158,.28)]">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 truncate font-mono text-[12px] font-bold text-[var(--ink)] hover:text-[var(--salmon)]"
                    >
                      {repo.name}
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                    </a>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-[var(--faint)]">
                      <span className="font-mono">{repo.full_name}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
                        public
                      </span>
                    </div>
                  </div>
                  <span className="chip !py-0.5 !text-[9px]">{repo.default_branch}</span>
                </div>

                <p className="mt-2 line-clamp-2 min-h-[2.1rem] text-[11px] leading-relaxed text-[var(--muted)]">
                  {repo.description || "لا يوجد وصف لهذا المستودع."}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {(repo.topics && repo.topics.length > 0 ? repo.topics.slice(0, 3) : [repo.language || "repo"]).map(
                    (topic, i) => (
                      <span key={`${topic}-${i}`} className="chip !py-0.5 !text-[9px]">
                        {topic}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
                  <div className="flex items-center gap-2.5 text-[10px] text-[var(--muted)]">
                    {repo.language && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Other }}
                        />
                        {repo.language}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-mono tabular">
                      <Star className="h-3 w-3 text-[#e9c98d]" />
                      {formatCompactNumber(repo.stargazers_count)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular">
                      <GitFork className="h-3 w-3 text-[var(--faint)]" />
                      {formatCompactNumber(repo.forks_count)}
                    </span>
                    <span className="text-[9px] text-[var(--faint)]">{formatRelativeArabic(repo.pushed_at)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyClone(repo)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                    >
                      {copied === repo.id ? (
                        <>
                          <Check className="h-3 w-3 text-[var(--success)]" /> تم
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Clone
                        </>
                      )}
                    </button>
                    <a href={repo.html_url} target="_blank" rel="noreferrer" className="btn btn-primary !px-2.5 !py-1.5 !text-[10px]">
                      فتح
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] text-[var(--faint)]">
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
            الصفحة {page} من {totalPages} — {filtered.length} مستودع
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
};
