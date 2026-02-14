import { useState, useEffect } from "react";
import { Button } from "@kaze/ui";
import type { PostData } from "../types";

interface Props {
  id: number;
  navigate: (path: string) => void;
}

export function PostPage({ id, navigate }: Props) {
  const [post, setPost] = useState<PostData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPost(null);
    setError(null);
    fetch(`/api/posts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: PostData) => {
        setPost(data);
        document.title = `${data.title} | issue-press`;
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">エラーが発生しました: {error}</p>;
  if (!post) return <p className="loading">読み込み中...</p>;

  return (
    <article className="post">
      <Button variant="secondary" onClick={() => navigate("/")}>
        ← 記事一覧に戻る
      </Button>
      <h1>{post.title}</h1>
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
      <div
        className="post-body markdown-body"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  );
}
