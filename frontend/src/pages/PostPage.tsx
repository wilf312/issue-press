import { useState, useEffect } from "react";
import {
  Button,
  H1,
  Caption,
  Badge,
  Spinner,
  Alert,
  Separator,
  Breadcrumb,
} from "@kaze/ui";
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

  if (error)
    return (
      <Alert variant="error" title="エラーが発生しました">
        {error}
      </Alert>
    );
  if (!post)
    return (
      <div className="center-content">
        <Spinner size="lg" label="読み込み中..." />
      </div>
    );

  return (
    <article className="post">
      <Breadcrumb
        items={[
          {
            label: "記事一覧",
            href: "/",
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              navigate("/");
            },
          },
          { label: post.title },
        ]}
      />
      <H1>{post.title}</H1>
      <div className="post-meta">
        <Caption>
          <time dateTime={post.created_at}>
            {new Date(post.created_at).toLocaleDateString("ja-JP")}
          </time>
        </Caption>
        {post.labels.length > 0 && (
          <div className="tags">
            {post.labels.map((l) => (
              <Badge key={l.name} variant="secondary" size="sm">
                <span
                  className="tag-dot"
                  style={{ backgroundColor: `#${l.color}` }}
                />
                {l.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Separator />
      <div
        className="post-body markdown-body"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  );
}
