import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "./App";

vi.mock("@kaze/ui", () => ({
  Link: ({ children, href, onClick, external, variant, size, underline, ...props }: any) => (
    <a href={href} onClick={onClick} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...props}>
      {children}
    </a>
  ),
  Separator: () => <hr />,
  Caption: ({ children }: any) => <span>{children}</span>,
  Body: ({ children }: any) => <p>{children}</p>,
}));

// ルーティングテストのため子コンポーネントをモック
vi.mock("./pages/ListPage", () => ({
  ListPage: ({ navigate }: { navigate: (path: string) => void }) => (
    <div data-testid="list-page">
      <button onClick={() => navigate("/posts/42")}>Go to post</button>
    </div>
  ),
}));

vi.mock("./pages/PostPage", () => ({
  PostPage: ({
    id,
    navigate,
  }: {
    id: number;
    navigate: (path: string) => void;
  }) => (
    <div data-testid="post-page">
      Post {id}
      <button onClick={() => navigate("/")}>Back</button>
    </div>
  ),
}));

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  // ── 5-1: 初期ルート ──

  it("renders ListPage at '/'", () => {
    render(<App />);
    expect(screen.getByTestId("list-page")).toBeInTheDocument();
  });

  // ── 5-2: 記事ルート ──

  it("renders PostPage at '/posts/42'", () => {
    window.history.pushState({}, "", "/posts/42");
    render(<App />);
    expect(screen.getByTestId("post-page")).toBeInTheDocument();
    expect(screen.getByText("Post 42")).toBeInTheDocument();
  });

  // ── 5-3: クライアント遷移 ──

  it("navigates to post page via client-side routing", () => {
    render(<App />);
    expect(screen.getByTestId("list-page")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Go to post"));

    expect(screen.getByTestId("post-page")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/posts/42");
  });

  it("navigates back to list page", () => {
    window.history.pushState({}, "", "/posts/1");
    render(<App />);
    expect(screen.getByTestId("post-page")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Back"));

    expect(screen.getByTestId("list-page")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });

  // ── 5-4: ブラウザバック ──

  it("handles popstate (browser back/forward)", () => {
    render(<App />);
    expect(screen.getByTestId("list-page")).toBeInTheDocument();

    // Navigate to post
    fireEvent.click(screen.getByText("Go to post"));
    expect(screen.getByTestId("post-page")).toBeInTheDocument();

    // Simulate browser back
    window.history.back();
    fireEvent(window, new PopStateEvent("popstate"));
    // After popstate, should re-parse route from location
  });

  // ── 5-5: ヘッダー / フッター ──

  it("renders header with site title link", () => {
    render(<App />);
    const link = screen.getByText("issue-press");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders footer with credits", () => {
    render(<App />);
    expect(screen.getByText("GitHub Issues")).toBeInTheDocument();
    expect(screen.getByText("Deno Deploy")).toBeInTheDocument();
  });

  it("header link navigates to home", () => {
    window.history.pushState({}, "", "/posts/1");
    render(<App />);
    expect(screen.getByTestId("post-page")).toBeInTheDocument();

    fireEvent.click(screen.getByText("issue-press"));

    expect(screen.getByTestId("list-page")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });
});
