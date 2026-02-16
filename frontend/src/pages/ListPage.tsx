import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  H2,
  Caption,
  Badge,
  Spinner,
  Alert,
  EmptyState,
  Link,
} from "@kaze/ui";
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

  if (error)
    return (
      <Alert variant="error" title="エラーが発生しました">
        {error}
      </Alert>
    );
  if (!posts)
    return (
      <div className="center-content">
        <Spinner size="lg" label="読み込み中..." />
      </div>
    );
  if (posts.length === 0)
    return <EmptyState title="記事がまだありません。" description="最初の記事を書いてみましょう。" />;

  return (
    <div className="post-list">
      {posts.map((post) => (
        <Card key={post.number} variant="outlined" isClickable onClick={() => navigate(`/posts/${post.number}`)}>
          <CardContent>
            <H2>
              <Link
                variant="secondary"
                underline="none"
                href={`/posts/${post.number}`}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  navigate(`/posts/${post.number}`);
                }}
              >
                {post.title}
              </Link>
            </H2>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
