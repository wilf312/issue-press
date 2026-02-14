import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListPage } from "./ListPage";

vi.mock("@kaze/ui/styles.css", () => ({}));

const MOCK_POSTS = [
  {
    number: 1,
    title: "First Post",
    body: "Body 1",
    created_at: "2024-03-15T10:00:00Z",
    updated_at: "2024-03-16T10:00:00Z",
    labels: [
      { name: "bug", color: "d73a4a" },
      { name: "help wanted", color: "0075ca" },
    ],
    user: { login: "user1", avatar_url: "https://example.com/a.png" },
  },
  {
    number: 2,
    title: "Second Post",
    body: "Body 2",
    created_at: "2024-04-01T12:00:00Z",
    updated_at: "2024-04-02T12:00:00Z",
    labels: [],
    user: { login: "user2", avatar_url: "https://example.com/b.png" },
  },
];

describe("ListPage", () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    navigate.mockClear();
  });

  // ── 6-1: ローディング表示 ──

  it("shows loading message while fetching", () => {
    globalThis.fetch = vi.fn(
      () => new Promise(() => {}), // never resolves
    );
    render(<ListPage navigate={navigate} />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  // ── 6-2: 記事表示 ──

  it("renders posts after successful fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POSTS),
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });
    expect(screen.getByText("Second Post")).toBeInTheDocument();
  });

  // ── 6-3: 空リスト ──

  it("shows empty message when no posts", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("記事がまだありません。")).toBeInTheDocument();
    });
  });

  // ── 6-4: エラー表示 ──

  it("shows error message on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });

  it("shows error message on network error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  // ── 6-5: 日付フォーマット ──

  it("formats date in ja-JP locale", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POSTS),
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });

    // Check that <time> elements exist with correct datetime attribute
    const times = screen.getAllByRole("time");
    expect(times[0]).toHaveAttribute("dateTime", "2024-03-15T10:00:00Z");
  });

  // ── 6-6: ラベル色 ──

  it("renders labels with --tag-color CSS variable", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POSTS),
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("bug")).toBeInTheDocument();
    });

    const bugTag = screen.getByText("bug");
    expect(bugTag).toHaveStyle("--tag-color: #d73a4a");

    const helpTag = screen.getByText("help wanted");
    expect(helpTag).toHaveStyle("--tag-color: #0075ca");
  });

  it("does not render tags section when labels are empty", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { ...MOCK_POSTS[1] }, // no labels
        ]),
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("Second Post")).toBeInTheDocument();
    });
    expect(screen.queryByClassName?.("tags")).toBeUndefined;
  });

  // ── 6-7: 記事リンク ──

  it("calls navigate when post title is clicked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POSTS),
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("First Post"));
    expect(navigate).toHaveBeenCalledWith("/posts/1");
  });

  it("post link has correct href attribute", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_POSTS),
    });

    render(<ListPage navigate={navigate} />);
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });

    const link = screen.getByText("First Post");
    expect(link.closest("a")).toHaveAttribute("href", "/posts/1");
  });
});
