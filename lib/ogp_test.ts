import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { renderOgpPage } from "./ogp.ts";
import type { GitHubIssue } from "./github.ts";

function createMockIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1,
    title: "Test Issue",
    body: "Test body content",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    labels: [],
    user: { login: "testuser", avatar_url: "https://example.com/avatar.png" },
    ...overrides,
  };
}

// ── 3-1: トップページ OGP ──

Deno.test("renderOgpPage - null issue returns site-level OGP", () => {
  const html = renderOgpPage(null, "https://example.com");
  assertStringIncludes(html, '<meta property="og:title" content="issue-press">');
  assertStringIncludes(html, '<meta property="og:type" content="website">');
  assertStringIncludes(html, '<meta property="og:url" content="https://example.com/">');
  assertStringIncludes(html, "GitHub Issues で作るブログ");
});

// ── 3-2: 記事ページ OGP ──

Deno.test("renderOgpPage - issue returns article OGP with correct meta", () => {
  const issue = createMockIssue({
    number: 42,
    title: "Hello World",
    body: "Article content here",
  });
  const html = renderOgpPage(issue, "https://example.com");
  assertStringIncludes(html, '<meta property="og:title" content="Hello World">');
  assertStringIncludes(html, '<meta property="og:type" content="article">');
  assertStringIncludes(html, "https://example.com/posts/42");
  assertStringIncludes(html, "Article content here");
});

// ── 3-3: HTML エスケープ (XSS 防止) ──

Deno.test("renderOgpPage - escapes HTML special chars in title", () => {
  const issue = createMockIssue({
    title: '<script>alert("xss")</script>',
  });
  const html = renderOgpPage(issue, "https://example.com");
  assertStringIncludes(html, "&lt;script&gt;");
  assertEquals(html.includes('<script>alert("xss")</script>'), false);
});

Deno.test("renderOgpPage - escapes ampersand and quotes", () => {
  const issue = createMockIssue({ title: 'A & B "quoted"' });
  const html = renderOgpPage(issue, "https://example.com");
  assertStringIncludes(html, "A &amp; B &quot;quoted&quot;");
});

// ── 3-4: Markdown 除去 ──

Deno.test("renderOgpPage - strips markdown image syntax from description", () => {
  const issue = createMockIssue({
    body: "Before ![alt](http://img.png) After",
  });
  const html = renderOgpPage(issue, "https://example.com");
  assertEquals(html.includes("![alt]"), false);
  assertStringIncludes(html, "Before");
  assertStringIncludes(html, "After");
});

Deno.test("renderOgpPage - strips markdown link but keeps text", () => {
  const issue = createMockIssue({
    body: "Check [this link](http://url.com) out",
  });
  const html = renderOgpPage(issue, "https://example.com");
  assertEquals(html.includes("[this link]"), false);
  assertStringIncludes(html, "this link");
});

Deno.test("renderOgpPage - strips heading markers and formatting", () => {
  const issue = createMockIssue({
    body: "# Heading\n\n**bold** _italic_ ~~strike~~",
  });
  const html = renderOgpPage(issue, "https://example.com");
  assertEquals(html.includes("# "), false);
  assertEquals(html.includes("**"), false);
  assertStringIncludes(html, "Heading");
  assertStringIncludes(html, "bold");
});

// ── 3-5: 説明文切り詰め ──

Deno.test("renderOgpPage - truncates description to 200 chars", () => {
  const longBody = "a".repeat(300);
  const issue = createMockIssue({ body: longBody });
  const html = renderOgpPage(issue, "https://example.com");
  const match = html.match(/og:description" content="([^"]*)"/);
  assert(match !== null, "og:description meta tag should exist");
  assert(match![1].length <= 200, `Description should be <= 200 chars, got ${match![1].length}`);
});

// ── 3-6: Twitter Card ──

Deno.test("renderOgpPage - includes Twitter Card meta tags for issue", () => {
  const issue = createMockIssue({ title: "Twitter Test" });
  const html = renderOgpPage(issue, "https://example.com");
  assertStringIncludes(html, '<meta name="twitter:card" content="summary">');
  assertStringIncludes(html, '<meta name="twitter:title" content="Twitter Test">');
});

Deno.test("renderOgpPage - includes Twitter Card meta tags for top page", () => {
  const html = renderOgpPage(null, "https://example.com");
  assertStringIncludes(html, '<meta name="twitter:card" content="summary">');
  assertStringIncludes(html, '<meta name="twitter:title" content="issue-press">');
});

// ── 3-7: 日時メタタグ ──

Deno.test("renderOgpPage - includes published and modified time", () => {
  const issue = createMockIssue({
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-15T12:00:00Z",
  });
  const html = renderOgpPage(issue, "https://example.com");
  assertStringIncludes(
    html,
    'article:published_time" content="2024-01-01T00:00:00Z"',
  );
  assertStringIncludes(
    html,
    'article:modified_time" content="2024-06-15T12:00:00Z"',
  );
});

// ── 3-extra: body が null / 空文字列 ──

Deno.test("renderOgpPage - handles null body gracefully", () => {
  const issue = createMockIssue({ body: null as unknown as string });
  const html = renderOgpPage(issue, "https://example.com");
  assertStringIncludes(html, 'og:description" content="');
});

Deno.test("renderOgpPage - handles empty body", () => {
  const issue = createMockIssue({ body: "" });
  const html = renderOgpPage(issue, "https://example.com");
  assertStringIncludes(html, 'og:description" content=""');
});
