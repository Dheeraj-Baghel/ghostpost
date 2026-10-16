"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, requireMember, requireAdmin } from "@/lib/auth";
import { inviteSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types";

export async function createRoom(name: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const parsed = z.string().trim().min(1).max(60).safeParse(name);
  if (!parsed.success) return { error: "Choose a room name between 1 and 60 characters." };
  const { data, error } = await supabase.rpc("room_create", { p_name: parsed.data });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/rooms", "layout"); return { id: data, success: "Room created. You are its moderator." };
}
export async function joinRoom(code: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const parsed = inviteSchema.safeParse(code);
  if (!parsed.success) return { error: "Paste the complete room key from its moderator." };
  const { data, error } = await supabase.rpc("room_join", { p_code: parsed.data });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/rooms", "layout"); return { id: data, success: "Welcome to your room." };
}
export async function leaveRoom(roomId: string): Promise<ActionResult> {
  const { supabase } = await requireMember(roomId);
  const { error } = await supabase.rpc("room_leave", { p_room_id: roomId });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/rooms", "layout"); return { success: "You left the room." };
}
export async function manageRoomKey(roomId: string, action: string, label: string, days: number): Promise<ActionResult & { code?: string }> {
  const { supabase } = await requireAdmin(roomId);
  if (!["generate", "rotate", "update", "renew", "revoke"].includes(action) || !Number.isInteger(days) || days < 1 || days > 90 || !label.trim() || label.trim().length > 100) return { error: "Check the room key settings." };
  const { data, error } = await supabase.rpc("room_key_manage", { p_room_id: roomId, p_action: action, p_label: label.trim(), p_days: days });
  if (error) return { error: friendlyError(error) };
  revalidatePath(`/rooms/${roomId}/admin`);
  const code = (data as { code?: string | null })?.code;
  return { ...(code ? { code } : {}), success: action === "revoke" ? "Key deleted. New joins are disabled; existing members stay." : code ? "New key generated. Copy it now; it is shown only once." : "Key settings saved. Existing members stay." };
}
