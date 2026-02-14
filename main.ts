import { fetchIssue, fetchIssues } from "./lib/github.ts";
import { GFM_CSS, renderMarkdown } from "./lib/markdown.ts";
import { renderOgpPage } from "./lib/ogp.ts";

const BOT_UA_PATTERN =
  /Twitterbot|facebookexternalhit|Discordbot|Slackbot|LinkedInBot|Googlebot|bingbot|Applebot/i;

const DIST_DIR = "./frontend/dist";

const MIME_TYPES: Record<string, string> = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
};

function isBotRequest(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  return BOT_UA_PATTERN.test(ua);
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function serveStaticFile(path: string): Promise<Response | null> {
  try {
    const filePath = `${DIST_DIR}${path}`;
    const content = await Deno.readFile(filePath);
    const ext = path.split(".").pop() ?? "";
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    return new Response(content, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return null;
  }
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // ── API endpoints ──

    if (path === "/api/posts") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const issues = await fetchIssues(page);
      return Response.json(issues);
    }

    const apiPostMatch = path.match(/^\/api\/posts\/(\d+)$/);
    if (apiPostMatch) {
      const issue = await fetchIssue(Number(apiPostMatch[1]));
      return Response.json({
        ...issue,
        bodyHtml: renderMarkdown(issue.body ?? ""),
      });
    }

    if (path === "/api/gfm.css") {
      return new Response(GFM_CSS, {
        headers: { "Content-Type": "text/css; charset=utf-8" },
      });
    }

    // ── OGP for bots ──

    const postMatch = path.match(/^\/posts\/(\d+)$/);
    if (postMatch && isBotRequest(req)) {
      const issue = await fetchIssue(Number(postMatch[1]));
      return htmlResponse(renderOgpPage(issue, url.origin));
    }

    if (path === "/" && isBotRequest(req)) {
      return htmlResponse(renderOgpPage(null, url.origin));
    }

    // ── Static files from frontend/dist ──

    if (path !== "/") {
      const staticResponse = await serveStaticFile(path);
      if (staticResponse) return staticResponse;
    }

    // ── SPA fallback ──

    const indexHtml = await Deno.readTextFile(`${DIST_DIR}/index.html`);
    return htmlResponse(indexHtml);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
