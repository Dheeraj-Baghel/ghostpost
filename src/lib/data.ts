import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Comment, Page, Post, Report } from "./types";
import type { Category } from "./constants";

export async function getFeed(db: SupabaseClient<Database>, roomId: string, sort: string, category: Category | null, page: number) {
  const { data, error } = await db.rpc("room_feed", { p_room_id: roomId, p_sort: sort, p_category: category, p_page: page });
  if (error) throw new Error("Could not load the feed.");
  return data as Page<Post>;
}
export async function getPost(db: SupabaseClient<Database>, roomId: string, id: string) {
  const { data, error } = await db.rpc("room_post", { p_room_id: roomId, p_id: id });
  if (error) throw new Error("Could not load the post.");
  return data as Post | null;
}
export async function getComments(db: SupabaseClient<Database>, roomId: string, id: string, page: number) {
  const { data, error } = await db.rpc("room_comments", { p_room_id: roomId, p_post_id: id, p_page: page });
  if (error) throw new Error("Could not load the comments.");
  return data as Page<Comment>;
}
export async function getReports(db: SupabaseClient<Database>, roomId: string, page: number) {
  const { data, error } = await db.rpc("room_reports", { p_room_id: roomId, p_page: page });
  if (error) throw new Error("Could not load moderation reports.");
  return data as Page<Report>;
}
export function parsePage(value?: string): number {
  const n = Number(value || "0");
  return Number.isInteger(n) && n >= 0 && n <= 10000 ? n : 0;
}