import { assertNotEquals, assertStringIncludes } from "@std/assert";
import { GFM_CSS, renderMarkdown } from "./markdown.ts";

// ── 2-1: 基本変換 ──

Deno.test("renderMarkdown - converts heading to HTML", () => {
  const html = renderMarkdown("# Hello");
  assertStringIncludes(html, "Hello");
  assertStringIncludes(html, "<h1");
});

Deno.test("renderMarkdown - converts list to HTML", () => {
  const html = renderMarkdown("- item 1\n- item 2");
  assertStringIncludes(html, "<li>");
  assertStringIncludes(html, "item 1");
});

Deno.test("renderMarkdown - converts code block to HTML", () => {
  const html = renderMarkdown("```js\nconsole.log('hi')\n```");
  assertStringIncludes(html, "<code");
  assertStringIncludes(html, "console.log");
});

Deno.test("renderMarkdown - converts bold and italic", () => {
  const html = renderMarkdown("**bold** and _italic_");
  assertStringIncludes(html, "<strong>");
  assertStringIncludes(html, "<em>");
});

Deno.test("renderMarkdown - converts links", () => {
  const html = renderMarkdown("[example](https://example.com)");
  assertStringIncludes(html, "<a");
  assertStringIncludes(html, "https://example.com");
});

// ── 2-2: 空文字列 ──

Deno.test("renderMarkdown - handles empty string without error", () => {
  const html = renderMarkdown("");
  assertNotEquals(html, undefined);
});

// ── 2-3: GFM CSS ──

Deno.test("GFM_CSS - is a non-empty string", () => {
  assertNotEquals(GFM_CSS, "");
  assertNotEquals(GFM_CSS, undefined);
  assertStringIncludes(GFM_CSS, "{"); // Should contain CSS rules
});
