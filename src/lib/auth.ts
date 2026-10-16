import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { supabaseConfig } from "./supabase/config";
import type { Member } from "./types";
import { idSchema } from "./validation";

export async function getContext() {
  if (!supabaseConfig()) return null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, member: null, rooms: [] as Member[] };
  const membership = await supabase.rpc("my_rooms", {});
  if (membership.error) throw new Error("Rooms could not be loaded. The private-rooms migration must be applied before running this version.");
  const rooms = membership.data as Member[];
  return { supabase, user, member: rooms[0] ?? null, rooms };
}

export async function requireUser() {
  const context = await getContext();
  if (!context) redirect("/setup");
  if (!context.user) redirect("/login");
  return { ...context, user: context.user };
}

export async function requireMember(roomId: string) {
  const context = await requireUser();
  const member = idSchema.safeParse(roomId).success ? context.rooms.find(room => room.room_id === roomId) : null;
  if (!member) redirect("/rooms?notice=room-unavailable");
  return { ...context, member };
}

export async function requireAdmin(roomId: string) {
  const context = await requireMember(roomId);
  if (!context.member.is_admin) redirect(`/rooms/${roomId}/feed?notice=admin-only`);
  return context;
}