import { fetchIssue, fetchIssues } from "./lib/github.ts";
import { GFM_CSS, renderMarkdown } from "./lib/markdown.ts";
import { renderOgpPage } from "./lib/ogp.ts";

const BOT_UA_PATTERN =
  /Twitterbot|facebookexternalhit|Discordbot|Slackbot|LinkedInBot|Googlebot|bingbot|Applebot/i;

function isBotRequest(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  return BOT_UA_PATTERN.test(ua);
}

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // ── API endpoints ──

    if (path === "/api/posts") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const issues = await fetchIssues(page);
      return jsonResponse(issues);
    }

    const apiPostMatch = path.match(/^\/api\/posts\/(\d+)$/);
    if (apiPostMatch) {
      const issue = await fetchIssue(Number(apiPostMatch[1]));
      return jsonResponse({
        ...issue,
        bodyHtml: renderMarkdown(issue.body ?? ""),
      });
    }

    // ── Static files ──

    if (path === "/static/gfm.css") {
      return new Response(GFM_CSS, {
        headers: { "Content-Type": "text/css; charset=utf-8" },
      });
    }

    if (path.startsWith("/static/")) {
      try {
        const content = await Deno.readTextFile(`.${path}`);
        const ext = path.split(".").pop();
        const types: Record<string, string> = {
          js: "application/javascript",
          css: "text/css",
          html: "text/html",
        };
        return new Response(content, {
          headers: {
            "Content-Type": `${types[ext ?? ""] ?? "text/plain"}; charset=utf-8`,
          },
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }

    // ── OGP for bots (individual posts) ──

    const postMatch = path.match(/^\/posts\/(\d+)$/);
    if (postMatch && isBotRequest(req)) {
      const issue = await fetchIssue(Number(postMatch[1]));
      const ogpHtml = renderOgpPage(issue, url.origin);
      return htmlResponse(ogpHtml);
    }

    // ── OGP for bots (top page) ──

    if (path === "/" && isBotRequest(req)) {
      const ogpHtml = renderOgpPage(null, url.origin);
      return htmlResponse(ogpHtml);
    }

    // ── SPA fallback ──

    const html = await Deno.readTextFile("./static/index.html");
    return htmlResponse(html);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal Server Error" }, 500);
  }
});
