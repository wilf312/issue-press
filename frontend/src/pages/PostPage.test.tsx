import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PostPage } from "./PostPage";

vi.mock("@kaze/ui", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="kaze-button" {...props}>
      {children}
    </button>
  ),
  H1: ({ children }: any) => <h1>{children}</h1>,
  Caption: ({ children }: any) => <span>{children}</span>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Spinner: ({ label }: any) => <p>{label}</p>,
  Alert: ({ title, children }: any) => (
    <p>
      {title}: {children}
    </p>
  ),
  Separator: () => <hr />,
  Breadcrumb: ({ items }: any) => (
    <nav data-testid="breadcrumb">
      {items.map((item: any, i: number) => (
        <span key={i}>
          {item.href ? (
            <a href={item.href} onClick={item.onClick}>
              {item.label}
            </a>
          ) : (
            item.label
          )}
        </span>
      ))}
    </nav>
  ),
}));

vi.mock("@kaze/ui/styles.css", () => ({}));

const MOCK_POST = {
  number: 42,
  title: "Test Article",
  body: "# Hello\n\nWorld",
  bodyHtml: "<h1>Hello</h1><p>World</p>",
  created_at: "2024-05-01T09:00:00Z",
  updated_at: "2024-05-02T09:00:00Z",
  labels: [{ name: "tutorial", color: "1d76db" }],
  user: { login: "author", avatar_url: "https://example.com/avatar.png" },
};

function waitForPostLoaded() {
  return waitFor(() => {
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings[0]).toHaveTextContent("Test Article");
  });
}

describe("PostPage", () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    navigate.mockClear();
    document.title = "issue-press";
  });

  // ── 7-1: 記事取得 & 表示 ──

  it("fetches and renders post content", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitForPostLoaded();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/posts/42");
  });

  // ── 7-2: HTML レンダリング ──

  it("renders bodyHtml via dangerouslySetInnerHTML", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitForPostLoaded();

    const postBody = document.querySelector(".post-body");
    expect(postBody).not.toBeNull();
    expect(postBody!.innerHTML).toContain("<h1>Hello</h1>");
    expect(postBody!.innerHTML).toContain("<p>World</p>");
  });

  // ── 7-3: ドキュメントタイトル更新 ──

  it("updates document.title after loading", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitFor(() => {
      expect(document.title).toBe("Test Article | issue-press");
    });
  });

  // ── 7-4: パンくずリスト ──

  it("renders breadcrumb with link to list page", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitForPostLoaded();

    expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
    expect(screen.getByText("記事一覧")).toBeInTheDocument();
  });

  // ── 7-5: ID 変更時リセット ──

  it("resets state and re-fetches when id changes", async () => {
    const secondPost = {
      ...MOCK_POST,
      number: 99,
      title: "Another Article",
      bodyHtml: "<p>New content</p>",
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const data = callCount === 1 ? MOCK_POST : secondPost;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      });
    });

    const { rerender } = render(<PostPage id={42} navigate={navigate} />);
    await waitForPostLoaded();

    rerender(<PostPage id={99} navigate={navigate} />);

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 1 });
      expect(headings[0]).toHaveTextContent("Another Article");
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  // ── 7-6: ローディング ──

  it("shows loading message while fetching", () => {
    globalThis.fetch = vi.fn(
      () => new Promise(() => {}), // never resolves
    );
    render(<PostPage id={42} navigate={navigate} />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  // ── 7-7: エラー表示 ──

  it("shows error message on fetch failure (404)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<PostPage id={999} navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });

  it("shows error message on network error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Failed to fetch"));

    render(<PostPage id={42} navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
    });
  });

  // ── 7-8: ラベル表示 ──

  it("renders labels", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitForPostLoaded();
    expect(screen.getByText("tutorial")).toBeInTheDocument();
  });

  it("renders date with correct datetime attribute", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitForPostLoaded();

    const time = document.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("datetime", "2024-05-01T09:00:00Z");
  });
});
