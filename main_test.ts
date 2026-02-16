import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { handler } from "./main.ts";

// ── Helpers ──

function withEnv(
  vars: Record<string, string>,
  fn: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    const originals: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(vars)) {
      originals[key] = Deno.env.get(key);
      Deno.env.set(key, value);
    }
    try {
      await fn();
    } finally {
      for (const [key, value] of Object.entries(originals)) {
        if (value === undefined) Deno.env.delete(key);
        else Deno.env.set(key, value);
      }
    }
  };
}

function mockFetch(response: unknown, status = 200): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify(response), {
        status,
        statusText: status === 200 ? "OK" : "Error",
        headers: { "Content-Type": "application/json" },
      }),
    );
  return () => {
    globalThis.fetch = original;
  };
}

function makeRequest(
  path: string,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost${path}`, { headers });
}

const TEST_ENV = {
  GITHUB_OWNER: "owner",
  GITHUB_REPO: "repo",
  GITHUB_TOKEN: "",
};

const MOCK_ISSUE = {
  number: 1,
  title: "Test Post",
  body: "Hello **world**",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
  labels: [],
  user: { login: "user", avatar_url: "https://example.com/a.png" },
};

// テスト前に frontend/dist/index.html を用意
async function setupDistDir() {
  await Deno.mkdir("./frontend/dist", { recursive: true });
  await Deno.writeTextFile(
    "./frontend/dist/index.html",
    "<!doctype html><html><body><div id='root'></div></body></html>",
  );
}

// ── 4-1: GET /api/posts ──

Deno.test(
  "handler - GET /api/posts returns JSON array",
  withEnv(TEST_ENV, async () => {
    const restore = mockFetch([MOCK_ISSUE]);
    try {
      const res = await handler(makeRequest("/api/posts"));
      assertEquals(res.status, 200);
      const ct = res.headers.get("content-type") ?? "";
      assertStringIncludes(ct, "application/json");
      const data = await res.json();
      assertEquals(Array.isArray(data), true);
      assertEquals(data[0].title, "Test Post");
    } finally {
      restore();
    }
  }),
);

// ── 4-2: GET /api/posts?page=2 ──

Deno.test(
  "handler - GET /api/posts?page=2 forwards page param",
  withEnv(TEST_ENV, async () => {
    let capturedUrl = "";
    const original = globalThis.fetch;
    globalThis.fetch = (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return Promise.resolve(new Response("[]", { status: 200 }));
    };
    try {
      await handler(makeRequest("/api/posts?page=2"));
      assertStringIncludes(capturedUrl, "page=2");
    } finally {
      globalThis.fetch = original;
    }
  }),
);

// ── 4-3: GET /api/posts/:id ──

Deno.test(
  "handler - GET /api/posts/:id returns JSON with bodyHtml",
  withEnv(TEST_ENV, async () => {
    const restore = mockFetch(MOCK_ISSUE);
    try {
      const res = await handler(makeRequest("/api/posts/1"));
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.title, "Test Post");
      assertEquals(typeof data.bodyHtml, "string");
      assertStringIncludes(data.bodyHtml, "world");
    } finally {
      restore();
    }
  }),
);

// ── 4-4: GET /api/gfm.css ──

Deno.test("handler - GET /api/gfm.css returns CSS", async () => {
  const res = await handler(makeRequest("/api/gfm.css"));
  assertEquals(res.status, 200);
  const ct = res.headers.get("content-type") ?? "";
  assertStringIncludes(ct, "text/css");
  const body = await res.text();
  assertStringIncludes(body, "{"); // CSS rules
});

// ── 4-5: ボット判定 → OGP HTML ──

Deno.test(
  "handler - bot UA on /posts/:id returns OGP HTML",
  withEnv(TEST_ENV, async () => {
    const restore = mockFetch(MOCK_ISSUE);
    try {
      const res = await handler(
        makeRequest("/posts/1", { "user-agent": "Twitterbot/1.0" }),
      );
      assertEquals(res.status, 200);
      const html = await res.text();
      assertStringIncludes(html, 'og:title');
      assertStringIncludes(html, "Test Post");
      assertStringIncludes(html, 'og:type" content="article"');
    } finally {
      restore();
    }
  }),
);

Deno.test(
  "handler - bot UA on / returns top page OGP",
  withEnv(TEST_ENV, async () => {
    const res = await handler(
      makeRequest("/", { "user-agent": "facebookexternalhit/1.1" }),
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, 'og:title" content="issue-press"');
    assertStringIncludes(html, 'og:type" content="website"');
  }),
);

Deno.test(
  "handler - Discordbot gets OGP",
  withEnv(TEST_ENV, async () => {
    const restore = mockFetch(MOCK_ISSUE);
    try {
      const res = await handler(
        makeRequest("/posts/1", { "user-agent": "Mozilla/5.0 (compatible; Discordbot/2.0)" }),
      );
      assertEquals(res.status, 200);
      const html = await res.text();
      assertStringIncludes(html, "og:title");
    } finally {
      restore();
    }
  }),
);

// ── 4-6: 通常ブラウザ → SPA fallback ──

Deno.test(
  "handler - normal UA on /posts/1 returns SPA fallback",
  async () => {
    await setupDistDir();
    const res = await handler(
      makeRequest("/posts/1", {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      }),
    );
    assertEquals(res.status, 200);
    const ct = res.headers.get("content-type") ?? "";
    assertStringIncludes(ct, "text/html");
    const html = await res.text();
    assertStringIncludes(html, "root");
  },
);

// ── 4-8: SPA フォールバック ──

Deno.test("handler - unknown path returns SPA fallback", async () => {
  await setupDistDir();
  const res = await handler(
    makeRequest("/unknown/path", {
      "user-agent": "Mozilla/5.0",
    }),
  );
  assertEquals(res.status, 200);
  const ct = res.headers.get("content-type") ?? "";
  assertStringIncludes(ct, "text/html");
});

Deno.test("handler - root path returns SPA fallback for normal UA", async () => {
  await setupDistDir();
  const res = await handler(
    makeRequest("/", { "user-agent": "Mozilla/5.0" }),
  );
  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, "root");
});

// ── 4-9: エラーレスポンス ──

Deno.test(
  "handler - internal error returns 500 JSON",
  withEnv(TEST_ENV, async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error("Network failure");
    };
    try {
      const res = await handler(makeRequest("/api/posts"));
      assertEquals(res.status, 500);
      const data = await res.json();
      assertEquals(data.error, "Internal Server Error");
    } finally {
      globalThis.fetch = original;
    }
  }),
);

// ── 4-10: MIME タイプ ──

Deno.test("handler - serves static JS file with correct MIME type", async () => {
  await Deno.mkdir("./frontend/dist/assets", { recursive: true });
  await Deno.writeTextFile(
    "./frontend/dist/assets/test.js",
    "console.log('test');",
  );
  const res = await handler(makeRequest("/assets/test.js"));
  assertEquals(res.status, 200);
  const ct = res.headers.get("content-type") ?? "";
  assertEquals(ct, "application/javascript");
  // cleanup
  await Deno.remove("./frontend/dist/assets/test.js");
});

Deno.test("handler - serves static CSS file with correct MIME type", async () => {
  await Deno.mkdir("./frontend/dist/assets", { recursive: true });
  await Deno.writeTextFile(
    "./frontend/dist/assets/test.css",
    "body { color: red; }",
  );
  const res = await handler(makeRequest("/assets/test.css"));
  assertEquals(res.status, 200);
  const ct = res.headers.get("content-type") ?? "";
  assertEquals(ct, "text/css");
  await Deno.remove("./frontend/dist/assets/test.css");
});
