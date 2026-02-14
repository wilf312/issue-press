import type { GitHubIssue } from "./github.ts";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripMarkdown(md: string): string {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[*_~`>]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 200);
}

export function renderOgpPage(
  issue: GitHubIssue | null,
  origin: string,
): string {
  const siteName = "issue-press";

  if (!issue) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${siteName}</title>
  <meta property="og:title" content="${siteName}">
  <meta property="og:description" content="GitHub Issues で作るブログ">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(origin)}/">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${siteName}">
  <meta name="twitter:description" content="GitHub Issues で作るブログ">
</head>
<body></body>
</html>`;
  }

  const title = escapeHtml(issue.title);
  const description = escapeHtml(stripMarkdown(issue.body ?? ""));
  const postUrl = `${origin}/posts/${issue.number}`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${title} | ${siteName}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(postUrl)}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="article:published_time" content="${issue.created_at}">
  <meta property="article:modified_time" content="${issue.updated_at}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
</head>
<body></body>
</html>`;
}
