import { useState, useEffect, useCallback } from "react";
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
      <header>
        <nav>
          <a
            href="/"
            className="site-title"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            issue-press
          </a>
        </nav>
      </header>
      <main>
        {route.type === "post" && route.id ? (
          <PostPage id={route.id} navigate={navigate} />
        ) : (
          <ListPage navigate={navigate} />
        )}
      </main>
      <footer>
        <p>
          Powered by <a href="https://github.com">GitHub Issues</a>
          {" & "}
          <a href="https://deno.com/deploy">Deno Deploy</a>
        </p>
      </footer>
    </div>
  );
}
