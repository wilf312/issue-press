export interface GitHubLabel {
  name: string;
  color: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  labels: GitHubLabel[];
  user: GitHubUser;
}

const API_BASE = "https://api.github.com";

function getConfig() {
  return {
    token: Deno.env.get("GITHUB_TOKEN") ?? "",
    owner: Deno.env.get("GITHUB_OWNER") ?? "",
    repo: Deno.env.get("GITHUB_REPO") ?? "",
  };
}

function authHeaders(): HeadersInit {
  const { token } = getConfig();
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "issue-press",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchIssues(
  page = 1,
  perPage = 20,
): Promise<GitHubIssue[]> {
  const { owner, repo } = getConfig();
  const url =
    `${API_BASE}/repos/${owner}/${repo}/issues?state=open&page=${page}&per_page=${perPage}&sort=created&direction=desc`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // GitHub Issues API returns PRs too — filter them out
  return data.filter(
    (item: Record<string, unknown>) => !item.pull_request,
  );
}

export async function fetchIssue(issueNumber: number): Promise<GitHubIssue> {
  const { owner, repo } = getConfig();
  const url = `${API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}
