import type { Category, Reaction, ReportReason } from "./constants";

// is_admin is the existing UI flag, now strictly a ROOM moderator, not global.
export type Member = { room_id: string; name: string; alias: string; is_admin: boolean; member_count: number };
export type RoomKey = { label: string; expires_at: string; uses: number; revoked: boolean };
export type Poll = {
  id: string;
  my_option_id: string | null;
  has_votes: boolean;
  total_votes: number | null;
  options: { id: string; label: string; position: number; votes: number | null }[];
};
export type Post = {
  id: string; room_id: string; author_alias: string; content: string; category: Category;
  created_at: string; updated_at: string; is_owner: boolean;
  comment_count: number; my_reaction: Reaction | null; has_reported: boolean;
  reactions: Record<Reaction, number>; poll: Poll | null;
};
export type Comment = {
  id: string; post_id: string; author_alias: string; content: string;
  created_at: string; updated_at: string; is_owner: boolean;
};
export type Report = { id: string; post_id: string; reason: ReportReason; created_at: string; post: Post };
export type Page<T> = { items: T[]; has_more: boolean };
export type ActionResult = { error?: string; success?: string; id?: string };