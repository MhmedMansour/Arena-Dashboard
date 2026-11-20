export type DashboardTab = "overview" | "repositories" | "calendar" | "workspace" | "deploy";

export type DataSourceMode = "live" | "cached" | "demo";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  updated_at: string;
  pushed_at: string;
  topics?: string[];
  visibility?: string;
  fork: boolean;
  default_branch: string;
}

export interface GitHubEvent {
  id: string;
  type: string;
  repo: {
    id: number;
    name: string;
  };
  created_at: string;
  payload?: {
    action?: string;
    commits?: Array<{ sha: string; message: string }>;
    ref?: string;
    ref_type?: string;
  };
}

export interface ActivityPoint {
  label: string;
  commits: number;
  stars: number;
}

export interface LanguageStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  category: "feature" | "bug" | "deploy" | "docs";
  priority: "high" | "medium" | "low";
  done: boolean;
  createdAt: string;
  dueDate?: string;
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  note: string;
}
