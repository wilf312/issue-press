import { useState, useEffect, useCallback } from "react";
import { Link, Separator, Body, Caption } from "@kaze/ui";
import { ListPage } from "./pages/ListPage";
import { PostPage } from "./pages/PostPage";

interface Route {
  type: "list" | "post";
  id?: number;
}

function parseRoute(pathname?: string): Route {
  const p = pathname || location.pathname;
  const match = p.match(/^\/posts\/(\d+)$/);
  if (match) return { type: "post", id: Number(match[1]) };
  return { type: "list" };
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  const navigate = useCallback((path: string) => {
    history.pushState(null, "", path);
    setRoute(parseRoute(path));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <nav className="header-nav">
          <Link
            variant="secondary"
            size="lg"
            underline="none"
            href="/"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            <strong>issue-press</strong>
          </Link>
        </nav>
      </header>
      <Separator />
      <main className="main-content">
        {route.type === "post" && route.id ? (
          <PostPage id={route.id} navigate={navigate} />
        ) : (
          <ListPage navigate={navigate} />
        )}
      </main>
      <Separator />
      <footer className="footer">
        <Caption>
          Powered by{" "}
          <Link variant="primary" size="sm" href="https://github.com" external>
            GitHub Issues
          </Link>
          {" & "}
          <Link variant="primary" size="sm" href="https://deno.com/deploy" external>
            Deno Deploy
          </Link>
        </Caption>
      </footer>
    </div>
  );
}
