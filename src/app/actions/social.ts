"use server";

import { revalidatePath } from "next/cache";
import { requireMember, requireAdmin } from "@/lib/auth";
import { postSchema, contentSchema, categorySchema, commentSchema, idSchema, reactionSchema, reportSchema, firstError } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types";

// Explicit room IDs prevent a switch in another tab from redirecting a write.
// Both this layer and SQL validate membership and target-object room ownership.
function refresh(roomId: string) { revalidatePath(`/rooms/${roomId}`, "layout"); }
export async function createPost(roomId: string, input: unknown): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed) };
  const { data, error } = await supabase.rpc("room_create_post", { p_room_id: roomId, p_content: parsed.data.content, p_category: parsed.data.category, p_options: parsed.data.options ?? null });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Your thought is out there.", id: data };
}
export async function editPost(roomId: string, id: string, content: string, category: string): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) return { error: firstError(parsed) };
  if (!idSchema.safeParse(id).success || !categorySchema.safeParse(category).success) return { error: "Check the post and category." };
  const { error } = await supabase.rpc("room_edit_post", { p_room_id: roomId, p_id: id, p_content: parsed.data, p_category: category });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Post updated." };
}
export async function deletePost(roomId: string, id: string): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  if (!idSchema.safeParse(id).success) return { error: "This post could not be found." };
  const { error } = await supabase.rpc("room_delete_post", { p_room_id: roomId, p_id: id });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Post deleted." };
}
export async function reactToPost(roomId: string, id: string, kind: unknown): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  const parsed = reactionSchema.safeParse(kind);
  if (!idSchema.safeParse(id).success || !parsed.success) return { error: "Choose a valid reaction." };
  const { error } = await supabase.rpc("room_set_reaction", { p_room_id: roomId, p_post_id: id, p_kind: parsed.data });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Reaction updated." };
}
export async function votePoll(roomId: string, postId: string, pollId: string, optionId: string): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  if (![postId, pollId, optionId].every(id => idSchema.safeParse(id).success)) return { error: "Choose a valid poll option." };
  const { error } = await supabase.rpc("room_vote_poll", { p_room_id: roomId, p_poll_id: pollId, p_option_id: optionId });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Vote counted. Your room has spoken (a little)." };
}
export async function addComment(roomId: string, postId: string, content: string): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  const parsed = commentSchema.safeParse(content);
  if (!parsed.success) return { error: firstError(parsed) };
  if (!idSchema.safeParse(postId).success) return { error: "This post could not be found." };
  const { data, error } = await supabase.rpc("room_add_comment", { p_room_id: roomId, p_post_id: postId, p_content: parsed.data });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Reply posted.", id: data };
}
export async function editComment(roomId: string, id: string, postId: string, content: string): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  const parsed = commentSchema.safeParse(content);
  if (!parsed.success) return { error: firstError(parsed) };
  if (![id, postId].every(value => idSchema.safeParse(value).success)) return { error: "This comment could not be found." };
  const { error } = await supabase.rpc("room_edit_comment", { p_room_id: roomId, p_id: id, p_content: parsed.data });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Comment updated." };
}
export async function deleteComment(roomId: string, id: string, postId: string): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  if (![id, postId].every(value => idSchema.safeParse(value).success)) return { error: "This comment could not be found." };
  const { error } = await supabase.rpc("room_delete_comment", { p_room_id: roomId, p_id: id });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Comment deleted." };
}
export async function reportPost(roomId: string, id: string, reason: unknown): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  const parsed = reportSchema.safeParse(reason);
  if (!parsed.success || !idSchema.safeParse(id).success) return { error: "Choose a report reason." };
  const { error } = await supabase.rpc("room_report_post", { p_room_id: roomId, p_post_id: id, p_reason: parsed.data });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: "Report sent privately to your room moderator." };
}
export async function moderateReport(roomId: string, id: string, action: "remove" | "dismiss"): Promise<ActionResult> {
  const { supabase } = await requireAdmin(roomId);
  if (!idSchema.safeParse(id).success || !["remove", "dismiss"].includes(action)) return { error: "Invalid moderation request." };
  const { error } = await supabase.rpc("room_moderate_report", { p_room_id: roomId, p_report_id: id, p_action: action });
  if (error) return { error: friendlyError(error) };
  refresh(roomId); return { success: action === "remove" ? "Post removed, along with its comments and interactions." : "Report dismissed." };
}
