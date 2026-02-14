import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { fetchIssue, fetchIssues } from "./github.ts";

// ── Helpers ──

function withEnv(
  vars: Record<string, string>,
  fn: () => Promise<void> | void,
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
        if (value === undefined) {
          Deno.env.delete(key);
        } else {
          Deno.env.set(key, value);
        }
      }
    }
  };
}

function mockFetch(
  response: unknown,
  status = 200,
): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify(response), {
        status,
        statusText: status === 200 ? "OK" : "Not Found",
        headers: { "Content-Type": "application/json" },
      }),
    );
  return () => {
    globalThis.fetch = original;
  };
}

const TEST_ENV = {
  GITHUB_OWNER: "testowner",
  GITHUB_REPO: "testrepo",
  GITHUB_TOKEN: "",
};

// ── 1-1: 記事一覧取得 ──

Deno.test(
  "fetchIssues - returns issues array",
  withEnv(TEST_ENV, async () => {
    const issues = [
      { number: 1, title: "Issue 1" },
      { number: 2, title: "Issue 2" },
    ];
    const restore = mockFetch(issues);
    try {
      const result = await fetchIssues();
      assertEquals(result.length, 2);
      assertEquals(result[0].number, 1);
      assertEquals(result[1].title, "Issue 2");
    } finally {
      restore();
    }
  }),
);

// ── 1-2: PR 除外 ──

Deno.test(
  "fetchIssues - filters out pull requests",
  withEnv(TEST_ENV, async () => {
    const data = [
      { number: 1, title: "Issue" },
      { number: 2, title: "PR", pull_request: { url: "https://..." } },
      { number: 3, title: "Another Issue" },
    ];
    const restore = mockFetch(data);
    try {
      const result = await fetchIssues();
      assertEquals(result.length, 2);
      assertEquals(result[0].title, "Issue");
      assertEquals(result[1].title, "Another Issue");
    } finally {
      restore();
    }
  }),
);

// ── 1-3: ページネーション ──

Deno.test(
  "fetchIssues - passes page and perPage params to API URL",
  withEnv(TEST_ENV, async () => {
    let capturedUrl = "";
    const original = globalThis.fetch;
    globalThis.fetch = (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return Promise.resolve(new Response("[]", { status: 200 }));
    };
    try {
      await fetchIssues(3, 10);
      assertStringIncludes(capturedUrl, "page=3");
      assertStringIncludes(capturedUrl, "per_page=10");
      assertStringIncludes(capturedUrl, "state=open");
      assertStringIncludes(capturedUrl, "sort=created");
      assertStringIncludes(capturedUrl, "direction=desc");
    } finally {
      globalThis.fetch = original;
    }
  }),
);

// ── 1-4: 個別記事取得 ──

Deno.test(
  "fetchIssue - returns single issue by number",
  withEnv(TEST_ENV, async () => {
    const issue = { number: 42, title: "Test Issue", body: "content" };
    const restore = mockFetch(issue);
    try {
      const result = await fetchIssue(42);
      assertEquals(result.number, 42);
      assertEquals(result.title, "Test Issue");
    } finally {
      restore();
    }
  }),
);

Deno.test(
  "fetchIssue - constructs correct URL",
  withEnv(TEST_ENV, async () => {
    let capturedUrl = "";
    const original = globalThis.fetch;
    globalThis.fetch = (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return Promise.resolve(
        new Response('{"number":1}', { status: 200 }),
      );
    };
    try {
      await fetchIssue(42);
      assertStringIncludes(capturedUrl, "/repos/testowner/testrepo/issues/42");
    } finally {
      globalThis.fetch = original;
    }
  }),
);

// ── 1-5: 認証ヘッダー ──

Deno.test(
  "fetchIssues - includes Authorization header when token is set",
  withEnv({ ...TEST_ENV, GITHUB_TOKEN: "ghp_test123" }, async () => {
    let capturedHeaders: HeadersInit | undefined;
    const original = globalThis.fetch;
    globalThis.fetch = (_input: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return Promise.resolve(new Response("[]", { status: 200 }));
    };
    try {
      await fetchIssues();
      const headers = capturedHeaders as Record<string, string>;
      assertEquals(headers["Authorization"], "Bearer ghp_test123");
    } finally {
      globalThis.fetch = original;
    }
  }),
);

// ── 1-6: トークン未設定 ──

Deno.test(
  "fetchIssues - no Authorization header when token is empty",
  withEnv(TEST_ENV, async () => {
    let capturedHeaders: HeadersInit | undefined;
    const original = globalThis.fetch;
    globalThis.fetch = (_input: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return Promise.resolve(new Response("[]", { status: 200 }));
    };
    try {
      await fetchIssues();
      const headers = capturedHeaders as Record<string, string>;
      assertEquals(headers["Authorization"], undefined);
    } finally {
      globalThis.fetch = original;
    }
  }),
);

// ── 1-7: API エラー ──

Deno.test(
  "fetchIssues - throws on non-ok response",
  withEnv(TEST_ENV, async () => {
    const restore = mockFetch({ message: "Not Found" }, 404);
    try {
      await assertRejects(
        () => fetchIssues(),
        Error,
        "GitHub API error: 404",
      );
    } finally {
      restore();
    }
  }),
);

Deno.test(
  "fetchIssue - throws on non-ok response",
  withEnv(TEST_ENV, async () => {
    const restore = mockFetch({ message: "Server Error" }, 500);
    try {
      await assertRejects(
        () => fetchIssue(999),
        Error,
        "GitHub API error: 500",
      );
    } finally {
      restore();
    }
  }),
);

// ── 1-extra: User-Agent ヘッダー ──

Deno.test(
  "fetchIssues - sends User-Agent and Accept headers",
  withEnv(TEST_ENV, async () => {
    let capturedHeaders: HeadersInit | undefined;
    const original = globalThis.fetch;
    globalThis.fetch = (_input: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return Promise.resolve(new Response("[]", { status: 200 }));
    };
    try {
      await fetchIssues();
      const headers = capturedHeaders as Record<string, string>;
      assertEquals(headers["User-Agent"], "issue-press");
      assertEquals(headers["Accept"], "application/vnd.github.v3+json");
    } finally {
      globalThis.fetch = original;
    }
  }),
);
