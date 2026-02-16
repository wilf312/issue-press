export interface GitHubLabel {
  name: string;
  color: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  labels: GitHubLabel[];
  user: GitHubUser;
}

export interface PostData extends GitHubIssue {
  bodyHtml: string;
}
