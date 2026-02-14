import { useState, useEffect } from "react";
import type { GitHubIssue } from "../types";

interface Props {
  navigate: (path: string) => void;
}

export function ListPage({ navigate }: Props) {
  const [posts, setPosts] = useState<GitHubIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setPosts)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">エラーが発生しました: {error}</p>;
  if (!posts) return <p className="loading">読み込み中...</p>;
  if (posts.length === 0)
    return <p className="empty">記事がまだありません。</p>;

  return (
    <div className="post-list">
      {posts.map((post) => (
        <article key={post.number} className="post-summary">
          <h2>
            <a
              href={`/posts/${post.number}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/posts/${post.number}`);
              }}
            >
              {post.title}
            </a>
          </h2>
          <div className="post-meta">
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString("ja-JP")}
            </time>
            {post.labels.length > 0 && (
              <div className="tags">
                {post.labels.map((l) => (
                  <span
                    key={l.name}
                    className="tag"
                    style={
                      { "--tag-color": `#${l.color}` } as React.CSSProperties
                    }
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
