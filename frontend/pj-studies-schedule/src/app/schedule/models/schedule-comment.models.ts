export type CommentAuthorRole = 'planner' | 'lecturer' | 'admin';

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  role: CommentAuthorRole;
}

export interface ScheduleComment {
  id: string;
  entryId: string;
  body: string;
  author: CommentAuthor;
  createdAt: string;
  updatedAt?: string;
  recipients: { userId: string; displayName: string; email?: string | null }[];
}
