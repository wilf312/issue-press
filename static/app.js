import { createElement, useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import htm from "htm";
import { Button } from "@kaze/ui";

const html = htm.bind(createElement);

// ── Routing ──

function parseRoute(pathname) {
  const p = pathname || location.pathname;
  const match = p.match(/^\/posts\/(\d+)$/);
  if (match) return { type: "post", id: Number(match[1]) };
  return { type: "list" };
}

// ── App ──

function App() {
  const [route, setRoute] = useState(() => parseRoute());

  const navigate = useCallback((path) => {
    history.pushState(null, "", path);
    setRoute(parseRoute(path));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return html`
    <div class="app">
      <header>
        <nav>
          <a
            href="/"
            class="site-title"
            onClick=${(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            issue-press
          </a>
        </nav>
      </header>
      <main>
        ${
          route.type === "post"
            ? html`<${PostPage} id=${route.id} navigate=${navigate} />`
            : html`<${ListPage} navigate=${navigate} />`
        }
      </main>
      <footer>
        <p>
          Powered by${" "}
          <a href="https://github.com">GitHub Issues</a>${" & "}
          <a href="https://deno.com/deploy">Deno Deploy</a>
        </p>
      </footer>
    </div>
  `;
}

// ── List Page ──

function ListPage({ navigate }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setPosts)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return html`<p class="error">エラーが発生しました: ${error}</p>`;
  }
  if (!posts) {
    return html`<p class="loading">読み込み中...</p>`;
  }
  if (posts.length === 0) {
    return html`<p class="empty">記事がまだありません。</p>`;
  }

  return html`
    <div class="post-list">
      ${posts.map(
        (post) => html`
          <article key=${post.number} class="post-summary">
            <h2>
              <a
                href=${`/posts/${post.number}`}
                onClick=${(e) => {
                  e.preventDefault();
                  navigate(`/posts/${post.number}`);
                }}
              >
                ${post.title}
              </a>
            </h2>
            <div class="post-meta">
              <time datetime=${post.created_at}>
                ${new Date(post.created_at).toLocaleDateString("ja-JP")}
              </time>
              ${
                post.labels.length > 0 &&
                html`
                  <div class="tags">
                    ${post.labels.map(
                      (l) => html`
                        <span
                          key=${l.name}
                          class="tag"
                          style=${{ "--tag-color": `#${l.color}` }}
                        >
                          ${l.name}
                        </span>
                      `,
                    )}
                  </div>
                `
              }
            </div>
          </article>
        `,
      )}
    </div>
  `;
}

// ── Post Page ──

function PostPage({ id, navigate }) {
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPost(null);
    setError(null);
    fetch(`/api/posts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPost(data);
        document.title = `${data.title} | issue-press`;
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return html`<p class="error">エラーが発生しました: ${error}</p>`;
  }
  if (!post) {
    return html`<p class="loading">読み込み中...</p>`;
  }

  return html`
    <article class="post">
      <${Button}
        variant="secondary"
        onClick=${() => navigate("/")}
      >
        ← 記事一覧に戻る
      <//>
      <h1>${post.title}</h1>
      <div class="post-meta">
        <time datetime=${post.created_at}>
          ${new Date(post.created_at).toLocaleDateString("ja-JP")}
        </time>
        ${
          post.labels.length > 0 &&
          html`
            <div class="tags">
              ${post.labels.map(
                (l) => html`
                  <span
                    key=${l.name}
                    class="tag"
                    style=${{ "--tag-color": `#${l.color}` }}
                  >
                    ${l.name}
                  </span>
                `,
              )}
            </div>
          `
        }
      </div>
      <div
        class="post-body markdown-body"
        dangerouslySetInnerHTML=${{ __html: post.bodyHtml }}
      />
    </article>
  `;
}

// ── Mount ──

const root = createRoot(document.getElementById("root"));
root.render(html`<${App} />`);
