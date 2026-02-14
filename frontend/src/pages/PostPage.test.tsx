import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PostPage } from "./PostPage";

vi.mock("@kaze/ui", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} data-testid="kaze-button" {...props}>
      {children}
    </button>
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
    await waitFor(() => {
      expect(screen.getByText("Test Article")).toBeInTheDocument();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/posts/42");
  });

  // ── 7-2: HTML レンダリング ──

  it("renders bodyHtml via dangerouslySetInnerHTML", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("Test Article")).toBeInTheDocument();
    });

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

  // ── 7-4: 戻るボタン ──

  it("renders back button that navigates to '/'", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("Test Article")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("← 記事一覧に戻る"));
    expect(navigate).toHaveBeenCalledWith("/");
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
    await waitFor(() => {
      expect(screen.getByText("Test Article")).toBeInTheDocument();
    });

    rerender(<PostPage id={99} navigate={navigate} />);

    // Should show loading while re-fetching
    await waitFor(() => {
      expect(screen.getByText("Another Article")).toBeInTheDocument();
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

  // ── 7-8: @kaze/ui Button ──

  it("renders @kaze/ui Button component", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByTestId("kaze-button")).toBeInTheDocument();
    });
  });

  // ── 7-extra: ラベル表示 ──

  it("renders labels with correct colors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("tutorial")).toBeInTheDocument();
    });

    const tag = screen.getByText("tutorial");
    expect(tag).toHaveStyle("--tag-color: #1d76db");
  });

  it("renders date with correct datetime attribute", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POST),
    });

    render(<PostPage id={42} navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("Test Article")).toBeInTheDocument();
    });

    const time = screen.getByRole("time");
    expect(time).toHaveAttribute("dateTime", "2024-05-01T09:00:00Z");
  });
});
